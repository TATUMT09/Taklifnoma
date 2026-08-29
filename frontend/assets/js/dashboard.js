(async function () {
  const user = await requireAuthOrRedirect();
  if (!user) return;

  const listEl = document.getElementById('dash-list');
  const countEl = document.getElementById('dash-count');
  const membershipEl = document.getElementById('premium-membership-card');

  async function loadMembership() {
    if (!membershipEl) return;
    let info;
    try {
      info = await api.getMembershipStatus();
    } catch (e) {
      return;
    }

    if (info.is_premium) {
      membershipEl.innerHTML = `
        <div class="panel panel-pad" style="display:flex;align-items:center;gap:0.9rem;">
          <span style="font-size:1.6rem;">💎</span>
          <div>
            <p class="display" style="font-size:1.05rem;margin:0;">Siz Premium a'zosiz</p>
            <p style="margin:0.2rem 0 0;color:var(--text-dim);font-size:0.88rem;">Barcha Premium andozalar, Galereya va video xotira QR funksiyasi ochiq.</p>
          </div>
        </div>`;
      return;
    }

    if (info.status === 'pending') {
      membershipEl.innerHTML = `
        <div class="panel panel-pad" style="display:flex;align-items:center;gap:0.9rem;">
          <span style="font-size:1.6rem;">⏳</span>
          <div>
            <p class="display" style="font-size:1.05rem;margin:0;">Premium a'zolik to'lovi ko'rib chiqilmoqda</p>
            <p style="margin:0.2rem 0 0;color:var(--text-dim);font-size:0.88rem;">Tasdiqlangach shu sahifa avtomatik yangilanadi.</p>
          </div>
        </div>`;
      return;
    }

    membershipEl.innerHTML = `
      <div class="panel panel-pad">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div>
            <p class="display" style="font-size:1.15rem;margin:0 0 0.4rem;">💎 Premium a'zo bo'ling</p>
            <ul style="margin:0 0 0.9rem;padding-left:1.1rem;color:var(--text-dim);font-size:0.9rem;line-height:1.7;">
              <li>Shohona va Sevgi izhori andozalaridan cheksiz, to'lovsiz foydalanish</li>
              <li>Galereya — ilhom rasmlari to'plamiga to'liq kirish</li>
              <li>QR kod vositasida video xotira funksiyasi</li>
            </ul>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="membership-pay-btn" style="flex-shrink:0;">${Number(info.amount).toLocaleString('uz-UZ')} so'm — a'zo bo'lish</button>
        </div>
        <div id="membership-pay-form-wrap" hidden style="margin-top:1.2rem;padding-top:1.2rem;border-top:1px solid var(--line);">
          <div style="background:linear-gradient(135deg,#7C3AED,#EC4899);border-radius:14px;padding:1rem 1.2rem;margin-bottom:1rem;color:#fff;max-width:360px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.6rem;margin-bottom:0.4rem;">
              <div style="font-weight:700;letter-spacing:0.03em;word-break:break-word;">${escapeHtml(info.card_number)}</div>
            </div>
            <div style="font-size:0.85rem;opacity:0.85;">${escapeHtml(info.card_holder)}</div>
          </div>
          <label class="field" style="max-width:360px;">
            <span>To'lov skrinshotini yuklang</span>
            <input type="file" id="membership-pay-file" accept="image/png,image/jpeg,image/webp" />
          </label>
          <p class="field-hint" id="membership-pay-status"></p>
          <button type="button" class="btn btn-primary btn-sm" id="membership-pay-submit" disabled>Yuborish</button>
        </div>
      </div>`;

    document.getElementById('membership-pay-btn').addEventListener('click', () => {
      document.getElementById('membership-pay-form-wrap').hidden = false;
    });

    let uploadedUrl = '';
    const fileInput = document.getElementById('membership-pay-file');
    const statusEl = document.getElementById('membership-pay-status');
    const submitBtn = document.getElementById('membership-pay-submit');

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = 'Yuklanmoqda...';
      try {
        const { url } = await api.uploadPhoto(file);
        uploadedUrl = url;
        statusEl.textContent = "Skrinshot yuklandi ✓";
        submitBtn.disabled = false;
      } catch (e) {
        statusEl.textContent = e.message;
      }
    });

    submitBtn.addEventListener('click', async () => {
      if (!uploadedUrl) return;
      submitBtn.disabled = true;
      try {
        await api.submitMembershipPayment(uploadedUrl);
        loadMembership();
      } catch (e) {
        statusEl.textContent = e.message;
        submitBtn.disabled = false;
      }
    });
  }

  async function load() {
    let invitations = [];
    try {
      const data = await api.listInvitations();
      invitations = data.invitations;
    } catch (e) {
      listEl.innerHTML = `<div class="empty-state">Yuklashda xatolik: ${escapeHtml(e.message)}</div>`;
      return;
    }

    countEl.textContent = invitations.length
      ? `${invitations.length} ta taklifnoma`
      : '';

    if (!invitations.length) {
      listEl.innerHTML = `
        <div class="empty-state panel panel-pad">
          <p class="display" style="font-size:1.3rem;">Hali taklifnomangiz yo'q</p>
          <p>Birinchi raqamli taklifnomangizni bir necha daqiqada yarating.</p>
          <a href="/create" class="btn btn-primary">+ Yangi taklifnoma</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = invitations.map(cardHtml).join('');

    listEl.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = `${window.location.origin}/i/${btn.getAttribute('data-copy')}`;
        navigator.clipboard.writeText(url).then(
          () => showToast('Havola nusxalandi'),
          () => showToast("Nusxalab bo'lmadi", true)
        );
      });
    });

    listEl.querySelectorAll('[data-qr]').forEach((btn) => {
      btn.addEventListener('click', () => showQrModal(btn.getAttribute('data-qr')));
    });

    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete');
        const card = btn.closest('.inv-card');
        const names = card.querySelector('.inv-names').textContent;
        if (!window.confirm(`"${names}" taklifnomasini o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.`)) return;
        try {
          await api.deleteInvitation(id);
          showToast("Taklifnoma o'chirildi");
          load();
        } catch (e) {
          showToast(e.message, true);
        }
      });
    });
  }

  function cardHtml(inv) {
    const names = inv.bride_name
      ? `${escapeHtml(inv.groom_name || '—')} va ${escapeHtml(inv.bride_name)}`
      : escapeHtml(inv.groom_name || '—');
    const dateLabel = inv.event_date ? formatUzDateLong(inv.event_date) : "Sana kiritilmagan";
    return `
      <div class="panel inv-card">
        <div class="inv-top">
          <div>
            <div class="inv-names">${names}</div>
            <div class="inv-meta">${escapeHtml(EVENT_TYPE_LABELS[inv.event_type] || '')} · ${escapeHtml(dateLabel)}</div>
          </div>
          <span class="inv-badge">${escapeHtml(THEME_LABELS[inv.theme] || inv.theme)}</span>
        </div>
        <div class="inv-stats">
          <div class="inv-stat"><b>${inv.stats.views}</b><span>Ko'rishlar</span></div>
          <div class="inv-stat"><b>${inv.stats.guests}</b><span>Mehmonlar</span></div>
          <div class="inv-stat"><b>${inv.stats.wishes}</b><span>Tilaklar</span></div>
          <div class="inv-stat"><b>${inv.stats.responses}</b><span>Javoblar</span></div>
        </div>
        <div class="inv-actions">
          <a href="/i/${inv.slug}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ko'rish</a>
          <button class="btn btn-outline btn-sm" data-copy="${inv.slug}">Havolani nusxalash</button>
          <a href="/edit?id=${inv.id}" class="btn btn-outline btn-sm">Tahrirlash</a>
          <button class="btn btn-outline btn-sm" data-qr="${inv.slug}">QR kod</button>
          <button class="btn btn-danger-ghost btn-sm" data-delete="${inv.id}">O'chirish</button>
        </div>
      </div>
    `;
  }

  const qrModal = document.getElementById('qr-modal');
  const qrCanvasWrap = document.getElementById('qr-modal-canvas');
  const qrDownloadLink = document.getElementById('qr-download-link');

  function showQrModal(slug) {
    const url = `${window.location.origin}/i/${slug}`;
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const dataUrl = qr.createDataURL(8, 8);
    qrCanvasWrap.innerHTML = `<img src="${dataUrl}" alt="QR kod" style="width:220px;height:220px;display:block;margin:0 auto;border-radius:8px;" />`;
    qrDownloadLink.href = dataUrl;
    qrModal.hidden = false;
  }

  document.getElementById('qr-modal-close').addEventListener('click', () => { qrModal.hidden = true; });
  qrModal.addEventListener('click', (e) => { if (e.target === qrModal) qrModal.hidden = true; });

  load();
  loadMembership();
})();
