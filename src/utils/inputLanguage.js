export function getCharacterLanguage(character = '') {
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(character)) return 'ko';
  if (/[A-Za-z]/.test(character)) return 'en';
  return '';
}

export function getExpectedInputLanguage(word = '', inputLength = 0) {
  for (let index = inputLength; index < word.length; index += 1) {
    const language = getCharacterLanguage(word[index]);
    if (language) return language;
  }

  return getCharacterLanguage(word[0]);
}

export function findLanguageMismatch(value = '', word = '') {
  const compareLength = Math.min(value.length, word.length);

  for (let index = 0; index < compareLength; index += 1) {
    const typedLanguage = getCharacterLanguage(value[index]);
    const expectedLanguage = getCharacterLanguage(word[index]);

    if (typedLanguage && expectedLanguage && typedLanguage !== expectedLanguage) {
      return {
        index,
        typedLanguage,
        expectedLanguage,
      };
    }
  }

  return null;
}
