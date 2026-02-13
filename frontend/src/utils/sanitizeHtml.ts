import DOMPurify from "dompurify";

/**
 * Sanitize HTML coming from the server before rendering.
 * This helps prevent XSS when using `dangerouslySetInnerHTML` or HTML parsers.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
  });
}

