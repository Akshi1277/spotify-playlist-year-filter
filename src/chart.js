/**
 * Timeline & Decade Distribution Chart
 * Zero-dependency HTML5 Canvas visualizer
 */

export function renderDecadeChart(canvas, tracks, selectedMinYear, selectedMaxYear) {
  if (!canvas || !tracks || tracks.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Aggregate tracks by decade
  const decades = [
    { label: '< 1970', min: 0, max: 1969, count: 0 },
    { label: '1970s', min: 1970, max: 1979, count: 0 },
    { label: '1980s', min: 1980, max: 1989, count: 0 },
    { label: '1990s', min: 1990, max: 1999, count: 0 },
    { label: '2000s', min: 2000, max: 2009, count: 0 },
    { label: '2010s', min: 2010, max: 2019, count: 0 },
    { label: '2020s', min: 2020, max: 2099, count: 0 }
  ];

  tracks.forEach(t => {
    const year = t.releaseYear;
    if (!year) return;
    const bucket = decades.find(d => year >= d.min && year <= d.max);
    if (bucket) bucket.count++;
  });

  const maxCount = Math.max(...decades.map(d => d.count), 1);

  // Clear background
  ctx.clearRect(0, 0, width, height);

  const paddingBottom = 28;
  const paddingTop = 20;
  const chartHeight = height - paddingBottom - paddingTop;
  const barWidth = Math.min(56, (width - 40) / decades.length - 12);
  const totalBarWidth = decades.length * (barWidth + 12);
  const startX = (width - totalBarWidth) / 2;

  decades.forEach((d, i) => {
    const x = startX + i * (barWidth + 12);
    const barH = (d.count / maxCount) * chartHeight;
    const y = height - paddingBottom - barH;

    // Check if this decade is within active filter range
    const isInsideFilter = (d.max >= selectedMinYear && d.min <= selectedMaxYear);

    // Draw Bar
    ctx.save();
    if (isInsideFilter && d.count > 0) {
      const gradient = ctx.createLinearGradient(0, y, 0, height - paddingBottom);
      gradient.addColorStop(0, '#1db954');
      gradient.addColorStop(1, 'rgba(29, 185, 84, 0.25)');
      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(29, 185, 84, 0.4)';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = d.count > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
      ctx.shadowBlur = 0;
    }

    // Rounded top bar
    const radius = Math.min(6, barH / 2);
    ctx.beginPath();
    ctx.moveTo(x, height - paddingBottom);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, height - paddingBottom);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Count label on top of bar
    if (d.count > 0) {
      ctx.fillStyle = isInsideFilter ? '#fff' : '#64748b';
      ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.count.toString(), x + barWidth / 2, Math.max(14, y - 6));
    }

    // Draw Decade Label at bottom
    ctx.fillStyle = isInsideFilter ? '#1db954' : '#64748b';
    ctx.font = isInsideFilter ? '700 11px Plus Jakarta Sans, sans-serif' : '500 11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barWidth / 2, height - 8);
  });
}
