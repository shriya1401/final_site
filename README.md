# AI on the Streets: Smarter Signals, Smarter People
### Girl Scout Gold Award Project Website

A fully interactive, production-ready website built with React + Vite + Tailwind CSS.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run locally (http://localhost:5173)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx          # Sticky nav with mobile menu & dark mode toggle
│   │   └── Footer.jsx          # Footer with page links
│   └── ui/
│       ├── AnimatedCounter.jsx # Counts up when scrolled into view
│       ├── GlassCard.jsx       # Glassmorphism card component
│       ├── SectionHeader.jsx   # Reusable section header
│       ├── NewsletterSignup.jsx# Email signup form
│       └── TestimonialsCarousel.jsx # Auto-paginating testimonials
├── data/
│   ├── stats.json              # Home page stats & highlights
│   ├── learn.json              # AI topics & quiz questions
│   ├── cybersecurity.json      # Cyber topics & quiz
│   ├── workshops.json          # Workshop details & agendas
│   ├── resources.json          # Downloadable resource metadata
│   └── impact.json             # Goals, metrics, testimonials
├── pages/
│   ├── Home.jsx                # Landing page with hero, stats, highlights
│   ├── Simulation.jsx          # Interactive traffic simulation (3 modes)
│   ├── LearnAI.jsx             # AI topics accordion + quiz
│   ├── Cybersecurity.jsx       # Cyber topics + interactive quiz
│   ├── Workshops.jsx           # Workshop cards + request form
│   ├── Resources.jsx           # Searchable resource library
│   ├── Impact.jsx              # Charts, goals, testimonials
│   └── About.jsx               # Gold Award info, timeline, founder
└── utils/
    └── simulationEngine.js     # Traffic simulation (translated from Python notebooks)
```

---

## 🧠 Simulation Engine

The traffic simulation (`src/utils/simulationEngine.js`) is a direct JavaScript translation of the three Python notebooks from the Gold Award project:

| Mode | Notebook | Algorithm |
|------|----------|-----------|
| Mode A: Fixed Timer | `Smart_Signals_Stage1.ipynb` | Poisson arrivals + 30s/30s rigid cycle |
| Mode B: Sensor-Based | `Smart_Signals_Stage2_Induction.ipynb` | Actuated controller, min 10s / max 45s / gap 3s |
| Mode C: AI Adaptive | `Smart_Signals_Stage3_AI_RL.ipynb` | Q-learning greedy policy (serve longest queue) |

---

## ☁️ Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (run from project root)
vercel

# For production deployment
vercel --prod
```

Or push to GitHub and connect the repo at vercel.com — it auto-detects Vite.

Add this `vercel.json` for client-side routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## 🔮 Future Backend Integration

1. **Workshop request form** → Connect to Supabase or Airtable via their REST APIs
2. **Newsletter signup** → Integrate Mailchimp or ConvertKit API  
3. **Resource downloads** → Host files on S3/Cloudflare R2, update download links in `resources.json`
4. **Analytics** → Add Plausible or Google Analytics 4 to `index.html`
5. **CMS** → Replace JSON files with Contentful or Sanity for easy content updates
6. **Auth** → Add Supabase Auth if you want a teacher portal for tracking downloads

