# Car AI Vision UAE — Build Checkpoints

AI-powered car damage assistant for UAE. Voice input, camera capture, live damage analysis, repair cost estimates, and nearby workshop finder — all via Groq API.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router 7 |
| Backend | FastAPI + Uvicorn |
| AI — Vision | `meta-llama/llama-4-scout-17b-16e-instruct` (Groq) |
| AI — Chat | `llama-3.3-70b-versatile` (Groq) |
| Voice Input | Web Speech API (SpeechRecognition) |
| Voice Output | Web Speech API (speechSynthesis) |
| Camera | getUserMedia + file input capture |
| Workshops | OpenStreetMap Overpass API (free, no key) |
| Location | Browser Geolocation API |
| Streaming | SSE (Server-Sent Events) |
| Deployment | GitHub Pages (frontend) |

---

## Checkpoints

### CHECKPOINT 01 — Project Foundation
**Goal:** Folder structure, dependencies, base config, git setup

Tasks:
- [ ] Create `frontend/` and `backend/` directories
- [ ] `frontend/package.json` with React 19, Vite 7, React Router, Axios, React Icons, React Markdown
- [ ] `frontend/vite.config.js` with base path `/Car_ai_vision_UAE/`
- [ ] `frontend/src/App.jsx` with Router + two routes (`/` and `/chat`)
- [ ] `frontend/index.html` with title + 404 redirect decode script
- [ ] `frontend/public/404.html` for GitHub Pages SPA routing fix
- [ ] `backend/requirements.txt` with FastAPI, Uvicorn, httpx, python-dotenv, Pillow
- [ ] `backend/server.py` skeleton with CORS + health check
- [ ] `.gitignore`

Status: `pending`

---

### CHECKPOINT 02 — Landing Page
**Goal:** UAE car-themed landing page, hero section, feature grid

Tasks:
- [ ] `LandingPage.jsx` — hero with animated car silhouette / city backdrop
- [ ] Feature cards: Voice Input, Camera Vision, Damage Analysis, Cost Estimate, Workshop Finder, Insurance Advice
- [ ] UAE-themed color scheme (dark navy + gold + red accent)
- [ ] Animated stats: Models Active, Voice Enabled, Live Location, Free to Use
- [ ] Navigate to `/chat` on CTA button
- [ ] `LandingPage.css` — full styling, responsive

Status: `pending`

---

### CHECKPOINT 03 — Chat Page Core + Groq Text
**Goal:** Chat UI with streaming text responses, guardrails, sidebar

Tasks:
- [ ] `ChatPage.jsx` layout — sidebar + main chat area
- [ ] Sidebar: performance metrics, active models, clear chat button
- [ ] Messages with markdown rendering (react-markdown + remark-gfm)
- [ ] Text input + send button (Enter key support)
- [ ] Groq streaming SSE — model: `llama-3.3-70b-versatile`
- [ ] System prompt — UAE car-only guardrails, AED pricing, RTA rules
- [ ] Typing indicator animation
- [ ] AbortController for request cancellation
- [ ] Response time metrics
- [ ] Quick action buttons (5 starter questions)

Status: `pending`

---

### CHECKPOINT 04 — Voice Input (Speech to Text)
**Goal:** User can speak instead of type — mic button, real-time transcript

Tasks:
- [ ] Mic button in input bar (prominent, tap to start / tap to stop)
- [ ] Web Speech API `SpeechRecognition` — continuous: false, interimResults: true
- [ ] Live transcript shown in input field as user speaks
- [ ] Visual feedback — pulsing red indicator when recording
- [ ] Auto-send on speech end (configurable)
- [ ] Fallback message if browser doesn't support Speech API
- [ ] Works on Chrome, Edge, Safari (mobile + desktop)

Status: `pending`

---

### CHECKPOINT 05 — Camera + Vision (Damage Analysis)
**Goal:** User takes/uploads car photo → Llama 4 Scout analyses damage

