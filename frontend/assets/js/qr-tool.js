(async function () {
  const allowed = await checkPremiumGate('#qr-tool-section', 'QR kod vositasi');
  if (!allowed) return;

  const resultEl = document.getElementById('qr-result');
  const linkEl = document.getElementById('qr-link');
  const downloadBtn = document.getElementById('qr-download-btn');
  const copyBtn = document.getElementById('qr-copy-link-btn');

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); showToast('Havola nusxalandi'); }
    catch (e) { showToast("Nusxalab bo'lmadi", true); }
    document.body.removeChild(ta);
  }

  function wireCopyButton(fullUrl) {
    copyBtn.onclick = () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(fullUrl).then(() => showToast('Havola nusxalandi'), () => fallbackCopy(fullUrl));
      } else {
        fallbackCopy(fullUrl);
      }
    };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let cursorY = y;
    for (let i = 0; i < words.length; i++) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, cx, cursorY);
        line = words[i];
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, cx, cursorY);
    return cursorY;
  }

  // ---------- Xotira (memory) QR ----------

  if (document.getElementById('qr-tool-xotira')) {
    const coverInput = document.getElementById('qr-cover-input');
    const coverStatus = document.getElementById('qr-cover-status');
    const modeBtns = document.querySelectorAll('.qr-mode-btn');
    const modePhotos = document.getElementById('qr-mode-photos');
    const modeVideo = document.getElementById('qr-mode-video');
    const photosInput = document.getElementById('qr-photos-input');
    const photosCount = document.getElementById('qr-photos-count');
    const photosList = document.getElementById('qr-photos-list');
    const songInput = document.getElementById('qr-song-input');
    const songStatus = document.getElementById('qr-song-status');
    const videoInput = document.getElementById('qr-video-input');
    const videoStatus = document.getElementById('qr-video-status');
    const generateBtn = document.getElementById('qr-generate-btn');
    const generateStatus = document.getElementById('qr-generate-status');

    let mode = 'photos';
    let coverFile = null;
    let coverPreviewUrl = null;
    let photoFiles = [];
    let songFile = null;
    let videoFile = null;

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        modeBtns.forEach((b) => b.classList.toggle('active', b === btn));
        modePhotos.hidden = mode !== 'photos';
        modeVideo.hidden = mode !== 'video';
      });
    });

    coverInput.addEventListener('change', () => {
      coverFile = coverInput.files[0] || null;
      coverStatus.textContent = coverFile ? coverFile.name : '';
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      coverPreviewUrl = coverFile ? URL.createObjectURL(coverFile) : null;
    });

    function renderPhotoThumbs() {
      photosCount.textContent = `${photoFiles.length} / 10 rasm tanlandi`;
      photosList.innerHTML = photoFiles.map((f, i) => `
        <div class="qr-photo-thumb" data-i="${i}">
          <img src="${URL.createObjectURL(f)}" alt="" />
          <button type="button" aria-label="O'chirish">&times;</button>
        </div>`).join('');
      photosList.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.closest('.qr-photo-thumb').dataset.i);
          photoFiles.splice(i, 1);
          renderPhotoThumbs();
        });
      });
    }

    photosInput.addEventListener('change', () => {
      const incoming = Array.from(photosInput.files || []);
      photoFiles = [...photoFiles, ...incoming].slice(0, 10);
      photosInput.value = '';
      renderPhotoThumbs();
    });

    songInput.addEventListener('change', () => {
      songFile = songInput.files[0] || null;
      songStatus.textContent = songFile ? songFile.name : '';
    });

    videoInput.addEventListener('change', () => {
      videoFile = videoInput.files[0] || null;
      videoStatus.textContent = videoFile ? videoFile.name : '';
    });

    function heartPath(ctx, cx, topY, width, height) {
      const w = width / 2;
      ctx.beginPath();
      ctx.moveTo(cx, topY + height * 0.32);
      ctx.bezierCurveTo(cx, topY, cx - w, topY, cx - w, topY + height * 0.32);
      ctx.bezierCurveTo(cx - w, topY + height * 0.66, cx, topY + height * 0.8, cx, topY + height);
      ctx.bezierCurveTo(cx, topY + height * 0.8, cx + w, topY + height * 0.66, cx + w, topY + height * 0.32);
      ctx.bezierCurveTo(cx + w, topY, cx, topY, cx, topY + height * 0.32);
      ctx.closePath();
    }

    function drawPetalCluster(ctx, cx, cy, scale, palette) {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = cx + Math.cos(angle) * 15 * scale;
        const py = cy + Math.sin(angle) * 15 * scale;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 17 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = palette[i % palette.length];
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 7 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#F3C969';
      ctx.globalAlpha = 1;
      ctx.fill();
    }

    function drawSparkle(ctx, x, y, size, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(size * 0.15, -size * 0.15, size, 0);
      ctx.quadraticCurveTo(size * 0.15, size * 0.15, 0, size);
      ctx.quadraticCurveTo(-size * 0.15, size * 0.15, -size, 0);
      ctx.quadraticCurveTo(-size * 0.15, -size * 0.15, 0, -size);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    }

    async function drawMemoryCard(fullUrl, coverImg) {
      const canvas = document.getElementById('qr-canvas-final');
      const W = 800, H = 820;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#FFF7F9');
      bgGrad.addColorStop(1, '#FDEDF3');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const pinkPalette = ['#F6C9DC', '#F2A6C4', '#FBE3EC', '#E8B4CB'];
      const corners = [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]];
      corners.forEach(([cx, cy]) => drawPetalCluster(ctx, cx, cy, 1.3, pinkPalette));
      for (let i = 0; i < 14; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        drawSparkle(ctx, x, y, 4 + Math.random() * 5, Math.random() > 0.5 ? '#F3C969' : '#F6D9E4');
      }

      const heartW = 560, heartH = 620, heartTopY = 70, heartCx = W / 2;
      heartPath(ctx, heartCx, heartTopY, heartW, heartH);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(210,150,170,0.35)';
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#E8B84F';
      ctx.stroke();

      const qr = qrcode(0, 'H');
      qr.addData(fullUrl);
      qr.make();
      const count = qr.getModuleCount();
      const qrSize = 340;
      const qrX = heartCx - qrSize / 2;
      const qrY = heartTopY + heartH * 0.5 - qrSize / 2 + 20;
      const cell = qrSize / count;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.fillStyle = '#1F2430';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect(qrX + c * cell, qrY + r * cell, cell + 0.6, cell + 0.6);
        }
      }

      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillStyle = '#B9829A';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '3px';
      ctx.fillText('X O T I R A M I Z', W / 2, heartTopY + heartH + 56);

      return canvas;
    }

    generateBtn.addEventListener('click', async () => {
      if (mode === 'video' && !videoFile) { generateStatus.textContent = 'Video tanlang'; return; }
      if (mode === 'photos' && photoFiles.length === 0) { generateStatus.textContent = 'Kamida bitta rasm tanlang'; return; }
      if (!coverFile && mode === 'video') { generateStatus.textContent = 'Kelin-kuyov suratini tanlang'; return; }

      generateBtn.disabled = true;
      resultEl.hidden = true;
      try {
        let videoUrl = '';
        let photoUrls = [];
        let songUrl = '';
        let coverUrl = '';

        if (mode === 'video') {
          generateStatus.textContent = 'Kelin-kuyov surati yuklanmoqda...';
          const cr = await api.uploadPhoto(coverFile);
          coverUrl = cr.url;
          generateStatus.textContent = 'Video yuklanmoqda...';
          const r = await api.uploadVideo(videoFile);
          videoUrl = r.url;
        } else {
          for (let i = 0; i < photoFiles.length; i++) {
            generateStatus.textContent = `Rasmlar yuklanmoqda... (${i + 1}/${photoFiles.length})`;
            const r = await api.uploadPhoto(photoFiles[i]);
            photoUrls.push(r.url);
          }
          if (coverFile) {
            generateStatus.textContent = 'Kelin-kuyov surati yuklanmoqda...';
            const cr = await api.uploadPhoto(coverFile);
            coverUrl = cr.url;
          } else {
            coverUrl = photoUrls[0];
          }
          if (songFile) {
            generateStatus.textContent = "Qo'shiq yuklanmoqda...";
            const r = await api.uploadSong(songFile);
            songUrl = r.url;
          }
        }

        generateStatus.textContent = 'Xotira yaratilmoqda...';
        const { token } = await api.createQrMemory({
          cover_url: coverUrl,
          video_url: videoUrl,
          photos: photoUrls,
          song_url: songUrl
        });

        const fullUrl = `${window.location.origin}/xotira/${token}`;
        generateStatus.textContent = 'QR kod chizilmoqda...';
        const coverImg = await loadImage(coverUrl);
        await drawMemoryCard(fullUrl, coverImg);

        const canvas = document.getElementById('qr-canvas-final');
        const dataUrl = canvas.toDataURL('image/png');
        downloadBtn.href = dataUrl;
        downloadBtn.download = 'xotira-qr.png';
        linkEl.textContent = fullUrl;
        generateStatus.textContent = '';
        resultEl.hidden = false;
        wireCopyButton(fullUrl);
      } catch (err) {
        generateStatus.textContent = err.message;
      } finally {
        generateBtn.disabled = false;
      }
    });
  }

  // ---------- Vizitka (business card) QR ----------

  if (document.getElementById('qr-tool-vizitka')) {
    async function drawVizitkaCard(fullUrl, name, phone, note) {
      const canvas = document.getElementById('qr-canvas-final');
      const W = 700, H = 880;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#F7F9FC');
      bg.addColorStop(1, '#EBF0F8');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      roundRectPath(ctx, 22, 22, W - 44, H - 44, 22);
      ctx.strokeStyle = '#0D1B3D';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      roundRectPath(ctx, 32, 32, W - 64, H - 64, 16);
      ctx.strokeStyle = '#C8A75E';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, 108, 44, 0, Math.PI * 2);
      ctx.fillStyle = '#0D1B3D';
      ctx.fill();
      ctx.font = '42px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚗', W / 2, 112);
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#0D1B3D';
      ctx.font = '700 24px Inter, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText("MASHINA EGASIGA XABAR", W / 2, 200);
      ctx.letterSpacing = '0px';

      ctx.font = '400 16px Inter, sans-serif';
      ctx.fillStyle = '#5B6472';
      wrapText(ctx, "Mashinam yo'lingizni to'sib qo'ygan bo'lsa, QR kodni skaner qiling yoki qo'ng'iroq qiling", W / 2, 232, 480, 24);

      const qr = qrcode(0, 'H');
      qr.addData(fullUrl);
      qr.make();
      const count = qr.getModuleCount();
      const qrSize = 320;
      const qrX = W / 2 - qrSize / 2;
      const qrY = 300;
      const cell = qrSize / count;
      ctx.save();
      ctx.shadowColor = 'rgba(13,27,61,0.18)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFFFFF';
      roundRectPath(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 14);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0D1B3D';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect(qrX + c * cell, qrY + r * cell, cell + 0.6, cell + 0.6);
        }
      }

      ctx.font = '700 32px Inter, sans-serif';
      ctx.fillStyle = '#0D1B3D';
      ctx.textAlign = 'center';
      ctx.fillText(name, W / 2, qrY + qrSize + 74);

      ctx.font = '600 28px Inter, sans-serif';
      ctx.fillStyle = '#C8A75E';
      ctx.fillText(phone, W / 2, qrY + qrSize + 116);

      if (note) {
        ctx.font = '400 16px Inter, sans-serif';
        ctx.fillStyle = '#5B6472';
        ctx.fillText(note, W / 2, qrY + qrSize + 148);
      }

      return canvas;
    }

    const vizGenerateBtn = document.getElementById('viz-generate-btn');
    const vizGenerateStatus = document.getElementById('viz-generate-status');

    vizGenerateBtn.addEventListener('click', async () => {
      const name = document.getElementById('viz-name').value.trim();
      const phone = document.getElementById('viz-phone').value.trim();
      const note = document.getElementById('viz-note').value.trim();
      if (!name) { vizGenerateStatus.textContent = 'Ismingizni kiriting'; return; }
      if (!phone) { vizGenerateStatus.textContent = 'Telefon raqamingizni kiriting'; return; }

      vizGenerateBtn.disabled = true;
      resultEl.hidden = true;
      try {
        vizGenerateStatus.textContent = 'Vizitka yaratilmoqda...';
        const { token } = await api.createVizitka({ name, phone, note });
        const fullUrl = `${window.location.origin}/vizitka/${token}`;

        vizGenerateStatus.textContent = 'QR kod chizilmoqda...';
        await drawVizitkaCard(fullUrl, name, phone, note);

        const canvas = document.getElementById('qr-canvas-final');
        const dataUrl = canvas.toDataURL('image/png');
        downloadBtn.href = dataUrl;
        downloadBtn.download = 'vizitka-qr.png';
        linkEl.textContent = fullUrl;
        vizGenerateStatus.textContent = '';
        resultEl.hidden = false;
        wireCopyButton(fullUrl);
      } catch (err) {
        vizGenerateStatus.textContent = err.message;
      } finally {
        vizGenerateBtn.disabled = false;
      }
    });
  }
})();
