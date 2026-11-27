export function roomQuizzesEnabled(room) {
  return room?.mode !== 'subway' && room?.mode !== 'elements' && room?.quizEnabled !== false;
}

export function createRoomQuizQueue(room, quizzes) {
  return roomQuizzesEnabled(room) ? [...quizzes].sort(() => Math.random() - 0.5) : [];
}
