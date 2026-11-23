const equipmentTypes = { keyboard: '키보드', mouse: '마우스', monitor: '모니터' };

export function getTypeforgePracticeEffects(gear) {
  if (!gear || !Object.hasOwn(equipmentTypes, gear.type) || !Number.isInteger(gear.level) || gear.level < 0 || gear.level > 20) return null;
  return { typeLabel: equipmentTypes[gear.type], level: gear.level, extraBoosterSeconds: gear.level >= 8 ? 5 : 0, quizShield: gear.level >= 12 };
}
