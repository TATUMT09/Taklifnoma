(async function () {
  const user = await requireAdminOrRedirect();
  if (!user) return;

  const statsEl = document.getElementById('admin-stats');
  const invBody = document.getElementById('invitations-body');
  const usersBody = document.getElementById('users-body');
  const messagesBody = document.getElementById('messages-body');

  async function loadStats() {
    try {
      const { stats } = await api.adminStats();
      statsEl.innerHTML = `
        <div class="panel admin-stat-card"><span class="admin-stat-num">${stats.users}</span><span class="admin-stat-label">Foydalanuvchilar</span></div>
        <div class="panel admin-stat-card"><span class="admin-stat-num">${stats.invitations}</span><span class="admin-stat-label">Taklifnomalar</span></div>
        <div class="panel admin-stat-card"><span class="admin-stat-num">${stats.rsvps}</span><span class="admin-stat-label">Jami javoblar</span></div>
        <div class="panel admin-stat-card"><span class="admin-stat-num">${stats.views}</span><span class="admin-stat-label">Jami ko'rishlar</span></div>
        <div class="panel admin-stat-card"><span class="admin-stat-num">${stats.unreadMessages}</span><span class="admin-stat-label">Yangi xabarlar</span></div>
      `;
    } catch (e) {
      statsEl.innerHTML = `<p class="field-error">${escapeHtml(e.message)}</p>`;
    }
  }

  async function loadInvitations() {
    invBody.innerHTML = `<tr><td colspan="8" class="skeleton-loading">Yuklanmoqda...</td></tr>`;
    try {
      const { invitations } = await api.adminInvitations();
      if (!invitations.length) {
        invBody.innerHTML = `<tr><td colspan="8" class="skeleton-loading">Hali taklifnoma yo'q</td></tr>`;
        return;
      }
      invBody.innerHTML = invitations.map((inv) => `
        <tr>
          <td><div class="cell-primary">${escapeHtml(inv.owner_name)}</div><div class="cell-sub">${escapeHtml(inv.owner_email)}</div></td>
          <td class="cell-primary">${escapeHtml(inv.groom_name)}${inv.bride_name ? ' va ' + escapeHtml(inv.bride_name) : ''}</td>
          <td>${escapeHtml(EVENT_TYPE_LABELS[inv.event_type] || inv.event_type)}</td>
          <td>${inv.event_date ? escapeHtml(formatUzDateLong(inv.event_date).split(' · ')[0]) : '—'}</td>
          <td>${escapeHtml(THEME_LABELS[inv.theme] || inv.theme)}</td>
          <td>${inv.views}</td>
          <td>${inv.responses}</td>
          <td>
            <div style="display:flex;gap:0.5rem;">
              <a href="/i/${inv.slug}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ko'rish</a>
              <button class="btn btn-danger-ghost btn-sm" data-del-inv="${inv.id}">O'chirish</button>
            </div>
          </td>
        </tr>
      `).join('');

      invBody.querySelectorAll('[data-del-inv]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm("Bu taklifnomani o'chirmoqchimisiz?")) return;
          try {
            await api.adminDeleteInvitation(btn.getAttribute('data-del-inv'));
            showToast("Taklifnoma o'chirildi");
            loadInvitations();
            loadStats();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
    } catch (e) {
      invBody.innerHTML = `<tr><td colspan="8" class="field-error">${escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function loadUsers() {
    usersBody.innerHTML = `<tr><td colspan="6" class="skeleton-loading">Yuklanmoqda...</td></tr>`;
    try {
      const { users } = await api.adminUsers();
      usersBody.innerHTML = users.map((u) => `
        <tr>
          <td class="cell-primary">${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${u.invitation_count}</td>
          <td class="cell-sub">${escapeHtml(u.created_at)}</td>
          <td>${u.is_admin ? '<span class="admin-badge">Admin</span>' : ''}</td>
          <td>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-outline btn-sm" data-reset-user="${u.id}">Parolni yangilash</button>
              ${u.id === user.id ? '' : `<button class="btn btn-danger-ghost btn-sm" data-del-user="${u.id}">O'chirish</button>`}
            </div>
          </td>
        </tr>
      `).join('');

      usersBody.querySelectorAll('[data-reset-user]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const password = window.prompt("Yangi parolni kiriting (kamida 6 belgi):");
          if (password === null) return;
          if (password.length < 6) { showToast("Parol kamida 6 belgidan iborat bo'lsin", true); return; }
          try {
            await api.adminResetPassword(btn.getAttribute('data-reset-user'), password);
            showToast('Parol yangilandi');
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });

      usersBody.querySelectorAll('[data-del-user]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm("Bu foydalanuvchi va uning barcha taklifnomalarini o'chirmoqchimisiz?")) return;
          try {
            await api.adminDeleteUser(btn.getAttribute('data-del-user'));
            showToast("Foydalanuvchi o'chirildi");
            loadUsers();
            loadStats();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
    } catch (e) {
      usersBody.innerHTML = `<tr><td colspan="6" class="field-error">${escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function loadMessages() {
    messagesBody.innerHTML = `<tr><td colspan="5" class="skeleton-loading">Yuklanmoqda...</td></tr>`;
    try {
      const { messages } = await api.adminMessages();
      if (!messages.length) {
        messagesBody.innerHTML = `<tr><td colspan="5" class="skeleton-loading">Hali xabar yo'q</td></tr>`;
        return;
      }
      messagesBody.innerHTML = messages.map((m) => `
        <tr${m.is_read ? '' : ' style="font-weight:600;"'}>
          <td class="cell-primary">${escapeHtml(m.name || '—')}</td>
          <td>${escapeHtml(m.contact || '—')}</td>
          <td style="max-width:360px;white-space:pre-wrap;">${escapeHtml(m.message)}</td>
          <td class="cell-sub">${escapeHtml(m.created_at)}</td>
          <td>
            <div style="display:flex;gap:0.5rem;">
              ${m.is_read ? '' : `<button class="btn btn-outline btn-sm" data-read-msg="${m.id}">O'qildi</button>`}
              <button class="btn btn-danger-ghost btn-sm" data-del-msg="${m.id}">O'chirish</button>
            </div>
          </td>
        </tr>
      `).join('');

      messagesBody.querySelectorAll('[data-read-msg]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api.adminMarkMessageRead(btn.getAttribute('data-read-msg'));
            loadMessages();
            loadStats();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
      messagesBody.querySelectorAll('[data-del-msg]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm("Bu xabarni o'chirmoqchimisiz?")) return;
          try {
            await api.adminDeleteMessage(btn.getAttribute('data-del-msg'));
            showToast("Xabar o'chirildi");
            loadMessages();
            loadStats();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
    } catch (e) {
      messagesBody.innerHTML = `<tr><td colspan="5" class="field-error">${escapeHtml(e.message)}</td></tr>`;
    }
  }

  document.querySelectorAll('.admin-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tabs button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      document.getElementById('tab-invitations').hidden = tab !== 'invitations';
      document.getElementById('tab-users').hidden = tab !== 'users';
      document.getElementById('tab-messages').hidden = tab !== 'messages';
      document.getElementById('tab-gallery').hidden = tab !== 'gallery';
      document.getElementById('tab-premium').hidden = tab !== 'premium';
    });
  });

  const PREMIUM_STATUS_LABELS = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };
  const premiumBody = document.getElementById('premium-body');

  async function loadPremiumPayments() {
    if (!premiumBody) return;
    premiumBody.innerHTML = `<tr><td colspan="7" class="skeleton-loading">Yuklanmoqda...</td></tr>`;
    try {
      const { payments } = await api.adminPremiumPayments();
      if (!payments.length) {
        premiumBody.innerHTML = `<tr><td colspan="7" class="skeleton-loading">Hali to'lov yo'q</td></tr>`;
        return;
      }
      premiumBody.innerHTML = payments.map((p) => `
        <tr>
          <td><div class="cell-primary">${escapeHtml(p.owner_name)}</div><div class="cell-sub">${escapeHtml(p.owner_email)}</div></td>
          <td class="cell-primary">${escapeHtml(p.groom_name)}${p.bride_name ? ' va ' + escapeHtml(p.bride_name) : ''}</td>
          <td>${Number(p.amount).toLocaleString('uz-UZ')} so'm</td>
          <td><a href="${p.screenshot_url}" target="_blank" rel="noopener"><img src="${p.screenshot_url}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" /></a></td>
          <td>${escapeHtml(PREMIUM_STATUS_LABELS[p.status] || p.status)}</td>
          <td class="cell-sub">${escapeHtml(p.created_at)}</td>
          <td>
            ${p.status === 'pending' ? `
              <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-primary btn-sm" data-approve-pay="${p.id}">Tasdiqlash</button>
                <button class="btn btn-danger-ghost btn-sm" data-reject-pay="${p.id}">Rad etish</button>
              </div>
            ` : ''}
          </td>
        </tr>
      `).join('');

      premiumBody.querySelectorAll('[data-approve-pay]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api.adminApprovePremiumPayment(btn.getAttribute('data-approve-pay'));
            showToast("To'lov tasdiqlandi");
            loadPremiumPayments();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
      premiumBody.querySelectorAll('[data-reject-pay]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm("Bu to'lovni rad etmoqchimisiz?")) return;
          try {
            await api.adminRejectPremiumPayment(btn.getAttribute('data-reject-pay'));
            showToast("To'lov rad etildi");
            loadPremiumPayments();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
    } catch (e) {
      premiumBody.innerHTML = `<tr><td colspan="7" class="field-error">${escapeHtml(e.message)}</td></tr>`;
    }
  }

  const GALLERY_CATEGORIES = ['toy', 'juftlik', 'oila'];
  const galleryInput = document.getElementById('gallery_input');
  const galleryCategorySelect = document.getElementById('gallery_category');
  const galleryStatus = document.getElementById('gallery-upload-status');

  function galleryItemHtml(p) {
    return `
      <div class="gallery-admin-item">
        <img src="${p.url}" alt="" />
        <button type="button" class="btn btn-danger-ghost btn-sm" data-del-photo="${p.id}">O'chirish</button>
      </div>`;
  }

  async function loadGallery() {
    const grids = {};
    GALLERY_CATEGORIES.forEach((cat) => { grids[cat] = document.getElementById(`gallery-admin-grid-${cat}`); });
    if (!grids.toy) return;
    GALLERY_CATEGORIES.forEach((cat) => { grids[cat].innerHTML = `<p class="skeleton-loading">Yuklanmoqda...</p>`; });
    try {
      const { photos } = await api.adminGallery();
      GALLERY_CATEGORIES.forEach((cat) => {
        const catPhotos = photos.filter((p) => (p.category || 'toy') === cat);
        grids[cat].innerHTML = catPhotos.length
          ? catPhotos.map(galleryItemHtml).join('')
          : `<p class="skeleton-loading">Hali rasm yo'q</p>`;
      });
      document.querySelectorAll('[data-del-photo]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm("Bu rasmni o'chirmoqchimisiz?")) return;
          try {
            await api.adminDeleteGalleryPhoto(btn.getAttribute('data-del-photo'));
            showToast("Rasm o'chirildi");
            loadGallery();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
    } catch (e) {
      grids.toy.innerHTML = `<p class="field-error">${escapeHtml(e.message)}</p>`;
    }
  }

  if (galleryInput) {
    galleryInput.addEventListener('change', async () => {
      const file = galleryInput.files[0];
      if (!file) return;
      const category = galleryCategorySelect ? galleryCategorySelect.value : 'toy';
      galleryStatus.textContent = 'Yuklanmoqda...';
      try {
        const { url } = await api.uploadPhoto(file);
        await api.adminAddGalleryPhoto({ url, category });
        galleryStatus.textContent = '';
        galleryInput.value = '';
        loadGallery();
      } catch (e) {
        galleryStatus.textContent = e.message;
      }
    });
  }

  loadStats();
  loadInvitations();
  loadUsers();
  loadMessages();
  loadGallery();
  loadPremiumPayments();
})();
