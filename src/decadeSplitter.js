/**
 * Decade Splitter Engine
 * Segments a master playlist into discrete era collections and batch-exports them to Spotify
 */

import { createPlaylist, addTracksToPlaylist } from './spotifyApi.js';

export function segmentTracksByDecade(tracks) {
  const decades = [
    {
      id: 'vintage',
      name: 'Vintage Era',
      subtext: 'Tracks released in 1989 or earlier',
      min: 0,
      max: 1989,
      tracks: []
    },
    {
      id: '90s',
      name: '90s Golden Era',
      subtext: 'Tracks released between 1990 and 1999',
      min: 1990,
      max: 1999,
      tracks: []
    },
    {
      id: '2000s',
      name: '2000s Nostalgia',
      subtext: 'Tracks released between 2000 and 2009',
      min: 2000,
      max: 2009,
      tracks: []
    },
    {
      id: '2010s',
      name: '2010s Hits',
      subtext: 'Tracks released between 2010 and 2019',
      min: 2010,
      max: 2019,
      tracks: []
    },
    {
      id: '2020s',
      name: '2020s Modern',
      subtext: 'Tracks released in 2020 or later',
      min: 2020,
      max: 2099,
      tracks: []
    }
  ];

  tracks.forEach(track => {
    const year = track.releaseYear;
    if (!year) return;
    const bucket = decades.find(d => year >= d.min && year <= d.max);
    if (bucket) {
      bucket.tracks.push(track);
    }
  });

  // Only return buckets that contain at least 1 track
  return decades.filter(d => d.tracks.length > 0);
}

export async function executeDecadeSplitExport(token, userId, basePlaylistName, selectedBuckets, onProgress = null) {
  const results = [];
  const total = selectedBuckets.length;

  for (let i = 0; i < selectedBuckets.length; i++) {
    const bucket = selectedBuckets[i];
    const playlistTitle = `${basePlaylistName} (${bucket.name})`;
    const playlistDescription = `Curated ${bucket.name} collection (${bucket.subtext}) from ${basePlaylistName}. Exported with Spotify Playlist Filter.`;

    if (onProgress) {
      onProgress({
        currentIndex: i + 1,
        totalPlaylists: total,
        currentName: playlistTitle,
        percent: Math.round(((i) / total) * 100)
      });
    }

    // 1. Create playlist
    const newPlaylist = await createPlaylist(token, userId, {
      name: playlistTitle,
      description: playlistDescription,
      isPublic: true
    });

    // 2. Add tracks
    const trackUris = bucket.tracks.map(t => t.uri).filter(Boolean);
    if (trackUris.length > 0) {
      await addTracksToPlaylist(token, newPlaylist.id, trackUris);
    }

    results.push({
      bucketName: bucket.name,
      playlistId: newPlaylist.id,
      playlistUrl: newPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${newPlaylist.id}`,
      trackCount: trackUris.length
    });
  }

  if (onProgress) {
    onProgress({
      currentIndex: total,
      totalPlaylists: total,
      currentName: 'All playlists generated',
      percent: 100
    });
  }

  return results;
}
