import { randomInt } from 'node:crypto';
import { SHOP_SEASON, GACHA_SETTING_ID, normalizeGachaConfig, selectGachaPrize, getGachaOutcome } from '../src/utils/gacha.js';

export function createShopSeason2Actions({ database, publicCollection, PATHS, requireTeacher, requireSession, requireString, safeProfile, ApiError, FieldValue, Timestamp, drawTicket = () => randomInt(10000) }) {
  const settingsRef = () => publicCollection(PATHS.settings).doc(GACHA_SETTING_ID);
  const millis = (value) => value?.toMillis?.() || 0;
  const pack = (doc) => ({ id: doc.id, ...doc.data(), createdAt: millis(doc.data().createdAt), fulfilledAt: millis(doc.data().fulfilledAt) });
  const bad = (message) => new ApiError(409, 'api/failed-precondition', message);

  async function getGachaShop(uid, body) {
    if (body.teacher === true) requireTeacher(uid);
    else await requireSession(uid, requireString(body.studentId, 'studentId'));
    const snapshot = await settingsRef().get();
    return { config: snapshot.exists ? snapshot.data() : { enabled: false, price: 100, revision: 0, prizes: [] } };
  }

  async function saveGachaShop(uid, body) {
    requireTeacher(uid);
    let config;
    try { config = normalizeGachaConfig(body.config); } catch (e) { throw new ApiError(400, 'api/invalid-argument', e.message); }
    await database().runTransaction(async (tx) => {
      const ref = settingsRef();
      const snapshot = await tx.get(ref);
      const previous = snapshot.exists ? snapshot.data() : {};
      if (Number(previous.revision || 0) !== Number(body.revision || 0) || Number(previous.stockRevision || 0) !== Number(body.stockRevision || 0)) throw bad('다른 저장 또는 구매로 재고가 변경되었습니다. 다시 불러온 후 수정해주세요.');
      config = { ...config, season: SHOP_SEASON, revision: Number(previous.revision || 0) + 1, stockRevision: Number(previous.stockRevision || 0), updatedAt: FieldValue.serverTimestamp() };
      tx.set(ref, config);
    });
    return { config: { ...config, updatedAt: null } };
  }

  async function drawGacha(uid, body) {
    const studentId = requireString(body.studentId, 'studentId');
    const requestId = String(body.requestId || '');
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) throw new ApiError(400, 'api/invalid-argument', '뽑기 요청 번호가 올바르지 않습니다.');
    await requireSession(uid, studentId);
    const studentRef = publicCollection(PATHS.classStudents).doc(studentId);
    const receiptRef = publicCollection(PATHS.shopPurchases).doc(`${studentId}_gacha_${requestId}`);
    const ticket = drawTicket();
    return database().runTransaction(async (tx) => {
      const [receipt, studentDoc] = await Promise.all([tx.get(receiptRef), tx.get(studentRef)]);
      if (!studentDoc.exists) throw bad('학생 정보를 찾을 수 없습니다.');
      const student = studentDoc.data();
      if (student.active === false) throw bad('비활성 학생은 상점을 이용할 수 없습니다.');
      if (receipt.exists) return { purchase: pack(receipt), profile: safeProfile(studentId, student), replayed: true };
      const ref = settingsRef();
      const configDoc = await tx.get(ref);
      const raw = configDoc.exists ? configDoc.data() : {};
      if (!raw.enabled) throw bad('가챠샵이 운영 중이 아닙니다.');
      if (Number(raw.revision) !== Number(body.revision)) throw bad('상품 또는 가격이 변경되었습니다. 다시 불러온 후 뽑아주세요.');
      let config;
      try { config = normalizeGachaConfig(raw); } catch { throw bad('추첨 설정을 확인해주세요.'); }
      const points = Number(student.totalPoints || 0);
      if (!Number.isSafeInteger(points) || points < config.price) throw bad('포인트가 부족합니다.');
      const prize = selectGachaPrize(config.prizes, ticket, config.defaultPrizeId);
      const outcome = getGachaOutcome(prize);
      const nextPrizes = config.prizes.map(p => p.id === prize.id && !prize.isDefault && p.stock > 0 ? { ...p, stock: p.stock - 1 } : p);
      const record = {
        season: SHOP_SEASON, itemType: 'gacha', itemId: prize.id, itemName: prize.name,
        studentId, studentName: student.name || '', classId: student.classId || '', className: student.className || '',
        pointsSpent: config.price, quantity: outcome === 'won' ? 1 : 0, outcome,
        deliveryStatus: outcome === 'won' ? 'pending' : 'not_required', status: 'completed',
        probability: prize.weight / 100, configRevision: raw.revision, userId: uid,
        createdAt: FieldValue.serverTimestamp(),
      };
      tx.update(studentRef, { totalPoints: points - config.price, updatedAt: FieldValue.serverTimestamp() });
      if (!prize.isDefault && prize.stock > 0) tx.update(ref, { prizes: nextPrizes, stockRevision: Number(raw.stockRevision || 0) + 1 });
      tx.set(receiptRef, record);
      return { purchase: { id: receiptRef.id, ...record, createdAt: Date.now() }, profile: safeProfile(studentId, { ...student, totalPoints: points - config.price }), ...(!prize.isDefault ? { remainingStock: Math.max(0, prize.stock - 1) } : {}) };
    });
  }

  async function listShopHistory(uid, body) {
    const teacher = body.teacher === true;
    if (teacher) requireTeacher(uid);
    else await requireSession(uid, requireString(body.studentId, 'studentId'));
    let q = publicCollection(PATHS.shopPurchases);
    if (!teacher) q = q.where('studentId', '==', body.studentId);
    else if (body.classId) q = q.where('classId', '==', requireString(body.classId, 'classId'));
    if (body.pendingOnly === true && teacher) q = q.where('deliveryStatus', '==', 'pending');
    q = q.orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
    if (body.cursor) {
      const { seconds, nanoseconds } = body.cursor;
      if (!Number.isSafeInteger(seconds) || seconds <= 0 || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999) throw bad('조회 위치가 올바르지 않습니다.');
      q = q.startAfter(new Timestamp(seconds, nanoseconds), requireString(body.cursor.id, 'cursor', 250));
    }
    const snapshot = await q.limit(21).get();
    const items = snapshot.docs.slice(0, 20).map(pack);
    const last = snapshot.docs[19];
    return { items, cursor: snapshot.docs.length > 20 ? { id: last.id, seconds: last.data().createdAt.seconds, nanoseconds: last.data().createdAt.nanoseconds } : null };
  }

  async function fulfillShopPurchase(uid, body) {
    requireTeacher(uid);
    const ref = publicCollection(PATHS.shopPurchases).doc(requireString(body.purchaseId, 'purchaseId', 250));
    await database().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw bad('구매 기록이 없습니다.');
      const record = snapshot.data();
      if (record.deliveryStatus === 'delivered') return;
      if (record.deliveryStatus !== 'pending') throw bad('지급 대상이 아닙니다.');
      tx.update(ref, { deliveryStatus: 'delivered', fulfilledAt: FieldValue.serverTimestamp(), fulfilledBy: uid });
    });
    return { delivered: true };
  }
  return { getGachaShop, saveGachaShop, drawGacha, listShopHistory, fulfillShopPurchase };
}
