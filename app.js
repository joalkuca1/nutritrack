/* ========= NutriTrack - app.js =========
   Capa de datos: perfiles, mediciones, cálculos, almacenamiento, PDF
======================================== */

const STORAGE_KEYS = {
  PROFILES: 'nt_profiles',
  MEASUREMENTS: (profileId) => `nt_measurements_${profileId}`,
  ACTIVE_PROFILE: 'nt_active_profile'
};

const AVATAR_PALETTE = [
  { bg: '#BFE6D2', fg: '#0E3A2B' },
  { bg: '#CBE1F2', fg: '#10314A' },
  { bg: '#FFDCC2', fg: '#4A2A00' },
  { bg: '#DDE8C9', fg: '#333D0E' },
  { bg: '#F6D8CB', fg: '#4E1D0C' }
];

/* ---------- Glosario amigable (tono "nutriólogo positivo") ---------- */
const GLOSSARY = {
  weightKg: {
    icon: '⚖️', title: 'Peso',
    text: 'Tu punto de partida, no toda la historia. Varía por agua y hormonas — importa la tendencia, no un solo día. 💚'
  },
  bmi: {
    icon: '📐', title: 'IMC',
    text: 'Fórmula de peso y estatura. Útil como referencia, pero no distingue grasa de músculo.'
  },
  bodyFatPct: {
    icon: '🔥', title: '% Grasa corporal',
    text: 'Cuánto de tu cuerpo es grasa. Bajarlo poco a poco significa que tu cuerpo la está usando como energía. ¡Vas bien!'
  },
  fatMassKg: {
    icon: '🔥', title: 'Masa grasa',
    text: 'El mismo dato que el % de grasa, pero en kilos en vez de porcentaje. Baja junto con el % — es normal que se muevan igual.'
  },
  skeletalMusclePct: {
    icon: '💪', title: 'Músculo esquelético',
    text: 'Tu motor metabólico: a más músculo, más calorías quemas en reposo. Si sube mientras bajas de peso, es señal excelente.'
  },
  leanMassKg: {
    icon: '💪', title: 'Masa magra',
    text: 'Todo tu peso que no es grasa: músculo, huesos, órganos y agua. Mantenerla estable (o subirla) mientras bajas de peso es una gran señal.'
  },
  waterPct: {
    icon: '💧', title: '% Agua corporal',
    text: 'Varía día a día por hidratación y sal. Cambios pequeños son normales.'
  },
  boneMassKg: {
    icon: '🦴', title: 'Masa ósea',
    text: 'El peso de tus huesos. Se mantiene estable; variaciones son del aparato, no reales.'
  },
  bmrKcal: {
    icon: '🔥', title: 'Metabolismo basal (BMR)',
    text: 'Calorías que gastas solo por existir. Más músculo = BMR más alto = más fácil mantener tu peso.'
  },
  metabolicAge: {
    icon: '🎂', title: 'Edad metabólica',
    text: 'Compara tu metabolismo con otras edades. Menor a la tuya = vas muy bien. Mayor = solo sigue constante.'
  },
  visceralFat: {
    icon: '🫀', title: 'Grasa visceral',
    text: 'Grasa alrededor de tus órganos. Rango sano: 1-12. Bajarla aquí vale tanto como bajar en la báscula.'
  },
  icc: {
    icon: '📏', title: 'Índice Cintura-Cadera',
    text: 'Cómo se distribuye tu grasa. Buen indicador junto al peso e IMC.'
  },
  waistCm: {
    icon: '📏', title: 'Cintura',
    text: 'Mide siempre en el mismo punto (a la altura del ombligo) para que las comparaciones sean justas.'
  },
  hipCm: {
    icon: '📏', title: 'Cadera',
    text: 'Mide en la parte más ancha de la cadera, siempre de pie y relajada.'
  },
  armCm: {
    icon: '📏', title: 'Brazo',
    text: 'Mide relajado (sin flexionar) en el punto medio entre hombro y codo.'
  },
  thighCm: {
    icon: '📏', title: 'Muslo',
    text: 'Mide en el punto más ancho, de pie y con el peso repartido en ambas piernas.'
  },
  chestCm: {
    icon: '📏', title: 'Pecho',
    text: 'Mide a la altura de los pezones, cinta horizontal y sin apretar.'
  },
  percentNote: {
    icon: '🧩', title: '¿Por qué estos % no suman 100%?',
    text: 'Porque se traslapan: el agua vive dentro del músculo, no es "aparte". Es como fruta y jugo — el jugo ya está contado dentro de la fruta. Cada dato se interpreta solo, comparándolo con tu propia semana pasada, no sumándolo con los demás.'
  }
};

