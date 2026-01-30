# Daily Activity Tracker
**Consistency is key. Track, analyze, improve.**

A lightweight, browser-first tracker that started as a simple "daily journal" idea and evolved into a polished monthly activity system with visual progress, streaks, customization, and comparison.

**Live demo:** [https://rakibhossain.dev/activity-tracker/](https://rakibhossain.dev/activity-tracker/)

---

## Why I built this
I wanted a simple way to journal my daily activities â€” something fast, clean, and motivating.  
So I started shipping small versions, improving the UI/UX step-by-step based on what felt clearer and more useful.

---

## Key highlights
- **Monthly tracking view** designed for year-round usage
- **Per-activity progress states** (including "couldn't do today")
- **Daily completion overview** with visual feedback
- **Streak + monthly completion** insights (current version)
- **Customizable activity names** (built for everyone, not only my personal routine)
- **Local-first storage** (for now)

---

## Data storage note
Guest usage still stores data in your **browser storage**.  
If you clear browser cache/cookies/site data, your saved activities and progress will be lost.

Note: **New in v2.1:** optional **login + cloud sync** so data persists across devices and resets.

---

## Version journey (v1.0 - v2.1)

### v1.0 - The original "Daily Journal" idea
- First working version focused on logging daily activity entries.

![v1.0](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.0.png)

---

### v1.1 - Table-style layout
- Reframed the experience with a cleaner, structured **table look** for readability.

![v1.1](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.1.png)

---

### v1.2 - UI/UX refresh + 5-activity column system
- Major layout shift into a **5 activity-column view** for a more consistent daily structure.

![v1.2](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.2.png)

---

### v1.3 - Colored dropdown activity selection
- Introduced **color-coded dropdowns** to make selection faster and scanning easier.

![v1.3](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.3.png)

---

### v1.4 - Fixed activity names + completion checkboxes + daily overall %
- Locked activity names and added **checkbox completion**
- Added a **daily overall completion percentage** option

![v1.4](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.4.png)

---

### v1.5 - Per-activity percentage dropdown + daily completion % output
- Updated the UX so **each activity has its own % dropdown**
- Daily completion overview shown as **percentage**

![v1.5](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.5.png)

---

### v1.6 - Dashed-style daily completion overview
- Changed the daily completion overview into a **dashed progress bar** style for quicker visual interpretation.

![v1.6](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.6.png)

---

### v1.7 - Per-cell dashed bars + meaningful color logic + linear daily overview bar
- Added **dashed progress bars inside each activity cell**
- Implemented **meaningful color logic**
- Introduced a **smooth linear daily completion bar**

![v1.7](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.7.png)

---

### v1.8 - Massive UI redesign (theme-based progress dropdowns)
- Major visual redesign with **color-themed progress dropdown options**
- Focused on making each activity cell feel more "guided" and clear

![v1.8](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.8.png)

---

### v1.9 - Compare months + Customize activity names (built for all users)
- Added **Compare with another month**
- Added **Customize** so users can rename activities (because not everyone is a trader/coder)
- Strong step toward making this a public-friendly tool

![v1.9](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v1.9.png)

---

## v2.0 - Streaks + better overview clarity
- Updated the daily completion overview visual:
  - Added **percentage inside the color-themed progress bar**
- Added **streak** and **monthly completion summary** at the top for stronger motivation and faster insights
- This is the current public version hosted on my site (at the time)

![v2.0](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v2.0.png)

---

## v2.1 - Current version (login + cloud sync + streaks)
- Added **login** so progress can persist beyond local browser storage
- Introduced **cloud sync** for multi-device continuity (optional, not required for guest use)
- Retained the **streak** and **monthly completion summary** for motivation and faster insights
- This is the current public version hosted on my site

![v2.1](https://raw.githubusercontent.com/Rakib404H/30-Day-Activity-Tracker/refs/heads/main/resources/v2.1.png)

---

## Ongoing refinements (small but frequent)
Across versions, I continuously improved:
- Titles / labels / link text for clarity
- Tracker instructions and microcopy
- Motivational quote placement for better UX
- Layout spacing and element positions for readability
- Attribution line like: **"Personal activity tracker designed by Rakib Hossain."**

---

## Roadmap
- Smarter comparison insights (more than just "view another month")
- More visual analytics (trends, best days, consistency patterns)
- Iterations based on user feedback

---

## Credits
**Personal activity tracker designed by Rakib Hossain.**

---

## Development (Vite)
Prereqs: Node.js 18+.

1) Install dependencies
```
npm install
```

2) Create `.env` from `.env.example`
```
cp .env.example .env
```

3) Run dev server
```
npm run dev
```

### Build & preview
```
npm run build
npm run preview
```

### Lint & format
```
npm run lint
npm run format
```

### Deployment note
If you deploy under a subpath (for example `/activity-tracker/`), set `base` in `vite.config.js`.






