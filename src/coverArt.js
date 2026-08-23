/**
 * Generative Retro Cover Art Generator
 * Creates 640x640 JPEG image and base64 string for Spotify playlist cover upload
 */

export function generateRetroCoverArt(playlistTitle, eraTag = 'Retro Classics', customSub = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // Dark Textured Background
  const bgGrad = ctx.createLinearGradient(0, 0, 640, 640);
  bgGrad.addColorStop(0, '#0a0d14');
  bgGrad.addColorStop(1, '#131926');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 640, 640);

  // Concentric Vinyl Grooves
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1.5;
  for (let r = 80; r < 360; r += 24) {
    ctx.beginPath();
    ctx.arc(320, 320, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Neon Ambient Glow
  ctx.save();
  const glowGrad = ctx.createRadialGradient(320, 320, 40, 320, 320, 260);
  glowGrad.addColorStop(0, 'rgba(29, 185, 84, 0.35)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 640, 640);
  ctx.restore();

  // Central Minimalist Badge
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
  ctx.strokeStyle = 'rgba(29, 185, 84, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(320, 320, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Era Tag Badge (Top of circle)
  ctx.fillStyle = '#1db954';
  ctx.font = '700 18px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(eraTag.toUpperCase(), 320, 240);

  // Main Playlist Name (Center)
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px Plus Jakarta Sans, sans-serif';
  const cleanTitle = playlistTitle.length > 20 ? playlistTitle.substring(0, 18) + '...' : playlistTitle;
  ctx.fillText(cleanTitle, 320, 320);

  // Subtitle / Year Range (Bottom of circle)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 16px Plus Jakarta Sans, sans-serif';
  const subText = customSub || 'Curated Vault Selection';
  ctx.fillText(subText, 320, 380);

  // Outer Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 632, 632);

  const fullDataUrl = canvas.toDataURL('image/jpeg', 0.75);

  return {
    dataUrl: fullDataUrl,
    // Pure base64 data without URI scheme
    base64Data: fullDataUrl.split(',')[1]
  };
}
