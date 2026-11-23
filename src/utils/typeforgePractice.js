export const typeforgeEquipmentTypes = { keyboard: '키보드', mouse: '마우스', monitor: '모니터', printer: '프린터', speaker: '스피커', gpu: '그래픽카드' };

export function getTypeforgePracticeEffects(gear) {
  if (!gear || !Object.hasOwn(typeforgeEquipmentTypes, gear.type) || !Number.isInteger(gear.level) || gear.level < 0 || gear.level > 20) return null;
  return { typeLabel: typeforgeEquipmentTypes[gear.type], level: gear.level, extraBoosterSeconds: gear.level >= 8 ? 5 : 0, quizShield: gear.level >= 12 };
}
