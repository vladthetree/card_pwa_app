export function stripHtml(str: string): string {
  if (!str) return ''
  try {
    // Preserve structural whitespace before handing off to the parser.
    const pre = str
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '[img:$1]')
    const doc = new DOMParser().parseFromString(pre, 'text/html')
    return (doc.body.textContent ?? '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch {
    return str.replace(/<[^>]*>/g, '').trim()
  }
}
