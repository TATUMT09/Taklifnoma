# Taklifnoma

Raqamli to'y taklifnomasi yaratish xizmati — backend (Node.js + Express + SQLite) va frontend (vanilla HTML/CSS/JS) alohida qismlarga ajratilgan, lekin bitta serverdan ishga tushadi.

## Ishga tushirish

```
cd backend
npm install
npm start
```

Keyin brauzerda oching: http://localhost:3001

## Tuzilma

- `backend/` — Express API (ro'yxatdan o'tish/kirish, taklifnomalar CRUD, ommaviy ko'rish va RSVP). Ma'lumotlar `backend/data/app.db` (SQLite) faylida saqlanadi.
- `frontend/` — statik sahifalar: bosh sahifa, ro'yxatdan o'tish/kirish, panel ("Taklifnomalarim"), yaratish/tahrirlash formasi, va `/i/:slug` bo'yicha ommaviy taklifnoma sahifasi.

## Andazalar

Uchta rang mavzusi: **Zumrad** (zumrad-yashil + oltin), **Lavanda** (binafsha + rose-gold), **Shafaq** (anor-qizil + amber). Har biri bir xil tuzilmadan (sanoq, taqvim, dastur, manzil, tilak, RSVP) foydalanadi, faqat ranglar farq qiladi.
