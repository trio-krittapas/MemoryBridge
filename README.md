# MemoryBridge

> Personalized AI companion for dementia patients in Singapore — combining conversational AI, music therapy, reminiscence therapy, cognitive exercises, and passive speech-based cognitive monitoring.

**Built for:** NAISC 2026 Competition (LKCMedicine Track B)

---

## Features

✅ **Bilingual Voice Chat** (English, Mandarin, Cantonese)  
✅ **Life Story RAG** (Context-aware conversations)  
✅ **Music Therapy** (Spotify integration for reminiscence)  
✅ **Cognitive Exercises** (Naming, word recall, category fluency)  
✅ **Speech Analysis** (Passive cognitive monitoring)  
✅ **Caregiver Dashboard** (Real-time wellness tracking)  
✅ **Elderly-Friendly UI** (Large text, voice-first design)

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Ollama** installed (for local development)
  - Models: `qwen2.5:7b`, `nomic-embed-text`
- **Supabase** project (free tier OK)
- **Python 3.9+** (for speech analysis sidecar)

### Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/memorybridge.git
   cd memorybridge
   npm install
   ```

2. **Create `.env.local`** from `.env.example`:
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase and Spotify credentials
   ```

3. **Set up Supabase:**
   - Create project at [supabase.com](https://supabase.com)
   - Enable pgvector extension
   - Run migrations from `supabase/migrations/` in SQL editor
   - Copy API keys to `.env.local`

4. **Start services:**
   ```bash
   # Terminal 1: Start Ollama
   ollama serve

   # Terminal 2: Start Python sidecar
   cd python
   python -m venv venv
   .\venv\Scripts\activate  # or source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload

   # Terminal 3: Start Next.js app
   npm run dev
   ```

5. **Open** http://localhost:3000

---

## Project Structure

```
memorybridge/
├── app/                      # Next.js App Router
│   ├── (patient)/           # Patient-facing pages
│   ├── (caregiver)/         # Caregiver dashboard
│   ├── (auth)/              # Authentication
│   └── api/                 # API routes (chat, exercises, music, etc)
├── components/              # Reusable React components
├── lib/                     # Utilities (Supabase, AI, speech, etc)
├── supabase/               # Database migrations
├── public/                 # Static assets
└── styles/                 # Global styles

python/                      # FastAPI sidecar for speech analysis
├── main.py                 # FastAPI app
├── transcribe.py           # Whisper transcription
├── analyze_linguistic.py    # spaCy/NLTK analysis
└── analyze_acoustic.py      # openSMILE features
```

---

## Testing

See [TESTING.md](./TESTING.md) for detailed testing guide with mock data.

### Quick Test Checklist
- [ ] Text chat works
- [ ] Voice input works (Chrome/Edge)
- [ ] Language toggle (English ↔ Mandarin)
- [ ] Life story RAG injection
- [ ] Exercises score correctly
- [ ] Caregiver dashboard loads

---

## Deployment to Vercel

### Prerequisites
- GitHub account with repo pushed
- Vercel account
- Production Supabase project
- OpenAI API key (for production LLM)

### Deploy

1. **Push to GitHub** (see `GITHUB_SETUP.md`)

2. **Import to Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your repo
   - Set **Root Directory** to `memorybridge`
   - Click Deploy

3. **Configure Environment Variables** in Vercel Dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL          = your production URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY     = your anon key
   SUPABASE_SERVICE_ROLE_KEY         = your service role key
   LLM_PROVIDER                      = openai
   OPENAI_API_KEY                    = your API key
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID     = your client ID
   SPOTIFY_CLIENT_SECRET             = your client secret
   NEXT_PUBLIC_SPOTIFY_REDIRECT_URI  = https://your-domain.vercel.app/api/spotify/callback
   ```

4. **Update Supabase URLs:**
   - Settings → Authentication → URL Configuration
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/**`

5. **Update Spotify Redirect URI:**
   - Developer Dashboard → App Settings
   - Add: `https://your-domain.vercel.app/api/spotify/callback`

6. **Deploy Python Sidecar** (optional, for full feature set):
   - Use Railway.app or Render.com
   - Set `PYTHON_SIDECAR_URL` in Vercel env vars

---

## Documentation

- [SETUP.md](./SETUP.md) — Local development setup
- [BUILD_GUIDE.md](./BUILD_GUIDE.md) — 8-phase implementation roadmap
- [TESTING.md](./TESTING.md) — Testing guide + mock data
- [GITHUB_SETUP.md](./GITHUB_SETUP.md) — GitHub upload guide
- [VERCEL_SETUP.md](./VERCEL_SETUP.md) — Vercel deployment guide

---

## Architecture

**Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui  
**Backend:** Supabase (PostgreSQL + pgvector + Auth)  
**LLM:** Ollama (dev) / OpenAI (prod)  
**Speech:** OpenAI Whisper + Web Speech API  
**Music:** Spotify Web Playback SDK  
**Analysis:** Python FastAPI sidecar (spaCy, openSMILE)  
**Deployment:** Vercel (frontend) + Railway/Render (Python sidecar)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| API | Next.js Route Handlers (App Router) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| LLM | Ollama (local) / OpenAI (production) |
| Embedding | nomic-embed-text |
| Voice Input | Web Speech API |
| Voice Output | Browser TTS |
| Music | Spotify Web Playback SDK |
| Speech Analysis | Python FastAPI + Whisper + spaCy + openSMILE |
| Deployment | Vercel + Railway/Render |

---

## Contributing

This is a NAISC 2026 competition entry. Pull requests welcome!

---

## License

MIT

---

## Contact

**Team:** MemoryBridge  
**Email:** support@memorybridge.sg  
**GitHub:** https://github.com/YOUR_USERNAME/memorybridge

---

## Acknowledgments

- Singapore dementia patients & caregivers for inspiration
- NAISC 2026 organizers
- Open-source communities (Next.js, Vercel AI SDK, Supabase, etc.)
