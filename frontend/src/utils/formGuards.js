export const sanitizeTextInput = (value, maxLength = 200, maxWords = 0) => {
  const raw = String(value ?? '').replace(/[<>]/g, '');
  const normalized = raw.replace(/\s+/g, ' ');
  const hasTrailingSpace = /\s$/.test(raw);

  const trimmed = normalized.trim();
  const words = trimmed ? trimmed.split(' ') : [];
  const limitedWords = maxWords > 0 ? words.slice(0, maxWords) : words;
  let wordLimited = limitedWords.join(' ');

  if (hasTrailingSpace && (!maxWords || limitedWords.length < maxWords) && wordLimited) {
    wordLimited += ' ';
  }

  return wordLimited.slice(0, maxLength);
};

export const digitsOnly = (value, maxDigits = 6) => (
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxDigits)
);

export const coordinateOnly = (value, maxLength = 12) => {
  const raw = String(value ?? '');
  let cleaned = '';
  let hasDot = false;
  let hasSign = false;
  for (let i = 0; i < raw.length && cleaned.length < maxLength; i += 1) {
    const char = raw[i];
    if (char === '-' && !hasSign && cleaned.length === 0) {
      hasSign = true;
      cleaned += char;
      continue;
    }
    if (char === '.' && !hasDot) {
      hasDot = true;
      cleaned += char;
      continue;
    }
    if (char >= '0' && char <= '9') {
      cleaned += char;
    }
  }
  return cleaned;
};

export const trimToWords = (value, maxWords = 20) => {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
};