const GLOSSARY_ORDER = [
  'weightKg', 'bmi', 'bodyFatPct', 'fatMassKg', 'leanMassKg',
  'skeletalMusclePct', 'waterPct', 'boneMassKg', 'bmrKcal',
  'metabolicAge', 'visceralFat', 'icc',
  'waistCm', 'hipCm', 'armCm', 'thighCm', 'chestCm',
  'percentNote'
];

/* ---------- Almacenamiento (localStorage) ---------- */
const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando', e);
      toast('⚠️ No se pudo guardar (memoria llena)');
      return false;
    }
  },
  remove(key) { localStorage.removeItem(key); }
};

/* ---------- Perfiles ---------- */
const Profiles = {
  getAll() {
    return Store.get(STORAGE_KEYS.PROFILES, []);
  },
  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },
  create({ name, gender, heightCm, goalWeightKg }) {
    const profiles = this.getAll();
    const newProfile = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      gender: gender || 'Femenino',
      heightCm: heightCm || null,
      goalWeightKg: goalWeightKg || null,
      avatarIndex: Math.floor(Math.random() * AVATAR_PALETTE.length),
      createdAt: Date.now()
    };
    profiles.push(newProfile);
    Store.set(STORAGE_KEYS.PROFILES, profiles);
    return newProfile;
  },
  update(id, patch) {
    const profiles = this.getAll();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    profiles[idx] = { ...profiles[idx], ...patch };
    Store.set(STORAGE_KEYS.PROFILES, profiles);
    return profiles[idx];
  },
  delete(id) {
    const profiles = this.getAll().filter(p => p.id !== id);
    Store.set(STORAGE_KEYS.PROFILES, profiles);
    Store.remove(STORAGE_KEYS.MEASUREMENTS(id));
    if (getActiveProfileId() === id) setActiveProfileId(null);
  }
};

function getActiveProfileId() {
  return Store.get(STORAGE_KEYS.ACTIVE_PROFILE, null);
}
function setActiveProfileId(id) {
  Store.set(STORAGE_KEYS.ACTIVE_PROFILE, id);
}

/* ---------- Mediciones ---------- */
const Measurements = {
  getByProfile(profileId) {
    const list = Store.get(STORAGE_KEYS.MEASUREMENTS(profileId), []);
    return list.slice().sort((a, b) => a.date - b.date);
  },
  create(profileId, data) {
    const list = this.getByProfile(profileId);
    const m = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      profileId,
      date: data.date || Date.now(),
      weightKg: data.weightKg,
      bodyFatPct: data.bodyFatPct ?? null,
      fatMassKg: data.fatMassKg ?? null,
      leanMassKg: data.leanMassKg ?? null,
      fatFreeMassKg: data.fatFreeMassKg ?? null,
      waterPct: data.waterPct ?? null,
      bmrKcal: data.bmrKcal ?? null,
      metabolicAge: data.metabolicAge ?? null,
      skeletalMusclePct: data.skeletalMusclePct ?? null,
      boneMassKg: data.boneMassKg ?? null,
      visceralFat: data.visceralFat ?? null,
      waistCm: data.waistCm ?? null,
      hipCm: data.hipCm ?? null,
      armCm: data.armCm ?? null,
      thighCm: data.thighCm ?? null,
      chestCm: data.chestCm ?? null,
      notes: data.notes ?? null,
      photo: data.photo ?? null
    };
    list.push(m);
    Store.set(STORAGE_KEYS.MEASUREMENTS(profileId), list);
    return m;
  },
  update(profileId, id, patch) {
    const list = this.getByProfile(profileId);
    const idx = list.findIndex(m => m.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    Store.set(STORAGE_KEYS.MEASUREMENTS(profileId), list);
    return list[idx];
  },
  delete(profileId, id) {
    const list = this.getByProfile(profileId).filter(m => m.id !== id);
    Store.set(STORAGE_KEYS.MEASUREMENTS(profileId), list);
  }
};

