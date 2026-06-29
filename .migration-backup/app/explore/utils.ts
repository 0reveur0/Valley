/**
 * Derive the page-1 thumbnail URL from the stored previewPattern template.
 * The pattern stored in DB looks like:
 *   https://res.cloudinary.com/{cloud}/image/upload/valley_documents/previews/{{page}}.jpg
 */
export function buildThumbnailUrl(previewPattern: string | null): string {
  if (!previewPattern) return '';
  return previewPattern.replace('{{page}}', '1');
}
