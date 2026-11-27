function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function roomQuizzesEnabled(room) {
  return room?.mode !== 'subway' && room?.mode !== 'elements' && room?.quizEnabled !== false;
}

export function createRoomQuizQueue(room, quizzes) {
  return roomQuizzesEnabled(room) ? shuffled(quizzes) : [];
}

export function shuffleQuizOptions(quiz) {
  const order = shuffled(quiz.options.map((_, index) => index));
  return { ...quiz, options: order.map((index) => quiz.options[index]), answer: order.indexOf(quiz.answer) };
}
