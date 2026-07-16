import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-pw-typing-security';
const APP_ID = 'xx-school-typing-app';
const TEACHER_UID = 'hnjJNGDuydcd4SfQ2Xq5cE6IujD3';
const STUDENT_UID = 'student-anonymous-uid';
const OTHER_UID = 'other-anonymous-uid';

let testEnv;

function publicCollection(db, name) {
  return collection(db, 'artifacts', APP_ID, 'public', 'data', name);
}

function publicDoc(db, name, id) {
  return doc(db, 'artifacts', APP_ID, 'public', 'data', name, id);
}

async function seed(name, id, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(publicDoc(context.firestore(), name, id), data);
  });
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe('public content', () => {
  test('unauthenticated users cannot read announcements', async () => {
    await seed('typing_announcements', 'notice-1', { title: 'Notice' });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(publicDoc(db, 'typing_announcements', 'notice-1')));
  });

  test('signed-in students can read but cannot write announcements', async () => {
    await seed('typing_announcements', 'notice-1', { title: 'Notice' });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_announcements', 'notice-1')));
    await assertFails(addDoc(publicCollection(db, 'typing_announcements'), { title: 'Injected' }));
  });

  test('teacher can manage announcements and rooms', async () => {
    const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
    await assertSucceeds(setDoc(publicDoc(db, 'typing_announcements', 'notice-1'), { title: 'Notice' }));
    await assertSucceeds(setDoc(publicDoc(db, 'typing_rooms', 'room-1'), { status: 'waiting' }));
    await assertSucceeds(updateDoc(publicDoc(db, 'typing_rooms', 'room-1'), { status: 'playing' }));
  });
});

describe('private student roster', () => {
  test('signed-in students can read class directory but cannot change it', async () => {
    await seed('typing_classes', 'class-1', { name: '1학년 1반', active: true });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_classes', 'class-1')));
    await assertFails(updateDoc(publicDoc(db, 'typing_classes', 'class-1'), { name: '변조된 학급' }));
  });

  test('student cannot read or change class student documents', async () => {
    await seed('typing_class_students', 'student-1', {
      classId: 'class-1',
      name: 'Student',
      studentPin: '1234',
      totalPoints: 20,
    });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(getDoc(publicDoc(db, 'typing_class_students', 'student-1')));
    await assertFails(updateDoc(publicDoc(db, 'typing_class_students', 'student-1'), { totalPoints: 9999 }));
  });

  test('teacher can read and manage class student documents', async () => {
    const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
    await assertSucceeds(setDoc(publicDoc(db, 'typing_class_students', 'student-1'), {
      classId: 'class-1',
      name: 'Student',
      studentPin: '1234',
    }));
    await assertSucceeds(getDoc(publicDoc(db, 'typing_class_students', 'student-1')));
  });

  test('student can read public roster without private PIN fields', async () => {
    await seed('typing_class_roster', 'student-1', {
      classId: 'class-1',
      name: 'Student',
      active: true,
      hasPin: true,
    });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    const snapshot = await assertSucceeds(getDoc(publicDoc(db, 'typing_class_roster', 'student-1')));
    assert.equal(snapshot.data().hasPin, true);
    assert.equal(snapshot.data().studentPin, undefined);
  });
});

