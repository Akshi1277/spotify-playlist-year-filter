/**
 * artistSplitter.js
 * 1-Click Artist Batch Splitter module
 * Automatically segments a master playlist by top contributing artists
 * and creates individual mini-playlists in Spotify in a single batch.
 */

import { createPlaylist, addTracksToPlaylist, uploadPlaylistCover } from './spotifyApi.js';
import { generateRetroCoverArt } from './coverArt.js';

export function groupTracksByTopArtists(tracks, minTrackThreshold = 2) {
  const artistMap = new Map();

  for (const track of tracks) {
    if (!track.artists || track.artists.length === 0) continue;
    for (const artist of track.artists) {
      if (!artist.name) continue;
      const key = artist.name.trim();
      if (!artistMap.has(key)) {
        artistMap.set(key, {
          artistName: key,
          artistId: artist.id,
          tracks: []
        });
      }
      // Avoid duplicate tracks per artist if multi-credited
      const entry = artistMap.get(key);
      if (!entry.tracks.some(t => t.id === track.id)) {
        entry.tracks.push(track);
      }
    }
  }

  // Filter artists that have at least minTrackThreshold songs, sorted descending by count
  return Array.from(artistMap.values())
    .filter(item => item.tracks.length >= minTrackThreshold)
    .sort((a, b) => b.tracks.length - a.tracks.length);
}

export function renderArtistSplitterList(container, artistGroups, sourcePlaylistTitle) {
  if (artistGroups.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No artists with 2 or more songs found in this playlist.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = artistGroups.map((group, index) => {
    const suggestedTitle = `${group.artistName} Essentials (from ${sourcePlaylistTitle})`;
    return `
      <div class="decade-bucket-card artist-bucket-card" data-artist="${encodeURIComponent(group.artistName)}">
        <div class="bucket-left">
          <input type="checkbox" id="artistCheck_${index}" class="artist-bucket-checkbox" data-index="${index}" checked />
          <div class="bucket-info">
            <h4 class="bucket-title">${escapeHtml(group.artistName)}</h4>
            <span class="bucket-sub">${group.tracks.length} tracks found</span>
          </div>
        </div>
        <div class="bucket-right">
          <input type="text" class="artist-bucket-name-input" data-index="${index}" value="${escapeHtml(suggestedTitle)}" />
          <span class="bucket-count-badge">${group.tracks.length} songs</span>
        </div>
      </div>
    `;
  }).join('');
}

export async function executeArtistBatchSplit({
  token,
  userId,
  selectedGroups,
  sourcePlaylistTitle,
  onProgress,
  attachCustomCover = true
}) {
  const createdPlaylists = [];
  const total = selectedGroups.length;

  for (let i = 0; i < total; i++) {
    const group = selectedGroups[i];
    const customTitle = group.customTitle || `${group.artistName} Essentials`;
    const description = `Curated ${group.tracks.length} tracks by ${group.artistName} extracted from ${sourcePlaylistTitle} via Playlist Year Filter for Spotify.`;

    if (onProgress) {
      onProgress({
        currentIndex: i + 1,
        total,
        currentArtist: group.artistName,
        stage: 'creating'
      });
    }

    // 1. Create Playlist
    const newPlaylist = await createPlaylist(token, userId, {
      name: customTitle,
      description: description,
      isPublic: true
    });
    
    // 2. Add Tracks in chunks
    const uris = group.tracks.map(t => t.uri);
    await addTracksToPlaylist(token, newPlaylist.id, uris);

    // 3. Optional Cover Art
    if (attachCustomCover) {
      try {
        if (onProgress) {
          onProgress({
            currentIndex: i + 1,
            total,
            currentArtist: group.artistName,
            stage: 'cover'
          });
        }
        const cover = generateRetroCoverArt(group.artistName, `${group.tracks.length} TRACKS`, 'Artist Collection');
        await uploadPlaylistCover(token, newPlaylist.id, cover.base64Data);
      } catch (err) {
        console.warn(`Cover upload skipped for ${group.artistName}:`, err);
      }
    }

    createdPlaylists.push({
      artist: group.artistName,
      title: customTitle,
      count: group.tracks.length,
      url: newPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${newPlaylist.id}`,
      id: newPlaylist.id
    });
  }

  return createdPlaylists;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
