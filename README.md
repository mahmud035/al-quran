# Quran Mazid — MERN Rebuild

A modern Quran reader: browse all 114 surahs, read Arabic + transliteration +
translation, listen with per-ayah audio, search, and bookmark. Rebuilt from a 2022
vanilla HTML/CSS/JS app (preserved in [`legacy/`](./legacy)) into a full MERN stack.

All Quran **content** (text, translations, audio metadata, search) comes from the free
[AlQuran.cloud](https://alquran.cloud/api) API, called directly from the frontend via
TanStack Query. Per-ayah audio streams from the Islamic Network CDN. The backend owns
**only user-specific data**: auth, bookmarks, and settings.

## Stack

| | |
|---|---|
| **client/** | React 19 · TypeScript · Vite · Tailwind v4 · React Router v7 · TanStack Query v5 · React-Hook-Form + Zod |
| **server/** | Express · TypeScript · Mongoose · MongoDB Atlas · JWT (HTTP-only cookie) · Zod |

## Project layout

```
server/   Express API — feature modules (auth, bookmarks, settings)
client/   Vite React app — features mirror backend domains 1:1
legacy/   the original 2022 static site (reference only)
```

## Running locally

**Backend** (port 5000):
```bash
cd server
cp .env.example .env      # set MONGODB_URI (Atlas) and JWT_SECRET
npm install
npm run dev
```

**Frontend** (port 5173):
```bash
cd client
npm install
npm run dev               # VITE_API_URL defaults to http://localhost:5000/api
```

## API

All responses use the envelope `{ statusCode, success, message, data }`.

```
POST   /api/auth/register | login | logout
GET    /api/auth/me                         (auth)
GET    /api/bookmarks                        (auth)
POST   /api/bookmarks                         (auth)
GET    /api/bookmarks/check?surah=&ayah=      (auth)
DELETE /api/bookmarks/:id                     (auth)
GET    /api/settings                          (auth)
PUT    /api/settings                          (auth)
```

Unauthenticated users can read and listen fully; bookmarks and cross-device settings
sync require an account. Guests fall back to `localStorage`.

## Notes

- Reciter audio bitrate varies on the CDN: `ar.alafasy` and `ar.mahermuaiqly` are
  published at 128kbps; the other reciters exist only at 64kbps. See
  `client/src/utils/constants.ts` (`RECITER_BITRATE`). Reciters are limited to those
  present in AlQuran.cloud's per-ayah audio catalog.
- Search filters the surah list by name, meaning, or number (client-side); it does not
  full-text search translations.
- Bismillah renders as a header for every surah except Al-Fatiha (1, where it is ayah 1)
  and At-Tawba (9, which has none).
