/**
 * Social Story Card Generator (Receiptify / Spotify Wrapped style)
 * Renders high-res 1080x1920 Canvas image for mobile stories and downloads as PNG
 */

export function generateSocialStoryCard(playlistInfo, tracks, userName = 'Music Lover') {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  bgGrad.addColorStop(0, '#0a0d14');
  bgGrad.addColorStop(0.5, '#0f1422');
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Background Ambient Orbs
  ctx.save();
  const orbGrad = ctx.createRadialGradient(250, 400, 50, 250, 400, 600);
  orbGrad.addColorStop(0, 'rgba(29, 185, 84, 0.22)');
  orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.restore();

  // Outer Card Frame
  const margin = 80;
  const cardW = 1080 - margin * 2;
  const cardH = 1920 - margin * 2;

  ctx.save();
  ctx.fillStyle = 'rgba(18, 24, 38, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  roundRect(ctx, margin, margin, cardW, cardH, 48);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Top Header / Branding
  ctx.fillStyle = '#1db954';
  ctx.font = '700 32px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SPOTIFY PLAYLIST DNA', margin + 60, margin + 110);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 26px Plus Jakarta Sans, sans-serif';
  ctx.fillText(`Curated for ${userName}`, margin + 60, margin + 155);

  // Playlist Title Box
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 52px Plus Jakarta Sans, sans-serif';
  const title = playlistInfo?.name || 'My Playlist';
  const truncatedTitle = title.length > 26 ? title.substring(0, 24) + '...' : title;
  ctx.fillText(truncatedTitle, margin + 60, margin + 250);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 28px Plus Jakarta Sans, sans-serif';
  ctx.fillText(`${tracks.length} Total Tracks Scanned`, margin + 60, margin + 295);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 60, margin + 345);
  ctx.lineTo(margin + cardW - 60, margin + 345);
  ctx.stroke();

  // Calculate Era Breakdown Percentages
  let countVintage = 0; // <= 1999
  let count2000s = 0;   // 2000 - 2009
  let count2010s = 0;   // 2010 - 2019
  let count2020s = 0;   // 2020+

  tracks.forEach(t => {
    const y = t.releaseYear;
    if (!y) return;
    if (y < 2000) countVintage++;
    else if (y < 2010) count2000s++;
    else if (y < 2020) count2010s++;
    else count2020s++;
  });

  const totalAnalyzed = Math.max(tracks.length, 1);
  const pVintage = Math.round((countVintage / totalAnalyzed) * 100);
  const p2000s = Math.round((count2000s / totalAnalyzed) * 100);
  const p2010s = Math.round((count2010s / totalAnalyzed) * 100);
  const p2020s = Math.round((count2020s / totalAnalyzed) * 100);

  // Era Breakdown Section
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 36px Plus Jakarta Sans, sans-serif';
  ctx.fillText('ERA BREAKDOWN', margin + 60, margin + 425);

  const eraData = [
    { name: '2000s Nostalgia', pct: p2000s, count: count2000s, color: '#1db954' },
    { name: '90s & Golden Era', pct: pVintage, count: countVintage, color: '#38bdf8' },
    { name: '2010s Hits', pct: p2010s, count: count2010s, color: '#a855f7' },
    { name: '2020s Modern', pct: p2020s, count: count2020s, color: '#f59e0b' }
  ];

  let currentY = margin + 490;
  eraData.forEach(era => {
    // Label & Percent
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 30px Plus Jakarta Sans, sans-serif';
    ctx.fillText(era.name, margin + 60, currentY);

    ctx.textAlign = 'right';
    ctx.fillStyle = era.color;
    ctx.font = '700 30px Plus Jakarta Sans, sans-serif';
    ctx.fillText(`${era.pct}% (${era.count})`, margin + cardW - 60, currentY);
    ctx.textAlign = 'left';

    // Progress Bar Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, margin + 60, currentY + 16, cardW - 120, 16, 8);
    ctx.fill();

    // Progress Bar Fill
    const fillW = Math.max(((cardW - 120) * era.pct) / 100, 8);
    ctx.fillStyle = era.color;
    roundRect(ctx, margin + 60, currentY + 16, fillW, 16, 8);
    ctx.fill();

    currentY += 85;
  });

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(margin + 60, currentY + 20);
  ctx.lineTo(margin + cardW - 60, currentY + 20);
  ctx.stroke();

  // Top Oldest Classic Tracks Section
  currentY += 80;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 36px Plus Jakarta Sans, sans-serif';
  ctx.fillText('OLDEST CLASSICS FOUND', margin + 60, currentY);

  const oldestTracks = [...tracks]
    .filter(t => t.releaseYear)
    .sort((a, b) => a.releaseYear - b.releaseYear)
    .slice(0, 5);

  currentY += 50;

  if (oldestTracks.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 28px Plus Jakarta Sans, sans-serif';
    ctx.fillText('No track release years detected.', margin + 60, currentY + 40);
  } else {
    oldestTracks.forEach((t, idx) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      roundRect(ctx, margin + 60, currentY, cardW - 120, 95, 20);
      ctx.fill();

      // Number badge
      ctx.fillStyle = '#1db954';
      ctx.font = '800 28px Plus Jakarta Sans, sans-serif';
      ctx.fillText(`#${idx + 1}`, margin + 85, currentY + 58);

      // Track Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px Plus Jakarta Sans, sans-serif';
      const cleanName = t.name.length > 28 ? t.name.substring(0, 26) + '...' : t.name;
      ctx.fillText(cleanName, margin + 145, currentY + 44);

      // Track Artist
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 22px Plus Jakarta Sans, sans-serif';
      const cleanArtist = t.artists.length > 34 ? t.artists.substring(0, 32) + '...' : t.artists;
      ctx.fillText(cleanArtist, margin + 145, currentY + 76);

      // Release Year Badge
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1db954';
      ctx.font = '800 28px Plus Jakarta Sans, sans-serif';
      ctx.fillText(t.releaseYear.toString(), margin + cardW - 90, currentY + 58);
      ctx.textAlign = 'left';

      ctx.restore();
      currentY += 115;
    });
  }

  // Footer Branding
  const footerY = margin + cardH - 80;
  ctx.fillStyle = '#64748b';
  ctx.font = '600 24px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('spotify-playlist-year-filter.vercel.app', 540, footerY);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function downloadSocialStoryCard(dataUrl, filename = 'spotify-era-dna.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
