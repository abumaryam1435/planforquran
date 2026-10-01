const fs = require('fs');
let file = fs.readFileSync('src/utils/offlineCache.ts', 'utf-8');

file = file.replace(/\/\*\*\n \* Returns either a local object URL[\s\S]*?return defaultUrl;\n}/g, `/**
 * Returns the URL for the Quran page image.
 * Caching is handled automatically by the Service Worker.
 */
export async function getPageImageSrc(page: number, fallbackStep: number = 0): Promise<string> {
  const pagePad = page.toString().padStart(3, '0');
  let defaultUrl = \`https://android.quran.com/data/width_1260/page\${pagePad}.png\`;
  if (fallbackStep === 1) defaultUrl = \`https://android.quran.com/data/width_1024/page\${pagePad}.png\`;
  if (fallbackStep === 2) defaultUrl = \`https://android.quran.com/data/width_512/page\${pagePad}.png\`;
  return defaultUrl;
}

/**
 * Returns the URL for the audio.
 * Caching is handled automatically by the Service Worker.
 */
export async function getAudioSrc(surah: number, ayah: number): Promise<string> {
  let qari = typeof window !== 'undefined' ? localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps' : 'Minshawy_Murattal_128kbps';
  if (qari === 'Maher_Alwan_64kbps') {
    qari = 'Muhammad_Ayyoub_128kbps';
  }
  const defaultUrl = \`https://everyayah.com/data/\${qari}/\${String(surah).padStart(3, '0')}\${String(ayah).padStart(3, '0')}.mp3\`;
  return defaultUrl;
}`);

fs.writeFileSync('src/utils/offlineCache.ts', file);
