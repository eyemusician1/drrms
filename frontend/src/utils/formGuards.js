export const sanitizeTextInput = (value, maxLength = 200, maxWords = 0) => {
  const normalized = String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const wordLimited = maxWords > 0
    ? normalized.split(' ').filter(Boolean).slice(0, maxWords).join(' ')
    : normalized;

  return wordLimited.slice(0, maxLength);
};

export const digitsOnly = (value, maxDigits = 6) => (
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxDigits)
);

export const trimToWords = (value, maxWords = 20) => {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
};
