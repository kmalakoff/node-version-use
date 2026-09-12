/**
 * Compare two semver version strings (e.g., "20.19.0" vs "20.9.1")
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export default function compareVersions(a: string, b: string): number {
  const aParts = a.replace(/^v/, '').split('.');
  const bParts = b.replace(/^v/, '').split('.');
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aNum = parseInt(aParts[i], 10) || 0;
    const bNum = parseInt(bParts[i], 10) || 0;
    if (aNum !== bNum) return aNum - bNum;
  }
  return 0;
}
