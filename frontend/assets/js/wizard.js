(async function () {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');
  const isEdit = !!editId;

  if (isEdit) {
    const user = await requireAuthOrRedirect();
    if (!user) return;
  }

  const form = document.getElementById('wizard-form');
  const steps = Array.from(document.querySelectorAll('.wizard-step'));
  const bars = Array.from(document.querySelectorAll('[data-step-bar]'));
  const backBtn = document.getElementById('back-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const errEl = document.getElementById('form-error');

  const state = {
    event_type: EVENT_CATEGORIES.some((c) => c.id === params.get('event_type')) ? params.get('event_type') : 'toy',
    theme: THEME_META.some((t) => t.id === params.get('theme')) ? params.get('theme') : 'zumrad',
    layout: LAYOUT_META.some((l) => l.id === params.get('layout')) ? params.get('layout') : 'nafis',
    photo_url: '',
    song_url: ''
  };

  const brideField = document.getElementById('bride-field');
  const dateLabel = document.getElementById('date-label');
  const messageLabel = document.getElementById('message-label');
  const messageInput = document.getElementById('custom_message');
  const themeChoicesEl = document.getElementById('theme-choices');

  function renderThemeChoices(categoryId) {
    const cat = getEventCategory(categoryId);
    const allowed = getThemesForCategory(categoryId);
    if (!allowed.some((t) => t.id === state.theme)) state.theme = allowed[0].id;

    themeChoicesEl.innerHTML = allowed.map((t) => `
      <button type="button" class="tpl-pick-card${t.id === state.theme ? ' active' : ''}" data-value="${t.id}">
        <span class="tpl-pick-preview">
          <span class="tpl-mock tpl-mock-nafis" style="--mi:${t.mi};--mg:${t.mg};">
            <span class="tm-eyebrow">Taklifnoma</span>
            <span class="tm-name">Aziz${cat.pair ? ' &amp; Malika' : ''}</span>
          </span>
        </span>
        <span class="tpl-pick-text"><b>${t.name}</b><br/><small>${t.desc}</small></span>
      </button>
    `).join('');

    themeChoicesEl.querySelectorAll('.tpl-pick-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        themeChoicesEl.querySelectorAll('.tpl-pick-card').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.theme = btn.getAttribute('data-value');
      });
    });
  }

  function applyCategory(id) {
    const cat = getEventCategory(id);
    brideField.hidden = !cat.pair;
    dateLabel.textContent = cat.dateLabel;
    messageLabel.textContent = cat.msgLabel;
    messageInput.placeholder = cat.msgPlaceholder;
    renderThemeChoices(id);

    const dedicatedLayout = LAYOUT_META.find((l) => l.categories && l.categories.includes(id));
    if (dedicatedLayout) {
      state.layout = dedicatedLayout.id;
    } else if (!LAYOUT_META.some((l) => l.id === state.layout && l.categories === null)) {
      state.layout = 'nafis';
    }
  }
  let current = 1;
  const total = steps.length;

  const photoInput = document.getElementById('photo_input');
  const photoStatus = document.getElementById('photo-status');
  const photoPreviewWrap = document.getElementById('photo-preview-wrap');
  const photoPreview = document.getElementById('photo-preview');

  function showPhotoPreview(url) {
    photoPreview.src = url;
    photoPreviewWrap.hidden = false;
  }

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    if (!file) return;
    photoStatus.textContent = 'Yuklanmoqda...';
    try {
      const { url } = await api.uploadPhoto(file);
      state.photo_url = url;
      showPhotoPreview(url);
      photoStatus.textContent = '';
    } catch (err) {
      photoStatus.textContent = err.message;
      photoInput.value = '';
    }
  });

  document.getElementById('photo-remove-btn').addEventListener('click', () => {
    state.photo_url = '';
    photoInput.value = '';
    photoPreviewWrap.hidden = true;
    photoStatus.textContent = '';
  });

  const songInput = document.getElementById('song_input');
  const songStatus = document.getElementById('song-status');
  const songPreviewWrap = document.getElementById('song-preview-wrap');
  const songPreviewName = document.getElementById('song-preview-name');

  function showSongPreview(name) {
    songPreviewName.textContent = name || "Qo'shiq yuklandi";
    songPreviewWrap.hidden = false;
  }

  songInput.addEventListener('change', async () => {
    const file = songInput.files[0];
    if (!file) return;
    songStatus.textContent = 'Yuklanmoqda...';
    try {
      const { url } = await api.uploadSong(file);
      state.song_url = url;
      showSongPreview(file.name);
      songStatus.textContent = '';
    } catch (err) {
      songStatus.textContent = err.message;
      songInput.value = '';
    }
  });

  document.getElementById('song-remove-btn').addEventListener('click', () => {
    state.song_url = '';
    songInput.value = '';
    songPreviewWrap.hidden = true;
    songStatus.textContent = '';
  });

  const mapToggleBtn = document.getElementById('map-picker-toggle');
  const mapPickerWrap = document.getElementById('map-picker-wrap');
  const mapSearchInput = document.getElementById('map-search');
  let leafletMap = null;
  let leafletMarker = null;

  function setMapMarker(lat, lng) {
    if (leafletMarker) {
      leafletMarker.setLatLng([lat, lng]);
    } else {
      leafletMarker = L.marker([lat, lng]).addTo(leafletMap);
    }
    document.getElementById('map_link').value = `https://www.google.com/maps?q=${lat},${lng}`;
  }

  function initMapPicker() {
    if (leafletMap) return;
    leafletMap = L.map('map-picker').setView([41.311081, 69.240562], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(leafletMap);
    leafletMap.on('click', (e) => setMapMarker(e.latlng.lat, e.latlng.lng));

    let searchTimer;
    mapSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = mapSearchInput.value.trim();
      if (!q) return;
      searchTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
          const { results } = await res.json();
          if (!results || !results[0]) return;
          const { lat, lon, display_name } = results[0];
          leafletMap.setView([lat, lon], 16);
          setMapMarker(lat, lon);
          const addressField = document.getElementById('address');
          if (!addressField.value.trim()) addressField.value = display_name;
        } catch (e) { /* search best-effort, ignore network errors */ }
      }, 600);
    });
  }

  if (mapToggleBtn) {
    mapToggleBtn.addEventListener('click', () => {
      mapPickerWrap.hidden = !mapPickerWrap.hidden;
      if (!mapPickerWrap.hidden) {
        initMapPicker();
        setTimeout(() => leafletMap.invalidateSize(), 80);
      }
    });
  }

  document.querySelectorAll('[data-choice="event_type"] button').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-value') === state.event_type);
  });
  applyCategory(state.event_type);

  document.querySelectorAll('[data-choice]').forEach((group) => {
    const key = group.getAttribute('data-choice');
    if (key === 'theme') return; // theme buttons are generated + wired by renderThemeChoices
    group.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state[key] = btn.getAttribute('data-value');
        if (key === 'event_type') applyCategory(state.event_type);
      });
    });
  });

  function renderStep() {
    steps.forEach((s) => { s.hidden = Number(s.getAttribute('data-step')) !== current; });
    bars.forEach((b) => {
      const n = Number(b.getAttribute('data-step-bar'));
      b.classList.toggle('done', n < current);
      b.classList.toggle('active', n === current);
    });
    backBtn.hidden = current === 1;
    nextBtn.hidden = current === total;
    submitBtn.hidden = current !== total;
  }

  function fieldsForStep(n) {
    return Array.from(steps[n - 1].querySelectorAll('input, textarea')).filter((el) => el.hasAttribute('required'));
  }

  nextBtn.addEventListener('click', () => {
    const required = fieldsForStep(current);
    for (const el of required) {
      if (!el.value.trim()) {
        errEl.textContent = 'Iltimos, majburiy maydonlarni to\'ldiring';
        el.focus();
        return;
      }
    }
    errEl.textContent = '';
    current = Math.min(total, current + 1);
    renderStep();
  });

  backBtn.addEventListener('click', () => {
    current = Math.max(1, current - 1);
    renderStep();
  });

  function collectPayload() {
    return {
      event_type: state.event_type,
      theme: state.theme,
      groom_name: document.getElementById('groom_name').value,
      bride_name: document.getElementById('bride_name').value,
      family_name: document.getElementById('family_name').value,
      custom_message: document.getElementById('custom_message').value,
      event_date: document.getElementById('event_date').value,
      event_time: document.getElementById('event_time').value,
      venue_name: document.getElementById('venue_name').value,
      address: document.getElementById('address').value,
      map_link: document.getElementById('map_link').value,
      telegram_group: document.getElementById('telegram_group').value,
      photo_url: state.photo_url,
      song_url: state.song_url,
      layout: state.layout,
      language: 'uz'
    };
  }

  function fillForm(inv) {
    document.getElementById('groom_name').value = inv.groom_name || '';
    document.getElementById('bride_name').value = inv.bride_name || '';
    document.getElementById('family_name').value = inv.family_name || '';
    document.getElementById('custom_message').value = inv.custom_message || '';
    document.getElementById('event_date').value = inv.event_date || '';
    document.getElementById('event_time').value = inv.event_time || '';
    document.getElementById('venue_name').value = inv.venue_name || '';
    document.getElementById('address').value = inv.address || '';
    document.getElementById('map_link').value = inv.map_link || '';
    document.getElementById('telegram_group').value = inv.telegram_group || '';

    state.event_type = inv.event_type || 'toy';
    state.theme = inv.theme || 'zumrad';
    state.layout = inv.layout || 'nafis';
    state.photo_url = inv.photo_url || '';
    if (state.photo_url) showPhotoPreview(state.photo_url);
    state.song_url = inv.song_url || '';
    if (state.song_url) showSongPreview(state.song_url.split('/').pop());

    document.querySelectorAll('[data-choice="event_type"] button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-value') === state.event_type);
    });
    applyCategory(state.event_type);
  }

  if (isEdit) {
    try {
      const { invitation } = await api.getInvitation(editId);
      fillForm(invitation);
    } catch (e) {
      errEl.textContent = "Taklifnomani yuklab bo'lmadi: " + e.message;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = isEdit ? 'Saqlanmoqda...' : 'Yaratilmoqda...';
    try {
      const payload = collectPayload();
      if (isEdit) {
        await api.updateInvitation(editId, payload);
        window.location.href = '/dashboard';
      } else {
        try {
          const { invitation } = await api.createInvitation(payload);
          window.location.href = `/dashboard?created=${invitation.slug}`;
        } catch (err) {
          if (err.status === 401) {
            localStorage.setItem('tn_pending_invitation', JSON.stringify(payload));
            window.location.href = '/register?next=create';
            return;
          }
          throw err;
        }
      }
    } catch (err) {
      errEl.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  renderStep();
})();
