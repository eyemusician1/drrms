export const sanitizeTextInput = (value, maxLength = 200, maxWords = 0) => {
  const normalized = String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ');

    //removed trim for spacing not working

  if (maxWords > 0) {
    // fixes the issue where users can't type more words space not yet still working
    const endsWithSpace = normalized.endsWith(' ');
    const words = normalized.split(' ').filter(Boolean);
    const capped = words.slice(0, maxWords).join(' ');
    // preserve the trailing space so the user can keep typing the next word
    const wordLimited = endsWithSpace && words.length < maxWords ? capped + ' ' : capped;
    return wordLimited.slice(0, maxLength);
  }
 
  return normalized.slice(0, maxLength);
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
