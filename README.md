# PDF Spelling & Grammar Checker

Full-stack app: upload a PDF, it extracts the text, detects spelling/grammar
mistakes, highlights them, generates a corrected PDF, and saves everything to
MongoDB as a permanent history (original file path + corrected file path +
every mistake, with timestamps) — now with **role-based auth (admin/user)**
and **dark mode**.

**Stack:** React (Vite + Tailwind) · Node/Express · MongoDB (Mongoose) ·
JWT + bcrypt (auth) · Multer (file upload) · pdf-parse (text extraction) ·
LanguageTool API (spelling & grammar) · pdfkit (corrected PDF generation)

---

## Pinning mistakes on the actual PDF

Mistakes are no longer only shown against reflowed plain text — they're
pinned at their real position on the actual rendered PDF page:

1. **Backend extraction** (`utils/pdfTextExtractor.js`) uses `pdfjs-dist`
   (not `pdf-parse` anymore) to walk every text run on every page, recording
   each run's bounding box in "scale-1 viewport space" (top-left origin,
   same convention pdf.js uses for on-screen rendering) alongside the
   character offset range it occupies in the concatenated full text.
2. LanguageTool still returns mistakes as `{offset, length}` into that same
   full text, exactly as before.
3. `attachBoxesToMistakes()` maps each mistake's offset range onto the text
   run(s) it overlaps. If a mistake is only part of a longer run (e.g. one
   word inside a headline pdf.js stored as a single text item), it computes
   a proportional sub-box from the character position ratio within that run
   — tighter than highlighting the whole run, though not pixel-perfect
   (glyph widths vary).
4. Boxes are saved on each mistake in MongoDB (`mistakes[].boxes`), along
   with each page's width/height at scale 1 (`pages[]`).
5. **Frontend** (`components/PdfViewer.jsx`) fetches the original PDF bytes
   (`GET /api/pdf/:id/view/original`, JWT-protected, inline not attachment)
   and renders each page with `pdfjs-dist` onto a canvas. Because the boxes
   were stored in scale-1 viewport space, positioning them on screen is just
   `box * currentRenderScale` — no coordinate math needed on the frontend.
   Each mistake gets a numbered pin + a translucent highlight rectangle;
   clicking either opens a small popover with the message and suggested
   fix, same as clicking a comment pin in a normal PDF annotation tool.
6. The **Proof Sheet** tab's "Show on PDF →" button jumps the viewer to the
   right page and pops open that mistake's pin.

**Known limitation:** the sub-box estimate for mistakes inside a
multi-word text run is proportional, not exact — PDFs don't expose per-
character widths without deeper font-metric work, so on justified or
unusually kerned text the highlight can be a little wider or narrower than
the actual word. It's consistently in the right place, just not laser-
precise to the pixel.

## Roles & Auth

- **user** ("Staff Writer"): can upload PDFs and see only their own upload
  history ("My Issues").
- **admin** ("Editor"): everything a user can do, plus a **Newsroom** section:
  - **Editor's Overview** (`/admin`) — stat cards (staff count, total files,
    total mistakes caught, failed runs) and the latest filed copy across
    everyone.
  - **Staff** (`/admin/staff`) — create new user accounts (name, email,
    temporary password, role), promote/demote between user↔admin, suspend/
    reinstate, or remove accounts.
  - **All Copy** (`/admin/files`) — every file uploaded by every user,
    filterable by staff member and searchable by filename, with open/delete
    actions.

Auth is JWT-based (7-day expiry by default). There's no public sign-up route
on purpose — **admins create every account** — so the very first admin is
auto-created on server startup from `.env` (see `ADMIN_EMAIL` /
`ADMIN_PASSWORD` below). Log in with that account first, then use **Staff**
to add everyone else.

## Dark Mode

Click the "Day Edition / Night Edition" toggle in the header. The whole UI —
masthead, cards, proofreading marks, stamps — is built on CSS variables that
flip between a light "newsprint" palette and a dark "night edition" palette,
so no component-by-component dark styling was needed. The choice is saved to
`localStorage` and also respects the OS's preferred color scheme on first
visit.

---

## How it works

1. User uploads a PDF (`UploadPage` → `POST /api/pdf/upload`, JWT required).
2. Backend saves the file to `backend/uploads/` via Multer and creates a
   MongoDB record immediately (status: `processing`), tagged with
   `uploadedBy` — the file's on-disk path is stored in the DB
   (`originalPath`).
3. Backend extracts text **and per-run bounding boxes** with `pdfjs-dist`
   (see "Pinning mistakes on the actual PDF" below).
4. Text is sent to the LanguageTool API, which returns spelling/grammar
   matches with offsets, messages, and replacement suggestions.
5. Each mistake's offset is mapped back onto a box on the actual page.
6. Backend auto-applies the top suggestion for each mistake to build
   `correctedText`, and renders it into a new PDF with `pdfkit`
   (`uploads/corrected-*.pdf`).
7. The full record (extracted text, corrected text, mistakes with boxes,
   both file paths, uploader, per-page dimensions) is saved to MongoDB —
   this **is** your history; every upload is a permanent row.