Tasks:
- [ ] Camera button — opens native camera on mobile (`capture="environment"`)
- [ ] Desktop fallback — file picker for image upload
- [ ] Image preview shown in chat before sending
- [ ] Client-side resize to 768px max, JPEG 85% quality (Canvas API)
- [ ] Base64 encode → send to Groq vision endpoint
- [ ] Model: `meta-llama/llama-4-scout-17b-16e-instruct`
- [ ] Vision system prompt: damage type, severity, affected parts, repair complexity, AED cost estimate
- [ ] Display image in message thread alongside AI response
- [ ] Clear image button

Status: `pending`

---

### CHECKPOINT 06 — Voice Output (Text to Speech)
**Goal:** AI responses are spoken aloud automatically

Tasks:
- [ ] Web Speech API `speechSynthesis` — auto-play after each response
- [ ] Strip markdown before speaking (headings, bold, tables, bullets)
- [ ] Default speed: 1.7x
- [ ] Speed slider in sidebar (0.5x – 2.0x)
- [ ] Enable/Disable toggle in sidebar
- [ ] Play / Pause / Stop controls when audio is active
- [ ] Sidebar shows current TTS status

Status: `pending`

---

### CHECKPOINT 07 — Location + Workshop Finder
**Goal:** Detect user's UAE emirate, find real nearby workshops via OpenStreetMap

Tasks:
- [ ] Browser Geolocation API — ask permission on first use
- [ ] Reverse geocode via `nominatim.openstreetmap.org` (free, no key)
- [ ] Detect emirate: Abu Dhabi / Dubai / Sharjah / Ajman / RAK / Fujairah / UAQ
- [ ] OpenStreetMap Overpass API — find `shop=car_repair` within 10km radius
- [ ] Format workshop results: name, distance, address, OSM link
- [ ] Inject location context into system prompt (emirate + city)
- [ ] `/api/workshops` backend endpoint — proxies OSM query (avoids CORS)
- [ ] Workshop results shown as cards in chat response
- [ ] Fallback if location denied — ask user to type their area

Status: `pending`

---

### CHECKPOINT 08 — GitHub Pages Deployment
**Goal:** CI/CD pipeline, live demo on GitHub Pages

Tasks:
- [ ] `.github/workflows/deploy.yml` — build + deploy on push to main
- [ ] Vite base path: `/Car_ai_vision_UAE/`
- [ ] React Router basename: `/Car_ai_vision_UAE`
- [ ] `frontend/public/404.html` SPA redirect (already from CP01)
- [ ] `index.html` decode script (already from CP01)
- [ ] GitHub repo secrets: `GROQ_API_KEY`
- [ ] Test live URL after first deploy

Status: `pending`

---

### CHECKPOINT 09 — Mobile Polish + PWA Feel
**Goal:** Fully responsive, touch-optimised, feels native on iPhone/Android

Tasks:
- [ ] All buttons min 48px touch targets
- [ ] Hamburger sidebar on mobile
- [ ] Camera button prominent on mobile (main action)
- [ ] Mic button accessible with thumb (bottom bar)
- [ ] Meta viewport tag correct
- [ ] Smooth scroll, no horizontal overflow
- [ ] Test on mobile viewport (375px, 390px, 430px)

Status: `pending`

---

### CHECKPOINT 10 — README + Final Polish
**Goal:** Professional README for GitHub, final QA

Tasks:
- [ ] README.md — title, live demo link, screenshots, architecture, tech stack, quick start
- [ ] MIT License — educational/non-commercial
- [ ] Final QA — voice, camera, chat, location all tested
- [ ] Update README screenshots after deploy

Status: `pending`

---

## Execution Order

```
CP01 → CP02 → CP03 → CP04 → CP05 → CP06 → CP07 → CP08 → CP09 → CP10
 Setup   UI    Chat   Voice  Camera  TTS   Location  Deploy  Mobile  Docs
```

Each checkpoint is independently testable before moving to the next.
