const canvas = document.getElementById('globe');
const ctx = canvas.getContext('2d');
let rotation = .4;
let scrollShift = 0;

function isLand(lat, lon) {
  // A deliberately abstract, hand-shaped world map made of telemetry dots.
  const northAmerica = lon > -168 && lon < -48 && lat > 12 && lat < 74 && (lat > 24 || lon < -80);
  const southAmerica = lon > -84 && lon < -31 && lat > -56 && lat < 14 && (lon < -42 || lat < 4);
  const europeAsia = lon > -18 && lon < 158 && lat > 4 && lat < 77 && !(lon > 126 && lat < 27);
  const africa = lon > -19 && lon < 53 && lat > -35 && lat < 35 && (lon < 42 || lat > -18);
  const australia = lon > 108 && lon < 157 && lat > -46 && lat < -9;
  const greenland = lon > -70 && lon < -17 && lat > 58 && lat < 84;
  return northAmerica || southAmerica || europeAsia || africa || australia || greenland;
}

function project(lat, lon, centerX, centerY, radius) {
  const phi = lat * Math.PI / 180;
  const theta = lon * Math.PI / 180 + rotation;
  const x = Math.cos(phi) * Math.sin(theta);
  const y = -Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(theta);
  return { x: centerX + x * radius, y: centerY + y * radius, z, depth: (z + 1) / 2 };
}

function drawElectricSignal(from, to, index, centerX, centerY, radius, now) {
  const start = project(from[0], from[1], centerX, centerY, radius);
  const end = project(to[0], to[1], centerX, centerY, radius);
  if (start.z <= .06 || end.z <= .06) return;
  const middleX = (start.x + end.x) / 2;
  const middleY = (start.y + end.y) / 2 - radius * .17;
  const travel = (Math.sin(now * .0019 + index * 1.77) + 1) / 2;
  const inverse = 1 - travel;
  const curvePoint = t => ({
    x: (1-t)*(1-t)*start.x + 2*(1-t)*t*middleX + t*t*end.x,
    y: (1-t)*(1-t)*start.y + 2*(1-t)*t*middleY + t*t*end.y
  });

  ctx.save();
  ctx.lineWidth = 1.45;
  ctx.setLineDash([2, 6]);
  ctx.lineDashOffset = -now * .018 - index * 7;
  ctx.shadowColor = '#238cff'; ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(45,143,255,.9)';
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.quadraticCurveTo(middleX, middleY, end.x, end.y); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineWidth = .65; ctx.strokeStyle = 'rgba(167,220,255,.96)';
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.quadraticCurveTo(middleX, middleY, end.x, end.y); ctx.stroke();
  ctx.setLineDash([]);

  [travel, inverse].forEach((t, pulseIndex) => {
    const point = curvePoint(t);
    const alpha = .65 + Math.sin(now * .008 + index + pulseIndex) * .2;
    ctx.shadowColor = '#2f8dff'; ctx.shadowBlur = 22;
    ctx.fillStyle = `rgba(74,157,255,${alpha})`;
    ctx.beginPath(); ctx.arc(point.x, point.y, 4.15, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(225,244,255,.98)';ctx.beginPath();ctx.arc(point.x,point.y,1,0,Math.PI*2);ctx.fill();
  });
  ctx.restore();
}

function drawArc(lat, centerX, centerY, radius) {
  ctx.beginPath();
  let drawing = false;
  for (let lon = -180; lon <= 180; lon += 2) {
    const p = project(lat, lon, centerX, centerY, radius);
    if (p.z > 0) { if (!drawing) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); drawing = true; } else drawing = false;
  }
  ctx.stroke();
}

function drawGlobe() {
  const box = canvas.getBoundingClientRect();
  const dpi = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(box.width * dpi));
  canvas.height = Math.max(1, Math.floor(box.height * dpi));
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
  const w = box.width, h = box.height;
  const r = Math.min(w, h) * (.365 + scrollShift * .015);
  const cx = w * .52, cy = h * (.52 - scrollShift * .03);
  ctx.clearRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(cx, cy, r * .4, cx, cy, r * 1.28);
  glow.addColorStop(0, 'rgba(255,255,255,.10)');
  glow.addColorStop(.68, 'rgba(138,183,255,.04)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.28, 0, Math.PI * 2); ctx.fill();

  const body = ctx.createRadialGradient(cx - r*.3, cy - r*.35, r*.05, cx, cy, r);
  body.addColorStop(0, 'rgba(244,247,255,.27)');
  body.addColorStop(.55, 'rgba(168,182,208,.12)');
  body.addColorStop(1, 'rgba(45,54,72,.08)');
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

  ctx.lineWidth = .55; ctx.strokeStyle = 'rgba(208,222,255,.14)';
  for (let lat = -60; lat <= 60; lat += 20) drawArc(lat, cx, cy, r);
  for (let lon = -160; lon <= 160; lon += 20) {
    ctx.beginPath(); let drawing = false;
    for (let lat = -89; lat <= 89; lat += 2) {
      const p = project(lat, lon, cx, cy, r);
      if (p.z > 0) { if (!drawing) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); drawing = true; } else drawing = false;
    }
    ctx.stroke();
  }

  for (let lat = -80; lat <= 80; lat += 2.8) {
    for (let lon = -180; lon <= 180; lon += 3.5) {
      if (!isLand(lat, lon)) continue;
      const p = project(lat, lon, cx, cy, r);
      if (p.z <= 0) continue;
      const size = .65 + p.depth * .85;
      ctx.fillStyle = `rgba(245,248,255,${.28 + p.depth * .58})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Alert signals pulse over the map; their paths are intentionally portfolio-specific.
  const incidents = [
    [47,-122],[31,-104],[10,-74],[-30,-58],[60,-5],[49,16],[60,50],[25,55],
    [12,33],[-18,22],[-31,30],[20,77],[35,105],[8,125],[-26,135],[40,145],[60,-55]
  ];
  incidents.forEach(([lat,lon], index) => {
    const p = project(lat, lon, cx, cy, r);
    if (p.z <= 0) return;
    const pulse = 5.5 + Math.sin(rotation * 6 + index) * 1.8;
    ctx.strokeStyle = `rgba(255,97,71,${.3 + p.depth*.46})`;ctx.lineWidth=.9;ctx.beginPath();ctx.arc(p.x,p.y,pulse,0,Math.PI*2);ctx.stroke();
    ctx.shadowColor='#ff5138';ctx.shadowBlur=11;ctx.fillStyle = '#ff654c';ctx.beginPath();ctx.arc(p.x,p.y,3.1,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  });
  [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,0],[0,5],[5,10],[10,15],[15,3]].forEach(([from, to], index) => {
    drawElectricSignal(incidents[from], incidents[to], index, cx, cy, r, performance.now());
  });
  ctx.restore();
  ctx.strokeStyle = 'rgba(239,244,255,.78)';ctx.lineWidth = 1.25;ctx.shadowColor = 'rgba(218,231,255,.95)';ctx.shadowBlur = 11;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
}

function animate() { rotation += .00165; drawGlobe(); requestAnimationFrame(animate); }
window.addEventListener('scroll', () => { scrollShift = Math.min(1, window.scrollY / (document.body.scrollHeight - innerHeight || 1)); }, { passive: true });
window.addEventListener('resize', drawGlobe);animate();

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: .13 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
