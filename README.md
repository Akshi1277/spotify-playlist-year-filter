# Spotify Playlist Year Filter 🎵📻

[![Live Website](https://img.shields.io/badge/Live%20Website-spotify--playlist--year--filter.vercel.app-1DB954?style=for-the-badge&logo=spotify&logoColor=white)](https://spotify-playlist-year-filter.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

> A modern, client-side web application that connects to Spotify via PKCE OAuth, scans large playlists (200+ or 1,000+ tracks), extracts accurate album release years, and creates new curated era-specific playlists (e.g., **≤ 2015 Classics**, **90s Golden Era**, **2000s Nostalgia**) with a single click.

---

## 🌐 Try the Live Website

You can use the tool right now in your browser without installing anything:  
👉 **[https://spotify-playlist-year-filter.vercel.app/](https://spotify-playlist-year-filter.vercel.app/)**

---

## 📖 How to Use (No Coding Required)

1. Open **[https://spotify-playlist-year-filter.vercel.app/](https://spotify-playlist-year-filter.vercel.app/)**.
2. **Connect with Spotify**:
   - Paste your Spotify **Client ID** (see [Spotify Setup](#-spotify-developer-setup) below for 1-minute free setup).
   - Click **Connect with Spotify** and authorize the app.
3. **Select & Filter**:
   - Choose any playlist from your library dropdown (or paste any Spotify playlist link).
   - The app scans all tracks and automatically detects album release years (including smart detection for Bollywood movie soundtracks and compilation albums).
   - Adjust the **Year Cutoff Slider** (e.g. `≤ 2015`) or pick a quick era preset (`Pre-2015 Classics`, `2000s & 90s`, `Golden Era`).
   - Review tracks in the interactive table, preview 30s audio clips, and manually toggle any songs.
4. **Export to Spotify**:
   - Click **Export to Spotify Playlist**.
   - Your brand-new era playlist is created directly in your Spotify library with celebratory confetti! 🎉

---

## ✨ Features

- **🔒 100% Client-Side & Private (PKCE OAuth)**: Runs entirely inside your browser. No backend server, no database, no passwords stored, and zero data leaves your local machine.
- **⚡ Deep Pagination Handling**: Effortlessly loads large playlists with 200+, 500+, or 2,000+ songs.
- **🎯 Smart Release Year Detection**: Extracts `album.release_date` and intelligently handles Bollywood compilation/remaster album edge cases (e.g., extracts original movie release years from tracks like `(From "Devdas - 2002")`).
- **🎛️ Interactive Filter Station**:
  - Real-time year cutoff slider (e.g. `≤ 2015`).
  - Era quick presets (`Pre-2015 Classics`, `2000s & 90s`, `Golden Era (≤ 2000)`, `All Tracks`).
  - Search by song title, artist, or album.
  - Sorting (Oldest First, Newest First, Title A-Z, Artist A-Z).
  - Manual toggle checkboxes to include/exclude any individual track.
- **🚀 1-Click Spotify Exporter**: Automatically creates the new playlist in your Spotify account with custom title and description.
- **🛡️ Resilient Exporter**: Automatically skips dead/delisted/region-locked tracks so the export never fails.

---

## 🔑 Spotify Developer Setup (1-Minute Guide)

Because Spotify requires user permission to read and create playlists on your account:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create app**:
   - **App name**: `Spotify Playlist Year Filter`
   - **App description**: `Filter playlists by release year`
   - **Redirect URIs**: Add:
     ```
     https://spotify-playlist-year-filter.vercel.app/
     ```
     *(If running locally, also add `http://127.0.0.1:5173/` and `http://localhost:5173/`)*
   - **Which API/SDKs are you planning to use?**: Check **Web API**.
3. Check the terms checkbox and click **Save**.
4. Go to **Settings** and copy your **Client ID**.
5. Paste your **Client ID** into the web app and click **Connect with Spotify**!

---

## 💻 Running Locally (For Developers)

### 1. Clone the repository
```bash
git clone https://github.com/Akshi1277/spotify-playlist-year-filter.git
cd spotify-playlist-year-filter
```

### 2. Install dependencies
```bash
npm install
```

### 3. (Optional) Set up Environment Variable
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Spotify Client ID in `.env`:
```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** (or `http://127.0.0.1:5173/`) in your browser.

### 5. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## 🔒 Security & Privacy

This application uses the **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**:
- **No Client Secret**: PKCE is specifically designed for Single Page Applications so that no secret keys are ever exposed in client code.
- **Data Privacy**: All playlist analysis and filtering occurs strictly in your browser session. No playlist data or personal information is ever logged, collected, or transmitted to any external server.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute it!

---

⭐ **If you found this tool helpful, consider starring the repo on GitHub!**
