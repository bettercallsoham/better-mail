/**
 * Email sanitization utilities for AI processing
 */

export class EmailSanitizer {
  /**
   * Strip HTML tags and convert to plain text
   */
  static sanitizeHTML(html: string): string {
    if (!html) return "";

    let text = html;

    // Remove script tags and content
    text = text.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );

    // Remove style tags and content
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, "");

    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, " ");

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Collapse multiple spaces
    text = text.replace(/\s+/g, " ");

    // Collapse multiple newlines
    text = text.replace(/\n\s*\n\s*\n/g, "\n\n");

    return text.trim();
  }

  /**
   * Remove email signatures (common patterns)
   */
  static removeSignature(text: string): string {
    const signaturePatterns = [
      /^--\s*$/m, // Standard signature delimiter
      /^___+\s*$/m, // Underscores
      /^Sent from my (iPhone|iPad|Android)/im,
      /^Get Outlook for (iOS|Android)/im,
      /^Best regards,?\s*$/im,
      /^Thanks,?\s*$/im,
      /^Regards,?\s*$/im,
      /^Cheers,?\s*$/im,
    ];

    for (const pattern of signaturePatterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        // Cut off everything after the signature marker
        text = text.substring(0, match.index).trim();
        break;
      }
    }

    return text;
  }

  /**
   * Remove quoted/forwarded content
   */
  static removeQuotedContent(text: string): string {
    // Remove lines starting with > (quoted text)
    const lines = text.split("\n");
    const filtered = lines.filter((line) => !line.trim().startsWith(">"));

    // Remove "On [date], [person] wrote:" patterns
    const result = filtered
      .join("\n")
      .replace(/On .+? wrote:\s*/gi, "")
      .replace(/From:.+?Sent:.+?To:.+?Subject:.+?(\r?\n|\r)/gis, "");

    return result.trim();
  }

  /**
   * Estimate token count (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters or 0.75 words
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  /**
   * Truncate long email intelligently (keep start and end)
   */
  static truncateEmail(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    const keepStart = Math.floor(maxChars * 0.6);
    const keepEnd = Math.floor(maxChars * 0.3);

    const start = text.substring(0, keepStart);
    const end = text.substring(text.length - keepEnd);

    return `${start}\n\n[... content truncated ...]\n\n${end}`;
  }

  /**
   * Full sanitization pipeline
   */
  static sanitize(html: string, options?: { maxChars?: number }): string {
    let text = this.sanitizeHTML(html);
    text = this.removeQuotedContent(text);
    text = this.removeSignature(text);

    if (options?.maxChars) {
      text = this.truncateEmail(text, options.maxChars);
    }

    return text.trim();
  }
}