/* ---------- Formato numérico y de fecha ---------- */
function fmt1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
function fmt2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
function fmt0(v) { return Math.round(v).toString(); }
function fmtDelta(v, decimals = 1) {
  const s = decimals === 0 ? fmt0(Math.abs(v)) : fmt1(Math.abs(v));
  return (v > 0 ? '+' : v < 0 ? '-' : '') + s;
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function formatDateShort(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}
function formatDateLong(ts) {
  const d = new Date(ts);
  return `${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
function toInputDate(ts) {
  const d = new Date(ts);
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromInputDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

/* ---------- Cálculos de salud ---------- */
function calcBMI(weightKg, heightCm) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}
function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Peso saludable';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidad I';
  if (bmi < 40) return 'Obesidad II';
  return 'Obesidad III';
}
function waistHipRatio(waist, hip) {
  if (!waist || !hip) return null;
  return waist / hip;
}
function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}
function weekKey(ts) {
  const d = new Date(ts);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() * 100 + week;
}
function streakWeeks(measurements) {
  if (!measurements.length) return 0;
  const weeks = [...new Set(measurements.map(m => weekKey(m.date)))].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1] - weeks[i] === 1) streak++; else break;
  }
  return streak;
}

/* ---------- Hitos de meta (25% / 50% / 75% / 100%) ---------- */
function checkGoalMilestone(measurements, profile) {
  if (!profile || !profile.goalWeightKg || measurements.length < 2) return null;
  const first = measurements[0];
  const prev = measurements[measurements.length - 2];
  const last = measurements[measurements.length - 1];
  const totalNeeded = profile.goalWeightKg - first.weightKg;
  if (Math.abs(totalNeeded) < 0.01) return null;

  const prevProgress = ((prev.weightKg - first.weightKg) / totalNeeded) * 100;
  const lastProgress = ((last.weightKg - first.weightKg) / totalNeeded) * 100;

  const milestones = [100, 75, 50, 25];
  for (const ms of milestones) {
    if (prevProgress < ms && lastProgress >= ms) {
      if (ms === 100) return '🎉🏁 ¡Meta cumplida! Llegaste a tu peso objetivo.';
      return `🏁 ¡Alcanzaste el ${ms}% de tu meta! Sigue así 💪`;
    }
  }
  return null;
}

/* ---------- Insights automáticos en lenguaje natural ---------- */
function buildInsights(measurements, lowerWeightIsBetter, profile) {
  if (measurements.length < 2) {
    return ['Registra al menos dos mediciones para ver comparativas automáticas.'];
  }
  const prev = measurements[measurements.length - 2];
  const last = measurements[measurements.length - 1];
  const out = [];

  // Hito de meta primero (si aplica), para que destaque arriba
  const milestone = checkGoalMilestone(measurements, profile);
  if (milestone) out.push(milestone);

  const dw = last.weightKg - prev.weightKg;
  if (Math.abs(dw) < 0.05) {
    out.push(`⚖️ Peso estable en ${fmt1(last.weightKg)} kg`);
  } else {
    const good = lowerWeightIsBetter ? dw < 0 : dw > 0;
    const arrow = dw < 0 ? '▼' : '▲';
    const days = daysBetween(prev.date, last.date);
    let line = `⚖️ Peso ${arrow} ${fmt1(Math.abs(dw))} kg en ${days} ${days === 1 ? 'día' : 'días'}`;
    if (good) line += ' · ¡sigue así! 🎉';
    out.push(line);
  }

  let dFat = null, dMuscle = null;

  if (prev.fatMassKg != null && last.fatMassKg != null) {
    dFat = last.fatMassKg - prev.fatMassKg;
    out.push(Math.abs(dFat) < 0.05
      ? '🔥 Masa grasa estable'
      : `🔥 Grasa corporal ${dFat < 0 ? '▼' : '▲'} ${fmt1(Math.abs(dFat))} kg`);
  }

  if (prev.skeletalMusclePct != null && last.skeletalMusclePct != null) {
    dMuscle = last.skeletalMusclePct - prev.skeletalMusclePct;
    out.push(Math.abs(dMuscle) < 0.05
      ? '💪 Músculo esquelético estable'
      : `💪 Músculo ${dMuscle > 0 ? '▲' : '▼'} ${fmt1(Math.abs(dMuscle))} %`);
  }

  // Recomposición corporal: grasa baja + músculo sube a la vez
  if (dFat !== null && dMuscle !== null && dFat < -0.05 && dMuscle > 0.05) {
    out.unshift('🎉 ¡Recomposición corporal! Estás perdiendo grasa y ganando músculo al mismo tiempo — justo lo ideal.');
  }

  if (prev.waistCm != null && last.waistCm != null) {
    const d = last.waistCm - prev.waistCm;
    if (Math.abs(d) >= 0.3) {
      out.push(`📏 Cintura ${d < 0 ? '▼' : '▲'} ${fmt1(Math.abs(d))} cm`);
    }
  }

  return out;
}

/* ---------- Métricas para mini-cards del dashboard ---------- */
function buildMiniMetrics(measurements) {
  const series = (getter) => measurements.map(getter).filter(v => v !== null && v !== undefined);
  const defs = [
    { key: 'bodyFatPct', label: '% Grasa corporal', unit: '%', higher: false, dec: 1 },
    { key: 'fatMassKg', label: 'Masa grasa', unit: 'kg', higher: false, dec: 1 },
    { key: 'skeletalMusclePct', label: 'Músculo esquelético', unit: '%', higher: true, dec: 1 },
    { key: 'waterPct', label: '% Agua corporal', unit: '%', higher: true, dec: 1 },
    { key: 'boneMassKg', label: 'Masa ósea', unit: 'kg', higher: true, dec: 1 },
    { key: 'metabolicAge', label: 'Edad metabólica', unit: 'años', higher: false, dec: 0 },
    { key: 'bmrKcal', label: 'Metabolismo basal', unit: 'kcal', higher: true, dec: 0 },
    { key: 'visceralFat', label: 'Grasa visceral', unit: '', higher: false, dec: 0 },
    { key: 'waistCm', label: 'Cintura', unit: 'cm', higher: false, dec: 1 },
    { key: 'hipCm', label: 'Cadera', unit: 'cm', higher: false, dec: 1 },
    { key: 'armCm', label: 'Brazo', unit: 'cm', higher: true, dec: 1 },
    { key: 'thighCm', label: 'Muslo', unit: 'cm', higher: true, dec: 1 },
    { key: 'chestCm', label: 'Pecho', unit: 'cm', higher: true, dec: 1 }
  ];
  const out = [];
  defs.forEach(d => {
    const values = series(m => m[d.key]);
    if (values.length > 0) out.push({ ...d, values });
  });
  return out;
}

function deltaStatus(delta, higherIsBetter) {
  if (Math.abs(delta) < 0.05) return 'neutral';
  const good = higherIsBetter ? delta > 0 : delta < 0;
  return good ? 'good' : 'bad';
}

/* ---------- Compresión de fotos antes de guardarlas ---------- */
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- Toast (notificación flotante) ---------- */
let toastTimer = null;
function toast(message, duration = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ---------- Exportar reporte en PDF ---------- */
async function exportProfilePDF(profile, measurements) {
  if (typeof window.jspdf === 'undefined') {
    toast('⚠️ No se pudo cargar el generador de PDF (revisa tu conexión)');
    return;
  }
  toast('Generando PDF...');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  doc.setFillColor(62, 107, 92);
  doc.rect(0, 0, pageWidth, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('NutriTrack', margin, 40);
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Reporte de seguimiento · ${profile.name}`, margin, 62);
  const rango = measurements.length
    ? `${formatDateLong(measurements[0].date)}  →  ${formatDateLong(measurements[measurements.length - 1].date)}`
    : 'Sin mediciones';
  doc.setFontSize(10);
  doc.text(rango, margin, 78);

  y = 120;
  doc.setTextColor(23, 29, 26);

  if (!measurements.length) {
    doc.setFontSize(13);
    doc.text('Este perfil aún no tiene mediciones registradas.', margin, y);
    doc.save(`NutriTrack_${profile.name}.pdf`);
    return;
  }

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const totalChange = last.weightKg - first.weightKg;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Resumen general', margin, y);
  y += 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const resumenLineas = [
    `Peso inicial: ${fmt1(first.weightKg)} kg  (${formatDateShort(first.date)})`,
    `Peso actual: ${fmt1(last.weightKg)} kg  (${formatDateShort(last.date)})`,
    `Cambio total: ${fmtDelta(totalChange)} kg`,
    `Total de mediciones: ${measurements.length}`
  ];
  if (profile.heightCm) {
    const b = calcBMI(last.weightKg, profile.heightCm);
    resumenLineas.push(`IMC actual: ${fmt1(b)} (${bmiCategory(b)})`);
  }
  if (profile.goalWeightKg) {
    resumenLineas.push(`Meta de peso: ${fmt1(profile.goalWeightKg)} kg`);
  }
  resumenLineas.forEach(line => { doc.text(line, margin, y); y += 18; });
  y += 10;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Detalle por medición', margin, y);
  y += 16;

  const headers = ['Fecha', 'Peso', '% Grasa', 'Músculo %', 'Agua %'];
  const colWidths = [90, 70, 80, 85, 75];
  doc.setFontSize(10);
  doc.setFillColor(194, 236, 217);
  doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
  let x = margin + 8;
  doc.setFont(undefined, 'bold');
  headers.forEach((h, i) => { doc.text(h, x, y + 15); x += colWidths[i]; });
  y += 22;

  doc.setFont(undefined, 'normal');
  measurements.forEach((m, idx) => {
    if (y > 760) { doc.addPage(); y = 50; }
    if (idx % 2 === 0) {
      doc.setFillColor(246, 250, 245);
      doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
    }
    x = margin + 8;
    const row = [
      formatDateShort(m.date),
      `${fmt1(m.weightKg)} kg`,
      m.bodyFatPct != null ? `${fmt1(m.bodyFatPct)}%` : '—',
      m.skeletalMusclePct != null ? `${fmt1(m.skeletalMusclePct)}%` : '—',
      m.waterPct != null ? `${fmt1(m.waterPct)}%` : '—'
    ];
    row.forEach((v, i) => { doc.text(String(v), x, y + 14); x += colWidths[i]; });
    y += 20;
  });

  const withPhotos = measurements.filter(m => m.photo);
  if (withPhotos.length >= 1) {
    doc.addPage();
    y = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Fotos de progreso', margin, y);
    y += 20;
    const imgSize = 150;
    let xPos = margin;
    withPhotos.slice(0, 6).forEach((m) => {
      if (xPos + imgSize > pageWidth - margin) { xPos = margin; y += imgSize + 28; }
      if (y + imgSize > 780) { doc.addPage(); y = 50; xPos = margin; }
      try {
        doc.addImage(m.photo, 'JPEG', xPos, y, imgSize, imgSize);
        doc.setFontSize(9);
        doc.text(formatDateShort(m.date), xPos, y + imgSize + 14);
      } catch (e) {}
      xPos += imgSize + 20;
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`NutriTrack · Generado el ${formatDateLong(Date.now())} · Página ${i} de ${pageCount}`, margin, 820);
  }

  doc.save(`NutriTrack_${profile.name.replace(/\s+/g, '_')}.pdf`);
  toast('✅ PDF generado');
}