describe('score ownership', () => {
  test('student cannot create scores directly but can update server-created own score fields', async () => {
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    const scoreRef = publicDoc(db, 'typing_scores', 'score-1');
    await assertFails(setDoc(scoreRef, {
      roomId: 'room-1',
      nickname: 'Student',
      userId: STUDENT_UID,
      score: 0,
      cpm: 0,
      correctChars: 0,
      quizCorrectCount: 0,
    }));
    await seed('typing_scores', 'score-1', {
      roomId: 'room-1',
      nickname: 'Student',
      userId: STUDENT_UID,
      score: 0,
      cpm: 0,
      correctChars: 0,
      quizCorrectCount: 0,
    });
    await assertSucceeds(updateDoc(scoreRef, {
      score: 100,
      cpm: 250,
      correctChars: 15,
      quizCorrectCount: 1,
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(scoreRef, { pointWeight: 2 }));
    await assertFails(updateDoc(scoreRef, { userId: OTHER_UID }));
  });

  test("student cannot read another student's score", async () => {
    await seed('typing_scores', 'score-2', {
      roomId: 'room-1',
      nickname: 'Other',
      userId: OTHER_UID,
      score: 200,
    });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(getDoc(publicDoc(db, 'typing_scores', 'score-2')));
  });

  test('owner-filtered query succeeds and room-wide student query fails', async () => {
    await seed('typing_scores', 'score-1', { roomId: 'room-1', userId: STUDENT_UID, score: 100 });
    await seed('typing_scores', 'score-2', { roomId: 'room-1', userId: OTHER_UID, score: 200 });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    const scores = publicCollection(db, 'typing_scores');
    await assertSucceeds(getDocs(query(scores, where('userId', '==', STUDENT_UID))));
    await assertFails(getDocs(query(scores, where('roomId', '==', 'room-1'))));
  });

  test('teacher can read and tune any score', async () => {
    await seed('typing_scores', 'score-1', { userId: STUDENT_UID, score: 100 });
    const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_scores', 'score-1')));
    await assertSucceeds(updateDoc(publicDoc(db, 'typing_scores', 'score-1'), { pointWeight: 1.5 }));
  });
});

describe('server-owned session and presence', () => {
  test('student can read only their own session and cannot write sessions', async () => {
    await seed('typing_student_sessions', STUDENT_UID, {
      userId: STUDENT_UID,
      studentId: 'student-1',
    });
    await seed('typing_student_sessions', OTHER_UID, {
      userId: OTHER_UID,
      studentId: 'student-2',
    });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_student_sessions', STUDENT_UID)));
    await assertFails(getDoc(publicDoc(db, 'typing_student_sessions', OTHER_UID)));
    await assertFails(setDoc(publicDoc(db, 'typing_student_sessions', STUDENT_UID), { studentId: 'student-2' }));
  });

  test('student can read presence but cannot forge it', async () => {
    await seed('typing_room_presence', 'room-1_student-1', {
      roomId: 'room-1',
      studentId: 'student-1',
    });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_room_presence', 'room-1_student-1')));
    await assertFails(setDoc(publicDoc(db, 'typing_room_presence', 'forged'), {
      roomId: 'room-1',
      studentId: 'student-2',
    }));
  });
});

describe('shop boundary', () => {
  test('students can read items but cannot change stock or create purchases', async () => {
    await seed('typing_shop_items', 'item-1', { classId: 'class-1', stock: 2 });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_shop_items', 'item-1')));
    await assertFails(updateDoc(publicDoc(db, 'typing_shop_items', 'item-1'), { stock: 999 }));
    await assertFails(setDoc(publicDoc(db, 'typing_shop_purchases', 'purchase-1'), {
      studentId: 'student-1',
      itemId: 'item-1',
    }));
  });

  test('teacher can manage items but client purchase writes remain denied', async () => {
    const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
    await assertSucceeds(setDoc(publicDoc(db, 'typing_shop_items', 'item-1'), { classId: 'class-1', stock: 2 }));
    await assertFails(setDoc(publicDoc(db, 'typing_shop_purchases', 'purchase-1'), { itemId: 'item-1' }));
  });
});

describe('practice records', () => {
  test('students cannot read or forge practice completion records', async () => {
    await seed('typing_practice_records', 'student-1_run-1', {
      entryType: 'practice',
      studentId: 'student-1',
      classId: 'class-1',
    });
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(getDoc(publicDoc(db, 'typing_practice_records', 'student-1_run-1')));
    await assertFails(setDoc(publicDoc(db, 'typing_practice_records', 'forged'), {
      entryType: 'practice',
      studentId: 'student-1',
      classId: 'class-1',
    }));
  });

  test('teacher can read practice completion records', async () => {
    await seed('typing_practice_records', 'student-1_run-1', {
      entryType: 'practice',
      studentId: 'student-1',
      classId: 'class-1',
    });
    const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_practice_records', 'student-1_run-1')));
  });
});

describe('duel security boundary', () => {
  test('student can watch their own duel inbox but cannot forge a challenge', async () => {
    const db = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(db, 'typing_duel_challenges', STUDENT_UID)));
    await assertFails(setDoc(publicDoc(db, 'typing_duel_challenges', STUDENT_UID), {
      status: 'pending',
      participantUids: [STUDENT_UID, OTHER_UID],
    }));
  });

  test('only duel participants and teacher can read duel records', async () => {
    await seed('typing_duels', 'duel-1', {
      status: 'playing',
      participantUids: [STUDENT_UID, OTHER_UID],
    });
    const studentDb = testEnv.authenticatedContext(STUDENT_UID).firestore();
    const outsiderDb = testEnv.authenticatedContext('outsider-uid').firestore();
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID).firestore();
    await assertSucceeds(getDoc(publicDoc(studentDb, 'typing_duels', 'duel-1')));
    await assertSucceeds(getDoc(publicDoc(teacherDb, 'typing_duels', 'duel-1')));
    await assertFails(getDoc(publicDoc(outsiderDb, 'typing_duels', 'duel-1')));
    await assertFails(updateDoc(publicDoc(studentDb, 'typing_duels', 'duel-1'), { status: 'completed' }));
  });

  test('student can update only their own allowed duel score fields', async () => {
    const scoreData = {
      duelId: 'duel-1',
      studentId: 'student-1',
      userId: STUDENT_UID,
      participantUids: [STUDENT_UID, OTHER_UID],
      score: 0,
      cpm: 0,
      correctChars: 0,
      quizCorrectCount: 0,
      wordIndex: 0,
      quizIndex: 0,
      wordCountSinceQuiz: 0,
    };
    await seed('typing_duel_scores', 'duel-1_student-1', scoreData);
    const studentDb = testEnv.authenticatedContext(STUDENT_UID).firestore();
    const otherDb = testEnv.authenticatedContext(OTHER_UID).firestore();
    const scoreRef = publicDoc(studentDb, 'typing_duel_scores', 'duel-1_student-1');
    await assertSucceeds(getDoc(scoreRef));
    await assertSucceeds(updateDoc(scoreRef, {
      score: 120,
      cpm: 80,
      correctChars: 12,
      quizCorrectCount: 1,
      wordIndex: 4,
      quizIndex: 1,
      wordCountSinceQuiz: 0,
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(publicDoc(otherDb, 'typing_duel_scores', 'duel-1_student-1'), { score: 9999 }));
    await assertFails(updateDoc(scoreRef, { studentId: 'student-2' }));
    await assertFails(setDoc(publicDoc(studentDb, 'typing_duel_scores', 'forged'), scoreData));
  });
});

test('unknown paths are denied', async () => {
  const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
  await assertFails(setDoc(publicDoc(db, 'unknown_collection', 'doc-1'), { value: true }));
});
