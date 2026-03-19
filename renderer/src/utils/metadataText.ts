const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const HTML_ENTITY_PATTERN = /&(?:[a-z]+|#\d+|#x[\da-f]+);/i;

export const normalizeMetadataDescription = (value?: string): string => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const mayContainHtml = HTML_TAG_PATTERN.test(trimmed) || HTML_ENTITY_PATTERN.test(trimmed);
  if (!mayContainHtml) {
    return trimmed;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const text = doc.body.innerText || doc.body.textContent || '';
    return text
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return trimmed.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};