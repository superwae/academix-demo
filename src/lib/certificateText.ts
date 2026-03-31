/** Matches server-side CertificateSummaryHelper.MaxWords */
export const MAX_CERTIFICATE_WORDS = 80;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