8. Frontend's `ResultPage` renders the actual PDF with `PdfViewer` and pins
   every mistake at its real position (see below), lets you view the
   corrected text, download either PDF, or browse the mistake list with
   suggestions and jump straight to any one of them on the page.
9. `HistoryPage` ("My Issues") lists your own past uploads; admins get the
   same thing plus the newsroom-wide `AdminFilesPage` ("All Copy").
10. Access is enforced server-side too: a regular user's JWT can only ever
    read/download/view/delete their own documents — trying another user's
    document ID returns `403`.

---

## Setup

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (or an Atlas connection string)

### 2. Backend

```bash
cd backend
cp .env.example .env     # edit MONGO_URI, JWT_SECRET, ADMIN_EMAIL/PASSWORD
npm install
npm run dev               # nodemon, or `npm start`
```

Backend runs on `http://localhost:5000`. On first run it:
- creates the `uploads/` folder if missing
- creates the first admin account from `ADMIN_NAME` / `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` in `.env`, **only if no admin exists yet**

**Change `JWT_SECRET` to a long random string before deploying anywhere
real**, and change the seeded admin's password after your first login (there's
no self-service password-change UI yet — update it directly in MongoDB or
add one, see "possible upgrades" below).

**Note on grammar checking:** by default this uses the free public
LanguageTool API (`https://api.languagetool.org/v2/check`), which is
rate-limited (fine for development/light use). For production or heavy
usage, self-host LanguageTool (`docker run -p 8010:8010 erikvl87/languagetool`)
and point `LANGUAGETOOL_API` in `.env` to your instance, e.g.
`http://localhost:8010/v2/check`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. If your backend isn't on
`localhost:5000`, create `frontend/.env` with:

```
VITE_API_URL=http://your-backend-host:5000/api
```

Go to `http://localhost:5173/login` and sign in with the seeded admin
credentials to get started.

---

## API Reference

### Auth (`/api/auth`)
| Method | Endpoint            | Access       | Description                          |
|--------|----------------------|--------------|----------------------------------------|
| POST   | `/login`             | Public       | Returns `{ token, user }`              |
| GET    | `/me`                | Any logged in | Current user's profile                |
| GET    | `/users`             | Admin only   | List every account                     |
| POST   | `/users`             | Admin only   | Create a new account                   |
| PATCH  | `/users/:id`         | Admin only   | Change `role` and/or `isActive`        |
| DELETE | `/users/:id`         | Admin only   | Delete an account (not yourself, not the last admin) |

### Admin (`/api/admin`)
| Method | Endpoint    | Access     | Description                                   |
|--------|-------------|------------|------------------------------------------------|
| GET    | `/stats`    | Admin only | Dashboard counts + 5 most recent uploads       |

### PDF (`/api/pdf`) — all require a valid JWT
| Method | Endpoint                          | Description                                  |
|--------|------------------------------------|-----------------------------------------------|
| POST   | `/upload`                         | Upload PDF (`multipart/form-data`, field `pdf`), runs full pipeline |
| GET    | `/history?page=&limit=&search=&userId=` | Own uploads (users); admins can pass `userId` to filter, or omit it to see everyone |
| GET    | `/:id`                            | Full detail — 403 if it's not yours and you're not admin |
| GET    | `/:id/view/original`              | Inline PDF bytes for the in-browser viewer (not a forced download) |
| GET    | `/:id/download/original`          | Download the originally uploaded PDF          |
| GET    | `/:id/download/corrected`         | Download the auto-corrected PDF               |
| DELETE | `/:id`                            | Delete a document (removes DB record + files) |

## MongoDB schemas

**User**
```
name, email (unique), passwordHash, role (admin|user), isActive, createdAt, updatedAt
```

**PdfDocument**
```
uploadedBy (ref User), originalName, storedName, originalPath, correctedFileName,
correctedPath, fileSize, mimeType, status (pending|processing|completed|failed),
errorMessage, extractedText, correctedText,
mistakes: [{ message, shortMessage, offset, length, originalText,
             suggestions[], appliedSuggestion, ruleId, category,
             boxes: [{ page, box: [left, top, right, bottom] }] }],
mistakeCount, pageCount, pages: [{ pageNumber, width, height }],
createdAt, updatedAt
```

---

## Notes & possible upgrades

- **Text-only correction:** the corrected PDF is regenerated from plain text
  (via `pdfkit`), not an edited copy of the original layout — reflowing text
  back into an arbitrary original PDF layout reliably isn't generally
  possible. The original PDF is always preserved for download/reference.
- **Grammar accuracy:** LanguageTool covers both spelling and grammar. Swap
  in a different provider (e.g. an LLM-based checker) in
  `backend/utils/grammarChecker.js` if you want different behavior.
- **Password changes / self-service:** not included — add a
  `PATCH /api/auth/me/password` route plus a small settings page if you want
  users to change their own password.
- **Refresh tokens:** the JWT is long-lived (7 days) with no refresh flow;
  fine for an internal tool, worth revisiting for a public-facing product.
- **Large PDFs:** text is chunked before sending to LanguageTool to respect
  API limits; very large PDFs will take longer to process (the frontend
  upload button shows a processing state).

