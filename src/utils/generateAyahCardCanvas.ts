/**
 * generateAyahCardCanvas.ts
 * Generates an artistic, high-resolution Islamic canvas card for Quran verses.
 * Suitable for image export and video frame generation.
 */

interface GenerateAyahCardOptions {
  surahName: string;
  surahNumber: number;
  ayahLabel: string;
  versesText: string;
  qariName?: string;
  theme?: 'emerald' | 'royal_dark' | 'cream_gold';
  width?: number;
  height?: number;
}

export async function generateAyahCardCanvas(options: GenerateAyahCardOptions): Promise<HTMLCanvasElement> {
  const {
    surahName,
    surahNumber,
    ayahLabel,
    versesText,
    qariName,
    theme = 'emerald',
    width = 1080,
    height = 1080,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Background colors based on theme
  let bgGradient: CanvasGradient;
  let borderColor = '#D4AF37';
  let innerBorderColor = '#D4AF3766';
  let titleColor = '#D4AF37';
  let verseTextColor = '#FFFFFF';
  let subtextColor = '#A7F3D0';
  let ornamentColor = '#D4AF3799';

  if (theme === 'royal_dark') {
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0F172A');
    bgGradient.addColorStop(0.5, '#1E293B');
    bgGradient.addColorStop(1, '#0B0F19');
    subtextColor = '#94A3B8';
  } else if (theme === 'cream_gold') {
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#FDFBF7');
    bgGradient.addColorStop(0.5, '#F5EFE6');
    bgGradient.addColorStop(1, '#EFE8DC');
    verseTextColor = '#1A2E1A';
    titleColor = '#8F7728';
    subtextColor = '#556B2F';
    borderColor = '#8F7728';
    innerBorderColor = '#8F772844';
    ornamentColor = '#8F772877';
  } else {
    // emerald (Default Islamic aesthetic)
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0B291B');
    bgGradient.addColorStop(0.4, '#133E2B');
    bgGradient.addColorStop(1, '#081D13');
  }

  // Draw background
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw delicate Islamic geometric background pattern (subtle lines)
  ctx.save();
  ctx.strokeStyle = ornamentColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.08;
  const step = 80;
  for (let x = -width; x < width * 2; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.restore();

  // Draw double decorative border
  const margin = 50;
  const innerMargin = 64;

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  ctx.strokeStyle = innerBorderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

  // Draw corner ornaments
  const cornerSize = 28;
  const drawCorner = (cx: number, cy: number) => {
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - cornerSize, cy);
    ctx.lineTo(cx + cornerSize, cy);
    ctx.moveTo(cx, cy - cornerSize);
    ctx.lineTo(cx, cy + cornerSize);
    ctx.stroke();
  };

  drawCorner(innerMargin, innerMargin);
  drawCorner(width - innerMargin, innerMargin);
  drawCorner(innerMargin, height - innerMargin);
  drawCorner(width - innerMargin, height - innerMargin);

  // Top header: Bismillah or Surah title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Surah Badge / Header
  const headerY = 140;
  ctx.font = 'bold 30px Cairo, Amiri, sans-serif';
  ctx.fillStyle = titleColor;
  ctx.fillText(`﴿ سُورَةُ ${surahName.replace(/^(سُورَةُ|سورة)\s+/, '')} ﴾`, width / 2, headerY);

  // Subtitle (Ayah number label)
  ctx.font = '600 22px Cairo, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(ayahLabel, width / 2, headerY + 45);

  // Decorative divider
  ctx.font = '24px Cairo, Amiri, sans-serif';
  ctx.fillStyle = ornamentColor;
  ctx.fillText('❖  ══════  ۞  ══════  ❖', width / 2, headerY + 85);

  // 2. Main Verses Text (Wrapped & Centered)
  const maxTextWidth = width - 220;
  const verseStartY = 330;
  const verseAvailableHeight = height - verseStartY - 220;

  // Measure and wrap text
  const cleanVerses = versesText.trim();

  // Dynamic font sizing based on length
  let fontSize = 42;
  if (cleanVerses.length > 450) fontSize = 28;
  else if (cleanVerses.length > 300) fontSize = 32;
  else if (cleanVerses.length > 180) fontSize = 36;
  else if (cleanVerses.length > 90) fontSize = 40;

  ctx.font = `${fontSize}px Amiri, Cairo, serif`;
  ctx.fillStyle = verseTextColor;

  const words = cleanVerses.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxTextWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.85;
  const totalTextHeight = lines.length * lineHeight;
  let textY = verseStartY + Math.max(0, (verseAvailableHeight - totalTextHeight) / 2) + lineHeight / 2;

  // Add decorative quotes on first and last if not already bracketed
  ctx.direction = 'rtl';
  for (let i = 0; i < lines.length; i++) {
    let lineToDraw = lines[i];
    if (i === 0 && !lineToDraw.startsWith('﴿') && !lineToDraw.startsWith('"')) {
      lineToDraw = `« ${lineToDraw}`;
    }
    if (i === lines.length - 1 && !lineToDraw.endsWith('﴾') && !lineToDraw.endsWith('"')) {
      lineToDraw = `${lineToDraw} »`;
    }
    ctx.fillText(lineToDraw, width / 2, textY);
    textY += lineHeight;
  }

  // 3. Footer branding & Qari (if provided)
  const footerY = height - 120;
  ctx.direction = 'ltr';

  ctx.font = '22px Cairo, Amiri, sans-serif';
  ctx.fillStyle = ornamentColor;
  ctx.fillText('❖  ══════  ❖  ══════  ❖', width / 2, footerY - 35);

  if (qariName) {
    ctx.font = 'bold 20px Cairo, sans-serif';
    ctx.fillStyle = subtextColor;
    ctx.fillText(`بصوت: ${qariName}`, width / 2, footerY);
  }

  ctx.font = '600 17px Cairo, sans-serif';
  ctx.fillStyle = ornamentColor;
  ctx.fillText('تطبيق خطة حفظ القرآن الكريم', width / 2, footerY + 32);

  return canvas;
}
