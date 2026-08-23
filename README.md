# Spotify Retro Playlist Filter 🎵📻

> A modern, client-side web application that connects to your Spotify account via PKCE OAuth, scans large playlists (200+ or 1,000+ tracks), extracts accurate album release years, and creates new curated era-specific playlists (e.g., **≤ 2015 Classics**, **90s Golden Era**, **2000s Nostalgia**) with a single click.

![Spotify Retro Filter](https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

- **🔒 100% Client-Side PKCE OAuth**: Runs entirely in the browser with zero backend server, zero database, and zero secrets exposed.
- **⚡ Deep Pagination**: Seamlessly fetches large playlists with 200+, 500+, or 2,000+ songs.
- **🎯 Smart Release Year Detection**: Extracts `album.release_date` and intelligently handles Bollywood compilation/remaster album edge cases (e.g. extracts original movie release years from tracks like `(From "Devdas - 2002")`).
- **🎛️ Interactive Filter Station**:
  - Real-time year cutoff slider (e.g. `≤ 2015`).
  - Era quick presets (`Pre-2015 Classics`, `2000s & 90s`, `Golden Era (≤ 2000)`, `All Tracks`).
  - Search by song title, artist, or album.
  - Sorting (Oldest First, Newest First, Title A-Z, Artist A-Z).
  - Manual toggle checkboxes to include/exclude any individual track.
- **🚀 1-Click Spotify Exporter**: Automatically creates the new playlist in your Spotify account with custom title, description, and celebratory confetti animation!
- **🛡️ Resilient Exporter**: Automatically skips dead/delisted/region-locked tracks so the export never crashes.

---

## 🛠️ Tech Stack

- **Framework**: Vanilla JavaScript (ES Modules) + HTML5 + Vanilla CSS
- **Bundler**: Vite
- **Auth**: Spotify Web API PKCE OAuth 2.0 Flow
- **Icons & Animations**: Canvas Confetti, Lucide Icons

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/spotify-retro-filter.git
cd spotify-retro-filter
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** (or `http://127.0.0.1:5173/`) in your browser.

---

## 🌐 Deploying to Vercel (Production Setup)

This project is 100% static and optimized for zero-config deployment on **Vercel**.

### Step 1: Push to GitHub
1. Create a new repository on GitHub (e.g., `spotify-retro-filter`).
2. Run the following in your terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/spotify-retro-filter.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com/) and click **"Add New Project"**.
2. Select your GitHub repository `spotify-retro-filter`.
3. Under **Environment Variables**, add:
   - `VITE_SPOTIFY_CLIENT_ID`: Your 32-character Spotify Client ID (optional, allows 1-click login for visitors).
4. Click **Deploy**. Vercel will give you a live URL like `https://spotify-retro-filter.vercel.app`.

### Step 3: Add Vercel URL to Spotify Developer Dashboard
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Click your App -> **Settings**.
3. Under **Redirect URIs**, add your live Vercel URL:
   ```
   https://spotify-retro-filter.vercel.app/
   ```
4. Click **Save**.

---

## 👥 Spotify Development Mode vs Public Users

- **Development Mode** (Default): Spotify allows up to 25 registered users. Add any friend or test user's email in your Spotify Developer Dashboard under **User Management**.
- **Public Quota Extension**: To open your app to unlimited public users without manually adding emails, submit a free **"Extension Request"** inside the Spotify Developer Dashboard (Settings -> Request Extension).

---

## 📄 License
MIT License. Feel free to use, modify, and distribute!
