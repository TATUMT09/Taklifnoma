const api = (() => {
  async function request(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.error) || "Nimadir xato ketdi");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    me: () => request('GET', '/api/auth/me'),
    register: (payload) => request('POST', '/api/auth/register', payload),
    login: (payload) => request('POST', '/api/auth/login', payload),
    logout: () => request('POST', '/api/auth/logout'),

    listInvitations: () => request('GET', '/api/invitations'),
    createInvitation: (payload) => request('POST', '/api/invitations', payload),
    getInvitation: (id) => request('GET', `/api/invitations/${id}`),
    updateInvitation: (id, payload) => request('PUT', `/api/invitations/${id}`, payload),
    deleteInvitation: (id) => request('DELETE', `/api/invitations/${id}`),

    getPublicInvitation: (slug) => request('GET', `/api/public/${slug}`),
    unlockInvitation: (slug, password) => request('POST', `/api/public/${slug}/unlock`, { password }),
    getPremiumStatus: (slug) => request('GET', `/api/public/${slug}/premium-status`),
    submitPremiumPayment: (slug, screenshotUrl) => request('POST', `/api/public/${slug}/premium-payment`, { screenshot_url: screenshotUrl }),
    getWishes: (slug) => request('GET', `/api/public/${slug}/wishes`),
    submitRsvp: (slug, payload) => request('POST', `/api/public/${slug}/rsvp`, payload),
    sendContactMessage: (payload) => request('POST', '/api/public/contact', payload),
    getGallery: () => request('GET', '/api/public/gallery'),

    checkSlug: (slug, excludeId) => request('GET', `/api/invitations/check-slug?slug=${encodeURIComponent(slug)}${excludeId ? `&excludeId=${excludeId}` : ''}`),

    uploadPhoto: async (file) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: formData, credentials: 'same-origin' });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) throw new Error((data && data.error) || "Rasmni yuklab bo'lmadi");
      return data;
    },

    uploadSong: async (file) => {
      const formData = new FormData();
      formData.append('song', file);
      const res = await fetch('/api/uploads/song', { method: 'POST', body: formData, credentials: 'same-origin' });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) throw new Error((data && data.error) || "Qo'shiqni yuklab bo'lmadi");
      return data;
    },

    uploadVideo: async (file) => {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch('/api/uploads/video', { method: 'POST', body: formData, credentials: 'same-origin' });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) throw new Error((data && data.error) || "Videoni yuklab bo'lmadi");
      return data;
    },

    adminStats: () => request('GET', '/api/admin/stats'),
    adminUsers: () => request('GET', '/api/admin/users'),
    adminDeleteUser: (id) => request('DELETE', `/api/admin/users/${id}`),
    adminResetPassword: (id, password) => request('POST', `/api/admin/users/${id}/password`, { password }),
    adminInvitations: () => request('GET', '/api/admin/invitations'),
    adminDeleteInvitation: (id) => request('DELETE', `/api/admin/invitations/${id}`),

    adminMessages: () => request('GET', '/api/admin/messages'),
    adminMarkMessageRead: (id) => request('POST', `/api/admin/messages/${id}/read`),
    adminDeleteMessage: (id) => request('DELETE', `/api/admin/messages/${id}`),

    createQrMemory: (payload) => request('POST', '/api/qr-memory', payload),
    getQrMemory: (token) => request('GET', `/api/qr-memory/${token}`),

    createVizitka: (payload) => request('POST', '/api/vizitka', payload),
    getVizitka: (token) => request('GET', `/api/vizitka/${token}`),

    adminGallery: () => request('GET', '/api/admin/gallery'),
    adminAddGalleryPhoto: (payload) => request('POST', '/api/admin/gallery', payload),
    adminDeleteGalleryPhoto: (id) => request('DELETE', `/api/admin/gallery/${id}`),

    adminPremiumPayments: () => request('GET', '/api/admin/premium-payments'),
    adminApprovePremiumPayment: (id) => request('POST', `/api/admin/premium-payments/${id}/approve`),
    adminRejectPremiumPayment: (id) => request('POST', `/api/admin/premium-payments/${id}/reject`)
  };
})();
