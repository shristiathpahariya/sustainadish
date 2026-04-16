# SustainaDish

**Cook smarter, waste less.** SustainaDish is a full-stack web app that turns what you already have in the kitchen into recipe ideas—with sustainability in mind.

---

## Live site

The app is **live** at:

**[https://sustainadish.vercel.app/](https://sustainadish.vercel.app/)**

Open it in your browser to explore the landing experience, recipe recommendations from your ingredients, and the rest of the product.

---

## What it does

- **Recipe recommendations** — Enter ingredients (comma-separated) and get suggestions powered by a Python ML service (TF-IDF + embeddings).
- **Modern UI** — React + Vite front end with motion and a polished landing flow.
- **Backend API** — Node.js / Express with MongoDB for auth, messages, feedback, and donations.

---

## Tech stack

| Layer        | Technologies                                      |
| ------------ | ------------------------------------------------- |
| Front end    | React 18, Vite, Tailwind CSS, Framer Motion, GSAP |
| API          | Express, Mongoose, JWT, cookie-based auth         |
| ML service   | Flask, scikit-learn, NLTK, Gensim                 |

---

## Local development

**Prerequisites:** Node.js 18+, npm, Python 3.x (for the Flask ML app), MongoDB (for the Node API).

```bash
# Install front-end dependencies
npm install

# Start the Vite dev server (see package.json for the dev port)
npm run dev
```

```bash
# Node API (from repo root)
npm run backend
# or: cd Backend && npm install && npm start
```

Configure environment variables using `Backend/.env.example` as a reference. For recipe recommendations, point the front end at your ML service URL as configured in your app.

```bash
# Flask ML service (example)
cd Backend
python app.py
```

---

## Repository layout

- `src/` — React application (pages, components, styles)
- `Backend/` — Express server, routes, MongoDB models
- `Backend/app.py` — Flask API for `/recommend` and related ML endpoints

---

## License

This project is private unless otherwise noted by the authors.
