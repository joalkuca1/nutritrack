/* ========= NutriTrack - ui.js =========
   Capa visual: pantallas, navegación, gráficas, formularios
======================================== */

const State = {
  screen: 'profiles',   // 'profiles' | 'main'
  profileId: null,
  tab: 'dashboard',      // 'dashboard' | 'progress' | 'history'
  range: 'all',          // '4w' | '3m' | 'all'
  editingMeasurementId: null,
  tempPhoto: null,
  comparePhotos: []
};

let chartInstances = {};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function isLowerBetter(profile, measurements) {
  if (profile.goalWeightKg != null && measurements.length) {
    return profile.goalWeightKg < measurements[0].weightKg;
  }
  return true;
}

/* ================= RENDER PRINCIPAL ================= */
function render() {
  const app = document.getElementById('app');
  if (State.screen === 'profiles') {
    app.innerHTML = renderProfilesScreen();
  } else {
    app.innerHTML = renderMainScreen();
    if (State.tab === 'progress') {
      const profile = Profiles.getById(State.profileId);
      const measurements = Measurements.getByProfile(profile.id);
      initProgressCharts(profile, measurements);
    }
  }
}

/* ================= PANTALLA: PERFILES ================= */
function renderProfilesScreen() {
  const profiles = Profiles.getAll();
  let html = `
    <div class="profiles-wrap">
      <h1 class="greeting" style="margin-top:8px;">¿Quién se pesa hoy?</h1>
      <p class="subtext" style="margin-bottom:16px;">Selecciona un perfil para ver su seguimiento</p>
  `;
  if (profiles.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">👤</div>
        <h3>Aún no hay perfiles</h3>
        <p>Crea el primero para empezar tu seguimiento</p>
      </div>`;
  } else {
    profiles.forEach(p => {
      const pal = AVATAR_PALETTE[p.avatarIndex % AVATAR_PALETTE.length];
      const metaParts = [];
      if (p.heightCm) metaParts.push(`Altura ${fmt0(p.heightCm)} cm`);
      if (p.goalWeightKg) metaParts.push(`Meta ${fmt1(p.goalWeightKg)} kg`);
      html += `
        <div class="profile-card" onclick="openProfile('${p.id}')">
          <div class="avatar" style="background:${pal.bg}; color:${pal.fg};">${escapeHtml(p.name).charAt(0).toUpperCase()}</div>
          <div class="profile-info">
            <div class="profile-name">${escapeHtml(p.name)}</div>
            ${metaParts.length ? `<div class="profile-meta">${metaParts.join(' · ')}</div>` : ''}
          </div>
          <span class="chevron" onclick="event.stopPropagation(); openEditProfileSheet('${p.id}')">✏️</span>
        </div>`;
    });
  }
  html += `
      <button class="btn btn-filled" style="margin-top:12px;" onclick="openAddProfileSheet()">➕ Nuevo perfil</button>
    </div>`;
  return html;
}

function openProfile(id) {
  setActiveProfileId(id);
  State.profileId = id;
  State.screen = 'main';
  State.tab = 'dashboard';
  render();
}

function goToProfiles() {
  State.screen = 'profiles';
  render();
}

/* ================= SHEET (modal inferior) ================= */
function openSheet(html) {
  document.getElementById('sheetContent').innerHTML = html;
  document.getElementById('overlay').classList.add('open');
}
function closeSheet() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('sheetContent').innerHTML = '';
  State.tempPhoto = null;
  State.editingMeasurementId = null;
}
function toggleCollapsible(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id + '_arrow');
  el.classList.toggle('open');
  arrow.textContent = el.classList.contains('open') ? '▴' : '▾';
}
function selectSegment(btn, hiddenId) {
  const siblings = btn.parentElement.querySelectorAll('button');
  siblings.forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  document.getElementById(hiddenId).value = btn.textContent;
}

/* ================= GLOSARIO (explicaciones amigables) ================= */
function openGlossaryModal(key) {
  const g = GLOSSARY[key];
  if (!g) return;
  const html = `
    <div class="sheet-handle"></div>
    <div style="text-align:center; font-size:40px; margin-bottom:4px;">${g.icon}</div>
    <h2 style="text-align:center;">${g.title}</h2>
    <p style="font-size:15px; line-height:1.55; color:var(--on-surface-variant); margin-top:12px;">${g.text}</p>
    <button class="btn btn-tonal" style="margin-top:20px;" onclick="openFullGlossary()">📖 Ver glosario completo</button>
  `;
  openSheet(html);
}

function openFullGlossary() {
  let items = '';
  GLOSSARY_ORDER.forEach(key => {
    const g = GLOSSARY[key];
    if (!g) return;
    items += `
      <div style="display:flex; gap:12px; padding:14px 0; border-bottom:1px solid rgba(0,0,0,0.07);">
        <div style="font-size:24px; line-height:1;">${g.icon}</div>
        <div>
          <div style="font-weight:700; margin-bottom:3px;">${g.title}</div>
          <div style="font-size:13.5px; line-height:1.45; color:var(--on-surface-variant);">${g.text}</div>
        </div>
      </div>`;
  });
  const html = `
    <div class="sheet-handle"></div>
    <h2>📖 Glosario</h2>
    <p class="sheet-sub">Entiende tus números, sin tecnicismos</p>
    <div style="max-height:58vh; overflow-y:auto; margin-top:6px;">${items}</div>
  `;
  openSheet(html);
}

/* ================= FORM: PERFIL ================= */
function openAddProfileSheet() { renderProfileForm(null); }
function openEditProfileSheet(id) { renderProfileForm(Profiles.getById(id)); }

function renderProfileForm(profile) {
  const isEdit = !!profile;
  const genders = ['Femenino', 'Masculino', 'Otro'];
  const currentGender = isEdit ? profile.gender : 'Femenino';
  const html = `
    <div class="sheet-handle"></div>
    <h2>${isEdit ? 'Editar perfil' : 'Nuevo perfil'}</h2>
    <p class="sheet-sub">${isEdit ? 'Actualiza los datos' : 'Completa los datos para comenzar'}</p>
    <div class="field">
      <label>Nombre *</label>
      <input type="text" id="f_name" value="${isEdit ? escapeHtml(profile.name) : ''}" placeholder="Ej. María">
    </div>
    <div class="field">
      <label>Género</label>
      <div class="segmented" id="f_gender_seg">
        ${genders.map(g => `<button type="button" class="${currentGender === g ? 'sel' : ''}" onclick="selectSegment(this,'f_gender')">${g}</button>`).join('')}
      </div>
      <input type="hidden" id="f_gender" value="${currentGender}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Altura (opcional)</label>
        <input type="number" id="f_height" value="${isEdit && profile.heightCm ? profile.heightCm : ''}" placeholder="165">
      </div>
      <div class="field">
        <label>Meta de peso (opcional)</label>
        <input type="number" id="f_goal" value="${isEdit && profile.goalWeightKg ? profile.goalWeightKg : ''}" placeholder="65">
      </div>
    </div>
    ${isEdit ? `<button class="btn btn-text" style="color:var(--error);" onclick="confirmDeleteProfile('${profile.id}')">🗑 Eliminar perfil</button>` : ''}
    <button class="btn btn-filled" onclick="saveProfileForm(${isEdit ? `'${profile.id}'` : 'null'})">Guardar</button>
  `;
  openSheet(html);
}

function saveProfileForm(id) {
  const name = document.getElementById('f_name').value.trim();
  if (!name) { toast('⚠️ El nombre es obligatorio'); return; }
  const gender = document.getElementById('f_gender').value;
  const heightCm = parseFloat(document.getElementById('f_height').value) || null;
  const goalWeightKg = parseFloat(document.getElementById('f_goal').value) || null;
  if (id) {
    Profiles.update(id, { name, gender, heightCm, goalWeightKg });
    toast('✅ Perfil actualizado');
  } else {
    const p = Profiles.create({ name, gender, heightCm, goalWeightKg });
    closeSheet();
    openProfile(p.id);
    toast('✅ Perfil creado');
    return;
  }
  closeSheet();
  render();
}

function confirmDeleteProfile(id) {
  if (confirm('¿Eliminar este perfil y todas sus mediciones? Esta acción no se puede deshacer.')) {
    Profiles.delete(id);
    closeSheet();
    if (State.profileId === id) { State.screen = 'profiles'; State.profileId = null; }
    render();
    toast('Perfil eliminado');
  }
}

/* ================= PANTALLA: MAIN (tabs) ================= */
function renderMainScreen() {
  const profile = Profiles.getById(State.profileId);
  if (!profile) { State.screen = 'profiles'; return renderProfilesScreen(); }
  const measurements = Measurements.getByProfile(profile.id);
  let content = '';
  if (State.tab === 'dashboard') content = renderDashboardTab(profile, measurements);
  else if (State.tab === 'progress') content = renderProgressTab(profile, measurements);
  else content = renderHistoryTab(profile, measurements);

  return `
    ${content}
    <button class="fab" onclick="openAddMeasurementSheet()">➕ Nueva medición</button>
    <div class="bottom-nav">
      <button class="nav-item ${State.tab === 'dashboard' ? 'active' : ''}" onclick="switchTab('dashboard')">
        <span class="nav-icon">🏠</span>Inicio
      </button>
      <button class="nav-item ${State.tab === 'progress' ? 'active' : ''}" onclick="switchTab('progress')">
        <span class="nav-icon">📈</span>Progreso
      </button>
      <button class="nav-item ${State.tab === 'history' ? 'active' : ''}" onclick="switchTab('history')">
        <span class="nav-icon">📅</span>Historial
      </button>
    </div>`;
}
function switchTab(tab) { State.tab = tab; render(); }

/* ================= TAB: DASHBOARD ================= */
function renderDashboardTab(profile, measurements) {
  const last = measurements[measurements.length - 1];
  const prev = measurements[measurements.length - 2];
  const lowerIsBetter = isLowerBetter(profile, measurements);
  const streak = streakWeeks(measurements);
  const pal = AVATAR_PALETTE[profile.avatarIndex % AVATAR_PALETTE.length];

  let html = `
    <div class="header">
      <div class="header-row">
        <div style="flex:1;">
          <h1 class="greeting">Hola, ${escapeHtml(profile.name)} 👋</h1>
          <p class="subtext">${last ? 'Última medición: ' + formatDateShort(last.date) : 'Aún sin mediciones'}</p>
        </div>
        <div class="avatar" style="background:${pal.bg}; color:${pal.fg};" onclick="goToProfiles()">
          ${escapeHtml(profile.name).charAt(0).toUpperCase()}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:14px; margin-top:6px; flex-wrap:wrap;">
        ${streak >= 2 ? `<div class="streak-chip">🔥 ${streak} semanas de racha</div>` : ''}
        <span onclick="openFullGlossary()" style="color:var(--primary); font-weight:600; font-size:13px; cursor:pointer;">📖 Glosario</span>
      </div>
    </div>`;

  if (measurements.length === 0) {
    html += `
      <div class="empty-state">
        <div class="icon">⚖️</div>
        <h3>Empieza tu seguimiento</h3>
        <p>Agrega los datos de tu báscula y la app calculará tus avances semana tras semana.</p>
        <button class="btn btn-filled" onclick="openAddMeasurementSheet()">Registrar primera medición</button>
        <button class="btn btn-text" onclick="loadDemoData()">Cargar datos de ejemplo (demo)</button>
      </div>`;
    return html;
  }

  let deltaHtml = '';
  if (prev) {
    const delta = last.weightKg - prev.weightKg;
    const status = deltaStatus(delta, !lowerIsBetter);
    const cls = status === 'good' ? 'delta-good' : status === 'bad' ? 'delta-bad' : 'delta-neutral';
    const arrow = Math.abs(delta) < 0.05 ? '→' : (delta < 0 ? '▼' : '▲');
    deltaHtml = `<div class="delta-chip ${cls}">${arrow} ${fmtDelta(delta)} kg</div>`;
  }

  let pillsHtml = '';
  if (profile.heightCm) {
    const b = calcBMI(last.weightKg, profile.heightCm);
    pillsHtml += `<div class="pill" onclick="openGlossaryModal('bmi')" style="cursor:pointer;">IMC ${fmt1(b)} · ${bmiCategory(b)} ⓘ</div>`;
  }
  const icc = waistHipRatio(last.waistCm, last.hipCm);
  if (icc) pillsHtml += `<div class="pill" onclick="openGlossaryModal('icc')" style="cursor:pointer;">ICC ${fmt2(icc)} ⓘ</div>`;

  let goalHtml = '';
  if (profile.goalWeightKg && measurements.length >= 2) {
    const start = measurements[0].weightKg;
    const goal = profile.goalWeightKg;
    const total = Math.abs(start - goal);
    const done = Math.min(Math.max(total - Math.abs(last.weightKg - goal), 0), total);
    const frac = total <= 0.01 ? 1 : done / total;
    goalHtml = `
      <div class="goal-box">
        <div class="goal-top"><span>Meta: ${fmt1(goal)} kg</span><span>${Math.round(frac * 100)}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${frac * 100}%;"></div></div>
        <div class="goal-sub">Te faltan ${fmt1(Math.abs(last.weightKg - goal))} kg para llegar a tu meta</div>
      </div>`;
  }

  html += `
    <div class="hero">
      <div class="hero-top">
        <div>
          <div class="hero-label">PESO ACTUAL <span onclick="openGlossaryModal('weightKg')" style="cursor:pointer; opacity:0.75; font-size:11px;">ⓘ</span></div>
          <div class="hero-value"><span class="num">${fmt1(last.weightKg)}</span><span class="unit">kg</span></div>
          <div class="hero-date">Medido el ${formatDateShort(last.date)}</div>
        </div>
        ${deltaHtml}
      </div>
      <div class="pill-row">${pillsHtml}</div>
      ${goalHtml}
    </div>`;

  const insights = buildInsights(measurements, lowerIsBetter, profile);
  html += `
    <div class="card insight-box">
      <div class="insight-icon">💡</div>
      <div>${insights.map(line => `<p class="insight-line">${line}</p>`).join('')}</div>
    </div>`;

  const metrics = buildMiniMetrics(measurements);
  if (metrics.length) {
    html += `
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Resumen corporal</span>
        <span onclick="openGlossaryModal('percentNote')" style="font-size:12px; font-weight:500; color:var(--primary); cursor:pointer;">¿No suman 100%? ⓘ</span>
      </div>
      <div class="scroll-row">`;
    metrics.forEach(m => { html += renderMetricCard(m); });
    html += `</div>`;
  }
  return html;
}

function renderMetricCard(metric) {
  const values = metric.values;
  const current = values[values.length - 1];
  const delta = values.length >= 2 ? current - values[values.length - 2] : null;
  let deltaHtml = '';
  if (delta !== null) {
    const status = deltaStatus(delta, metric.higher);
    const color = status === 'good' ? 'var(--good)' : status === 'bad' ? 'var(--bad)' : 'var(--on-surface-variant)';
    const arrow = Math.abs(delta) < 0.05 ? '→' : (delta < 0 ? '▼' : '▲');
    const dtext = metric.dec === 0 ? fmt0(Math.abs(delta)) : fmt1(Math.abs(delta));
    deltaHtml = `<div class="metric-delta" style="color:${color};">${arrow} ${dtext}</div>`;
  }
  const valText = metric.dec === 0 ? fmt0(current) : fmt1(current);
  const sparkline = values.length >= 2 ? renderSparklineSVG(values.slice(-8)) : '';
  const hasGlossary = !!GLOSSARY[metric.key];
  return `
    <div class="metric-card">
      <div class="metric-label">
        ${metric.label}
        ${hasGlossary ? `<span onclick="event.stopPropagation(); openGlossaryModal('${metric.key}')" style="cursor:pointer; opacity:0.6; font-size:12px; margin-left:3px;">ⓘ</span>` : ''}
      </div>
      <div class="metric-value"><span class="n">${valText}</span>${metric.unit ? `<span class="u">${metric.unit}</span>` : ''}</div>
      ${deltaHtml}
      ${sparkline}
    </div>`;
}

function renderSparklineSVG(values) {
  const w = 140, h = 34, pad = 4;
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const stepX = values.length === 1 ? w / 2 : (w - 2 * pad) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(',');
  return `
    <svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${points.join(' ')}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="var(--primary)"/>
    </svg>`;
}

function loadDemoData() {
  const profile = Profiles.getById(State.profileId);
  const week = 7 * 24 * 60 * 60 * 1000;
  const start = Date.now() - 5 * week;
  const demo = [
    { w: 100.1, bf: 47.9, fm: 47.9, wat: 37.8, bmr: 1634, age: 36.8, mus: 33.9, waist: 106, hip: 118 },
    { w: 98.4, bf: 47.1, fm: 46.4, wat: 38.1, bmr: 1638, age: 36, mus: 34.2, waist: 104.5, hip: 117.4 },
    { w: 97.2, bf: 46.4, fm: 45.1, wat: 38.5, bmr: 1641, age: 35, mus: 34.6, waist: 103, hip: 116.8 },
    { w: 96.0, bf: 45.6, fm: 43.8, wat: 38.9, bmr: 1645, age: 34, mus: 35.0, waist: 101.8, hip: 116.1 },
    { w: 95.1, bf: 45.0, fm: 42.8, wat: 39.2, bmr: 1648, age: 34, mus: 35.3, waist: 100.9, hip: 115.5 },
    { w: 94.3, bf: 44.4, fm: 41.9, wat: 39.5, bmr: 1651, age: 33, mus: 35.6, waist: 99.7, hip: 114.9 }
  ];
  demo.forEach((d, i) => {
    Measurements.create(profile.id, {
      date: start + i * week, weightKg: d.w, bodyFatPct: d.bf, fatMassKg: d.fm,
      waterPct: d.wat, bmrKcal: d.bmr, metabolicAge: d.age, skeletalMusclePct: d.mus,
      waistCm: d.waist, hipCm: d.hip
    });
  });
  toast('✅ Datos de ejemplo cargados');
  render();
}

/* ================= FORM: MEDICIÓN ================= */
function openAddMeasurementSheet() {
  State.editingMeasurementId = null;
  State.tempPhoto = null;
  renderMeasurementForm(null);
}
function openEditMeasurementSheet(id) {
  const m = Measurements.getByProfile(State.profileId).find(x => x.id === id);
  State.editingMeasurementId = id;
  State.tempPhoto = m ? m.photo : null;
  renderMeasurementForm(m);
}

function renderMeasurementForm(m) {
  const isEdit = !!m;
  const dateVal = toInputDate(isEdit ? m.date : Date.now());
  const val = (v) => (v != null ? v : '');
  const html = `
    <div class="sheet-handle"></div>
    <h2>${isEdit ? 'Editar medición' : 'Nueva medición'}</h2>
    <p class="sheet-sub">Ingresa los datos de tu báscula</p>
    <div class="field"><label>Fecha</label><input type="date" id="m_date" value="${dateVal}"></div>
    <div class="field"><label>Peso (kg) *</label><input type="number" step="0.1" id="m_weight" value="${val(isEdit ? m.weightKg : '')}" placeholder="Ej. 70.5"></div>

    <div class="collapsible-header" onclick="toggleCollapsible('body_comp')">
      <span>📊 Composición corporal (opcional)</span><span id="body_comp_arrow">▾</span>
    </div>
    <div class="collapsible-body" id="body_comp">
      <div class="field-row">
        <div class="field"><label>% Grasa</label><input type="number" step="0.1" id="m_bf" value="${val(isEdit ? m.bodyFatPct : '')}"></div>
        <div class="field"><label>Masa grasa (kg)</label><input type="number" step="0.1" id="m_fm" value="${val(isEdit ? m.fatMassKg : '')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Masa magra (kg)</label><input type="number" step="0.1" id="m_lean" value="${val(isEdit ? m.leanMassKg : '')}"></div>
        <div class="field"><label>% Músculo esquelético</label><input type="number" step="0.1" id="m_mus" value="${val(isEdit ? m.skeletalMusclePct : '')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>% Agua corporal</label><input type="number" step="0.1" id="m_water" value="${val(isEdit ? m.waterPct : '')}"></div>
        <div class="field"><label>Masa ósea (kg)</label><input type="number" step="0.1" id="m_bone" value="${val(isEdit ? m.boneMassKg : '')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Metabolismo basal (kcal)</label><input type="number" id="m_bmr" value="${val(isEdit ? m.bmrKcal : '')}"></div>
        <div class="field"><label>Edad metabólica</label><input type="number" id="m_age" value="${val(isEdit ? m.metabolicAge : '')}"></div>
      </div>
      <div class="field"><label>Grasa visceral (1-20)</label><input type="number" id="m_visc" value="${val(isEdit ? m.visceralFat : '')}"></div>
    </div>

    <div class="collapsible-header" onclick="toggleCollapsible('perimeters')">
      <span>📏 Perímetros corporales (opcional)</span><span id="perimeters_arrow">▾</span>
    </div>
    <div class="collapsible-body" id="perimeters">
      <div class="field-row">
        <div class="field"><label>Cintura (cm)</label><input type="number" step="0.1" id="m_waist" value="${val(isEdit ? m.waistCm : '')}"></div>
        <div class="field"><label>Cadera (cm)</label><input type="number" step="0.1" id="m_hip" value="${val(isEdit ? m.hipCm : '')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Brazo (cm)</label><input type="number" step="0.1" id="m_arm" value="${val(isEdit ? m.armCm : '')}"></div>
        <div class="field"><label>Muslo (cm)</label><input type="number" step="0.1" id="m_thigh" value="${val(isEdit ? m.thighCm : '')}"></div>
      </div>
      <div class="field"><label>Pecho (cm)</label><input type="number" step="0.1" id="m_chest" value="${val(isEdit ? m.chestCm : '')}"></div>
    </div>

    <div class="collapsible-header" onclick="toggleCollapsible('photo_sec')">
      <span>📸 Foto de progreso (opcional)</span><span id="photo_sec_arrow">▾</span>
    </div>
    <div class="collapsible-body" id="photo_sec">
      <div class="photo-drop" id="photo_drop_area">
        <span id="photo_drop_text">${State.tempPhoto ? 'Toca para cambiar la foto' : 'Toca para elegir una foto (cámara o galería)'}</span>
        <img id="photo_preview" src="${State.tempPhoto || ''}" style="${State.tempPhoto ? '' : 'display:none;'}">
        <input type="file" accept="image/*" id="m_photo_input" onchange="handlePhotoSelected(event)">
      </div>
    </div>

    <div class="field" style="margin-top:14px;">
      <label>Notas (opcional)</label>
      <textarea id="m_notes" rows="2" placeholder="Ej. Semana de viaje, poco sueño...">${isEdit && m.notes ? escapeHtml(m.notes) : ''}</textarea>
    </div>

    ${isEdit ? `<button class="btn btn-text" style="color:var(--error);" onclick="confirmDeleteMeasurement('${m.id}')">🗑 Eliminar medición</button>` : ''}
    <button class="btn btn-filled" onclick="saveMeasurementForm()">Guardar medición</button>
  `;
  openSheet(html);
}

async function handlePhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  toast('Procesando foto...');
  try {
    const dataUrl = await compressImage(file, 800, 0.7);
    State.tempPhoto = dataUrl;
    document.getElementById('photo_drop_text').textContent = 'Toca para cambiar la foto';
    const preview = document.getElementById('photo_preview');
    preview.src = dataUrl;
    preview.style.display = 'block';
  } catch (e) {
    toast('⚠️ No se pudo procesar la foto');
  }
}

function saveMeasurementForm() {
  const weight = parseFloat(document.getElementById('m_weight').value);
  if (!weight || weight <= 0) { toast('⚠️ El peso es obligatorio'); return; }
  const g = (id) => { const v = document.getElementById(id).value; return v === '' ? null : parseFloat(v); };
  const data = {
    date: fromInputDate(document.getElementById('m_date').value),
    weightKg: weight,
    bodyFatPct: g('m_bf'), fatMassKg: g('m_fm'), leanMassKg: g('m_lean'),
    skeletalMusclePct: g('m_mus'), waterPct: g('m_water'), boneMassKg: g('m_bone'),
    bmrKcal: g('m_bmr'), metabolicAge: g('m_age'), visceralFat: g('m_visc'),
    waistCm: g('m_waist'), hipCm: g('m_hip'), armCm: g('m_arm'),
    thighCm: g('m_thigh'), chestCm: g('m_chest'),
    notes: document.getElementById('m_notes').value.trim() || null,
    photo: State.tempPhoto
  };
  if (State.editingMeasurementId) {
    Measurements.update(State.profileId, State.editingMeasurementId, data);
    toast('✅ Medición actualizada');
  } else {
    Measurements.create(State.profileId, data);
    toast('✅ Medición guardada');
  }
  closeSheet();
  render();
}

function confirmDeleteMeasurement(id) {
  if (confirm('¿Eliminar esta medición?')) {
    Measurements.delete(State.profileId, id);
    closeSheet();
    render();
    toast('Medición eliminada');
  }
}

/* ================= TAB: HISTORIAL ================= */
function renderHistoryTab(profile, measurements) {
  let html = `
    <div class="header">
      <h1 class="greeting">Historial</h1>
      <p class="subtext">${measurements.length} ${measurements.length === 1 ? 'medición registrada' : 'mediciones registradas'}</p>
    </div>`;
  if (!measurements.length) {
    html += `<div class="empty-state"><div class="icon">📅</div><h3>Sin historial aún</h3><p>Tus mediciones aparecerán aquí en orden cronológico.</p></div>`;
    return html;
  }
  html += `<div style="padding:0 16px;"><button class="btn btn-tonal" style="width:100%;" onclick="exportPDF()">📄 Exportar reporte PDF</button></div>`;

  const lowerIsBetter = isLowerBetter(profile, measurements);
  const reversed = measurements.slice().reverse();
  html += `<div style="padding:12px 16px 0;">`;
  reversed.forEach((m, idx) => {
    const originalIdx = measurements.length - 1 - idx;
    const prevM = measurements[originalIdx - 1];
    let deltaBadge = '';
    if (prevM) {
      const d = m.weightKg - prevM.weightKg;
      const status = deltaStatus(d, !lowerIsBetter);
      const color = status === 'good' ? 'var(--good)' : status === 'bad' ? 'var(--bad)' : 'var(--on-surface-variant)';
      const arrow = Math.abs(d) < 0.05 ? '→' : (d < 0 ? '▼' : '▲');
      deltaBadge = `<span style="color:${color}; font-size:12px; font-weight:700;">${arrow} ${fmtDelta(d)} kg</span>`;
    }
    html += `
      <div class="card" style="margin:0 0 12px; cursor:pointer;" onclick="openEditMeasurementSheet('${m.id}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; font-size:15px;">${formatDateLong(m.date)}</div>
            <div style="font-size:13px; color:var(--on-surface-variant); margin-top:2px;">
              ${fmt1(m.weightKg)} kg${m.bodyFatPct != null ? ' · ' + fmt1(m.bodyFatPct) + '% grasa' : ''}
            </div>
          </div>
          <div style="text-align:right;">
            ${deltaBadge}
            ${m.photo ? '<div style="font-size:18px; margin-top:4px;">📸</div>' : ''}
          </div>
        </div>
      </div>`;
  });
  html += `</div>`;
  return html;
}

function exportPDF() {
  const profile = Profiles.getById(State.profileId);
  const measurements = Measurements.getByProfile(State.profileId);
  exportProfilePDF(profile, measurements);
}

/* ================= TAB: PROGRESO (gráficas) ================= */
function renderProgressTab(profile, measurements) {
  let html = `
    <div class="header">
      <h1 class="greeting">Progreso</h1>
      <p class="subtext">Comparativa semana por semana</p>
    </div>`;
  if (measurements.length < 2) {
    html += `<div class="empty-state"><div class="icon">📈</div><h3>Necesitas al menos 2 mediciones</h3><p>Registra una segunda medición para ver tu evolución en gráficas.</p></div>`;
    return html;
  }

  html += `
    <div style="padding:0 16px;">
      <div class="segmented">
        <button type="button" class="${State.range === '4w' ? 'sel' : ''}" onclick="setRange('4w')">4 semanas</button>
        <button type="button" class="${State.range === '3m' ? 'sel' : ''}" onclick="setRange('3m')">3 meses</button>
        <button type="button" class="${State.range === 'all' ? 'sel' : ''}" onclick="setRange('all')">Todo</button>
      </div>
    </div>
    <div class="card">
      <div style="font-weight:700; margin-bottom:10px;">⚖️ Evolución de peso</div>
      <canvas id="chartWeight" height="200"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700; margin-bottom:10px;">🧬 Composición corporal</div>
      <canvas id="chartComposition" height="200"></canvas>
    </div>`;

  const withPhotos = measurements.filter(m => m.photo);
  if (withPhotos.length >= 2) html += renderPhotoCompareSection(withPhotos);

  return html;
}

function setRange(range) { State.range = range; render(); }

function filterByRange(measurements) {
  if (State.range === 'all') return measurements;
  const days = State.range === '4w' ? 28 : 90;
  const cutoff = Date.now() - days * 86400000;
  const filtered = measurements.filter(m => m.date >= cutoff);
  return filtered.length >= 2 ? filtered : measurements;
}

function initProgressCharts(profile, measurements) {
  const filtered = filterByRange(measurements);
  if (filtered.length < 2) return;
  const labels = filtered.map(m => formatDateShort(m.date));
  const weights = filtered.map(m => m.weightKg);

  if (chartInstances.weight) chartInstances.weight.destroy();
  const ctxW = document.getElementById('chartWeight');
  if (ctxW) {
    const gradient = ctxW.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(62,107,92,0.35)');
    gradient.addColorStop(1, 'rgba(62,107,92,0)');
    const datasets = [{
      label: 'Peso (kg)', data: weights, borderColor: '#3E6B5C', backgroundColor: gradient,
      fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#3E6B5C', pointHoverRadius: 6
    }];
    if (profile.goalWeightKg) {
      datasets.push({ label: 'Meta', data: labels.map(() => profile.goalWeightKg), borderColor: '#C9A875', borderDash: [6, 6], pointRadius: 0, fill: false });
    }
    chartInstances.weight = new Chart(ctxW, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { display: !!profile.goalWeightKg, position: 'bottom' } },
        scales: { y: { grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
      }
    });
  }

  if (chartInstances.comp) chartInstances.comp.destroy();
  const ctxC = document.getElementById('chartComposition');
  const hasFat = filtered.some(m => m.fatMassKg != null);
  const hasLean = filtered.some(m => m.leanMassKg != null);
  if (ctxC && (hasFat || hasLean)) {
    const datasets = [];
    if (hasFat) datasets.push({ label: 'Masa grasa (kg)', data: filtered.map(m => m.fatMassKg), backgroundColor: '#EBBF94' });
    if (hasLean) datasets.push({ label: 'Masa magra (kg)', data: filtered.map(m => m.leanMassKg), backgroundColor: '#A6D0BE' });
    chartInstances.comp = new Chart(ctxC, {
      type: 'bar', data: { labels, datasets },
      options: {
        responsive: true, plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' } } }
      }
    });
  } else if (ctxC) {
    ctxC.parentElement.innerHTML = '<div style="font-weight:700; margin-bottom:10px;">🧬 Composición corporal</div><p style="color:var(--on-surface-variant); font-size:13px;">Registra % grasa/músculo en tus mediciones para ver este gráfico.</p>';
  }
}

/* ================= COMPARADOR DE FOTOS ================= */
function renderPhotoCompareSection(withPhotos) {
  State.comparePhotos = withPhotos;
  const lastIdx = withPhotos.length - 1;
  const optBefore = withPhotos.map((m, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${formatDateShort(m.date)}</option>`).join('');
  const optAfter = withPhotos.map((m, i) => `<option value="${i}" ${i === lastIdx ? 'selected' : ''}>${formatDateShort(m.date)}</option>`).join('');
  return `
    <div class="card">
      <div style="font-weight:700; margin-bottom:10px;">📸 Comparar fotos</div>
      <div class="field-row">
        <div class="field"><label>Antes</label><select id="photo_before" onchange="updatePhotoCompare()">${optBefore}</select></div>
        <div class="field"><label>Después</label><select id="photo_after" onchange="updatePhotoCompare()">${optAfter}</select></div>
      </div>
      <div style="position:relative; width:100%; border-radius:16px; overflow:hidden; aspect-ratio:1/1; background:var(--surface-variant);">
        <img id="photo_img_after" src="${withPhotos[lastIdx].photo}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
        <img id="photo_img_before" src="${withPhotos[0].photo}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; clip-path:inset(0 50% 0 0);">
        <div id="photo_divider" style="position:absolute; top:0; bottom:0; left:50%; width:3px; background:white; box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>
      </div>
      <input type="range" min="0" max="100" value="50" id="photo_slider" style="width:100%; margin-top:10px;" oninput="movePhotoSlider(this.value)">
    </div>`;
}

function updatePhotoCompare() {
  const bIdx = parseInt(document.getElementById('photo_before').value);
  const aIdx = parseInt(document.getElementById('photo_after').value);
  document.getElementById('photo_img_before').src = State.comparePhotos[bIdx].photo;
  document.getElementById('photo_img_after').src = State.comparePhotos[aIdx].photo;
}

function movePhotoSlider(val) {
  document.getElementById('photo_img_before').style.clipPath = `inset(0 ${100 - val}% 0 0)`;
  document.getElementById('photo_divider').style.left = val + '%';
}

/* ================= BOOTSTRAP ================= */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('overlay').addEventListener('click', (e) => {
    if (e.target.id === 'overlay') closeSheet();
  });
  const activeId = getActiveProfileId();
  if (activeId && Profiles.getById(activeId)) {
    State.profileId = activeId;
    State.screen = 'main';
  } else {
    State.screen = 'profiles';
  }
  render();
});
