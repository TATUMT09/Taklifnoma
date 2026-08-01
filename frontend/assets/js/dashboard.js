(async function () {
  const user = await requireAuthOrRedirect();
  if (!user) return;

  const listEl = document.getElementById('dash-list');
  const countEl = document.getElementById('dash-count');

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
          <button class="btn btn-danger-ghost btn-sm" data-delete="${inv.id}">O'chirish</button>
        </div>
      </div>
    `;
  }

  load();
})();
