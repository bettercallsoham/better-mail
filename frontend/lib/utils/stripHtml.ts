/**
 * Strip HTML tags and return trimmed plain text.
 * Suitable for length checks and plain-text prompts — not for rendering.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
