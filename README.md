# Spotify Playlist Filter

[![Live Website](https://img.shields.io/badge/Live%20Website-spotify--playlist--year--filter.vercel.app-1DB954?style=for-the-badge&logo=spotify&logoColor=white)](https://spotify-playlist-year-filter.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

A professional, client-side web application that connects to Spotify via PKCE OAuth to analyze, filter, and segment playlists by release year. Features dual-range era window filtering, batch decade splitting, visual timeline analytics, downloadable Instagram Story cards, generative retro cover art, and 0ms IndexedDB local caching.

---

## Live Website

Use the tool directly in your browser without installing any software:  
**[https://spotify-playlist-year-filter.vercel.app/](https://spotify-playlist-year-filter.vercel.app/)**

---

## Key Capabilities

### 1. Dual-Range Era Window Filtering
- Adjust both **Minimum Year** and **Maximum Year** sliders to isolate specific memory brackets (such as `2005 to 2012` for peak nostalgia or `1990 to 1999` for pure 90s classics).
- One-click presets: `Pre-2015 Classics`, `2000s Nostalgia (2000-2009)`, `Pure 90s (1990-1999)`, `Golden Era (<= 2000)`, `All Tracks`.

### 2. 1-Click Decade Splitter (Batch Generation)
- Automatically segment large playlists (200+ or 1,000+ tracks) into separate decade collections (`Vintage Era`, `90s Golden Era`, `2000s Nostalgia`, `2010s Hits`, `2020s Modern`).
- Creates and populates all selected decade playlists in your Spotify account in a single batch.

### 3. Interactive Timeline Era Analytics
- Zero-dependency Canvas chart visualizing the chronological distribution of tracks across decades before and after filtering.

### 4. Downloadable Social Story Card (Instagram & Twitter)
- Generates a high-resolution 1080x1920 graphic summarizing your playlist DNA:
  - Era percentage breakdown (e.g. `58% 2000s`, `28% 90s`, `14% Recent`).
  - Top 5 oldest classic songs found.
  - Direct PNG download ready for social media sharing.

### 5. Generative Retro Playlist Cover Art
- Automatically renders minimalist vinyl-groove cover art with embedded playlist typography and uploads it directly to newly created Spotify playlists.

### 6. High Performance & Offline Caching
- **IndexedDB Local Cache**: Analyzed playlists load in 0ms on subsequent visits without repeated Spotify API calls.
- **Progressive Web App (PWA)**: Installable on iOS and Android home screens.

---

## User Guide

1. Open **[https://spotify-playlist-year-filter.vercel.app/](https://spotify-playlist-year-filter.vercel.app/)**.
2. **Connect with Spotify**:
   - Paste your Spotify **Client ID** (see [Spotify Developer Setup](#spotify-developer-setup) below for the 1-minute free setup).
   - Click **Connect with Spotify** and authorize the application.
3. **Analyze and Filter**:
   - Choose any playlist created by your account from the dropdown or paste your playlist link.
   - Adjust the **Dual Slider Range** to select your target era bracket.
   - Use the **Timeline Chart** to inspect decade density.
   - Click **Share Story Card** to download your playlist DNA graphic.
   - Click **Decade Splitter** to batch-generate decade playlists.
4. **Export to Spotify**:
   - Click **Export to Spotify Playlist** to create the curated playlist with optional custom cover art.

---

## Spotify Developer Setup

Because Spotify requires user authorization to read and create playlists on your account:

1. Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
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
4. Navigate to **Settings** and copy your **Client ID**.
5. Paste your **Client ID** into the web app and click **Connect with Spotify**.

---

## Local Development

### 1. Clone the repository
```bash
git clone https://github.com/Akshi1277/spotify-playlist-year-filter.git
cd spotify-playlist-year-filter
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional)
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

### 5. Production Build
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## Security and Privacy

This application implements the **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**:
- **No Client Secret**: PKCE is specifically designed for Single Page Applications so that no secret keys are ever exposed in client code.
- **Data Privacy**: All playlist analysis and filtering occurs strictly in your browser session. No playlist data or personal information is ever logged, collected, or transmitted to any external server.

---

## License

This project is licensed under the **MIT License**.
