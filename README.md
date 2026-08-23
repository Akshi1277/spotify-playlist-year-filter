# Spotify Playlist Year Filter

[![Live Website](https://img.shields.io/badge/Live%20Website-spotify--playlist--year--filter.vercel.app-1DB954?style=for-the-badge&logo=spotify&logoColor=white)](https://spotify-playlist-year-filter.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

A professional, client-side web application that connects to Spotify via PKCE OAuth, scans large playlists (200+ or 1,000+ tracks), extracts accurate album release years, and creates new curated era-specific playlists (such as **<= 2015 Classics**, **90s Golden Era**, or **2000s Nostalgia**) with a single click.

---

## Live Website

You can use the tool directly in your browser without installing any software:  
**[https://spotify-playlist-year-filter.vercel.app/](https://spotify-playlist-year-filter.vercel.app/)**

---

## User Guide

1. Open **[https://spotify-playlist-year-filter.vercel.app/](https://spotify-playlist-year-filter.vercel.app/)**.
2. **Connect with Spotify**:
   - Paste your Spotify **Client ID** (see [Spotify Developer Setup](#spotify-developer-setup) below for the 1-minute free setup).
   - Click **Connect with Spotify** and authorize the application.
3. **Select and Filter**:
   - Choose any playlist from your library dropdown or paste any Spotify playlist link.
   - The application scans all tracks and automatically detects album release years (including smart detection for movie soundtracks and compilation albums).
   - Adjust the **Year Cutoff Slider** (e.g. `<= 2015`) or select a preset era (`Pre-2015 Classics`, `2000s & 90s`, `Golden Era`).
   - Review tracks in the table, preview audio clips, and manually toggle individual songs if needed.
4. **Export to Spotify**:
   - Click **Export to Spotify Playlist**.
   - Your new playlist will be created directly in your Spotify library.

---

## Features

- **Client-Side PKCE OAuth**: Operates entirely within the browser. No backend server, no database, no passwords stored, and zero data leaves your local machine.
- **Deep Pagination Handling**: Reliably processes large playlists with 200, 500, or 2,000+ songs.
- **Smart Release Year Detection**: Extracts `album.release_date` and intelligently handles compilation and remaster album edge cases (such as extracting original movie release years from tracks like `From "Devdas - 2002"`).
- **Interactive Filter Controls**:
  - Real-time year cutoff slider.
  - Quick era presets (`Pre-2015 Classics`, `2000s & 90s`, `Golden Era`, `All Tracks`).
  - Search by song title, artist, or album.
  - Sorting (Oldest First, Newest First, Title A-Z, Artist A-Z).
  - Manual toggle checkboxes to include or exclude any specific track.
- **Direct Spotify Exporter**: Automatically creates the new playlist in your Spotify account with custom title and description.
- **Resilient Exporter**: Automatically skips delisted or region-locked tracks so the export never fails.

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
