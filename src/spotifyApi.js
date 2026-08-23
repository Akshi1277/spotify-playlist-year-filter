/**
 * Spotify API Wrapper with Deep Pagination and Smart Metadata Analysis
 */

/**
 * Standard fetch helper with auth header and error handling
 */
async function spotifyFetch(endpoint, token, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com/v1${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) {
    return null;
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 2;
    console.warn(`Rate limited by Spotify. Retrying after ${retryAfter}s`);
    await new Promise(res => setTimeout(res, (parseInt(retryAfter, 10) + 1) * 1000));
    return spotifyFetch(endpoint, token, options);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error?.message || data.error_description || data.message || `HTTP ${response.status} (${response.statusText})`;
    console.error(`Spotify API error on [${url}]:`, data);
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Fetch currently logged in user profile
 */
export async function fetchCurrentUser(token) {
  return await spotifyFetch('/me', token);
}

/**
 * Fetch all playlists owned or followed by current user (with pagination)
 */
export async function fetchUserPlaylists(token) {
  const playlists = [];
  let nextUrl = '/me/playlists?limit=50';

  while (nextUrl) {
    const data = await spotifyFetch(nextUrl, token);
    if (data.items) {
      playlists.push(...data.items.filter(Boolean));
    }
    nextUrl = data.next;
  }

  return playlists;
}

/**
 * Smart Year Parser for Bollywood / General Music
 * Looks at:
 * 1. Album release date
 * 2. Regex for movie / song years in titles e.g. "Tum Hi Ho (From 'Aashiqui 2 - 2013')" or "Kal Ho Naa Ho (2003)"
 */
export function extractReleaseYear(track) {
  let albumYear = null;
  
  if (track?.album?.release_date) {
    const match = String(track.album.release_date).match(/^(\d{4})/);
    if (match) {
      albumYear = parseInt(match[1], 10);
    }
  }

  // Check if title or album title mentions an earlier movie year
  // e.g. (From "Don 2 - 2011"), (Original Motion Picture Soundtrack / 2007), (1998)
  const combinedText = `${track?.name || ''} ${track?.album?.name || ''}`;
  const yearRegexes = [
    /\b(19\d\d|200\d|201[0-9]|202[0-6])\b/g,
    /\((?:From\s+["']?[^"'\)]+["']?\s*[-–—]\s*)?(\d{4})\)/gi,
    /\[(?:From\s+["']?[^"'\]]+["']?\s*[-–—]\s*)?(\d{4})\]/gi
  ];

  let detectedYear = null;
  const allDetectedYears = [];

  for (const regex of yearRegexes) {
    try {
      const matches = [...combinedText.matchAll(regex)];
      for (const m of matches) {
        const y = parseInt(m[1] || m[0], 10);
        if (y >= 1940 && y <= 2030) {
          allDetectedYears.push(y);
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // If there's an explicit year in title that is older than album year (common for Bollywood compilation albums)
  if (allDetectedYears.length > 0) {
    const minYear = Math.min(...allDetectedYears);
    // If the title explicitly says 2003 but album says 2020 (compilation/remaster), trust the title year
    if (albumYear && minYear < albumYear) {
      detectedYear = minYear;
    }
  }

  const finalYear = detectedYear || albumYear || null;

  return {
    albumYear,
    detectedYear,
    finalYear,
    hasOverride: detectedYear !== null && detectedYear !== albumYear
  };
}

/**
 * Universal helpers to extract data across all Spotify API format revisions
 */
function getItemsArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj.items && Array.isArray(obj.items.items)) return obj.items.items;
  if (obj.tracks && Array.isArray(obj.tracks.items)) return obj.tracks.items;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.tracks)) return obj.tracks;
  return [];
}

function getTotalCount(obj) {
  if (!obj) return 0;
  if (typeof obj.items?.total === 'number') return obj.items.total;
  if (typeof obj.tracks?.total === 'number') return obj.tracks.total;
  if (typeof obj.total === 'number') return obj.total;
  return getItemsArray(obj).length;
}

function getNextUrl(obj) {
  if (!obj) return null;
  if (obj.items?.next) return obj.items.next;
  if (obj.tracks?.next) return obj.tracks.next;
  if (obj.next) return obj.next;
  return null;
}

/**
 * Helper to parse and normalize Spotify track objects
 */
function parseTrackItems(items, startIndex = 0) {
  const rawList = getItemsArray(items);
  if (!Array.isArray(rawList)) {
    return [];
  }
  
  return rawList
    .map((item, index) => {
      // Handles { item: { ... } }, { track: { ... } }, or direct track object
      const t = item?.item || item?.track || item;
      
      // Skip empty, deleted, or unplayable/delisted market restricted tracks
      if (!t || !t.name || t.name.trim() === '' || t.album?.release_date === '0000') {
        return null;
      }

      const isPlayable = t.is_playable !== false;
      const yearInfo = extractReleaseYear(t);
      
      return {
        id: t.id || `track-${startIndex + index}`,
        index: startIndex + index + 1,
        name: t.name,
        uri: t.uri || (t.id ? `spotify:track:${t.id}` : ''),
        durationMs: t.duration_ms || 0,
        previewUrl: t.preview_url || '',
        explicit: t.explicit || false,
        isPlayable: isPlayable,
        popularity: t.popularity || 0,
        artists: Array.isArray(t.artists) ? t.artists.map(a => a.name).filter(Boolean).join(', ') : 'Unknown Artist',
        artistsList: t.artists || [],
        albumName: t.album?.name || 'Unknown Album',
        albumId: t.album?.id || '',
        albumImage: t.album?.images?.[0]?.url || t.album?.images?.[1]?.url || '',
        albumReleaseDate: t.album?.release_date || 'Unknown',
        albumYear: yearInfo.albumYear,
        detectedYear: yearInfo.detectedYear,
        releaseYear: yearInfo.finalYear,
        isEstimatedYear: yearInfo.hasOverride
      };
    })
    .filter(Boolean);
}

/**
 * Fetch all tracks from a playlist handling full pagination (for 200+, 500+, or 2000+ songs)
 */
export async function fetchAllPlaylistTracks(token, playlistId, onProgress = null) {
  let allTracks = [];
  
  // 1. Fetch playlist metadata
  let initial = null;
  try {
    initial = await spotifyFetch(`/playlists/${playlistId}?market=from_token`, token);
  } catch (e) {
    console.warn('Fetching with market=from_token failed, retrying without market parameter...', e);
    initial = await spotifyFetch(`/playlists/${playlistId}`, token);
  }

  console.log('Spotify Raw Playlist Object:', initial);
  
  const total = getTotalCount(initial);
  const playlistInfo = {
    id: initial.id,
    name: initial.name || 'Spotify Playlist',
    description: initial.description || '',
    owner: initial.owner?.display_name || 'Spotify User',
    image: initial.images?.[0]?.url || '',
    totalTracks: total
  };

  // Process first batch of tracks if already included in the playlist object
  const initialItems = getItemsArray(initial);
  console.log(`Initial items found in playlist payload: ${initialItems.length}`);

  if (initialItems.length > 0) {
    const firstBatch = parseTrackItems(initialItems, allTracks.length);
    allTracks.push(...firstBatch);
    
    if (onProgress) {
      onProgress({
        fetched: allTracks.length,
        total: total || allTracks.length,
        percent: total > 0 ? Math.min(100, Math.round((allTracks.length / total) * 100)) : 100
      });
    }
  }

  // 2. Determine next URL to fetch
  let nextUrl = getNextUrl(initial);

  // If playlist metadata did not embed tracks directly, fetch from the dedicated /tracks endpoint
  if (allTracks.length === 0 && !nextUrl) {
    console.log('No embedded tracks in metadata payload, fetching from /tracks sub-endpoint...');
    nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  }

  while (nextUrl) {
    try {
      console.log('Fetching page from URL:', nextUrl);
      let data = null;
      try {
        data = await spotifyFetch(nextUrl, token);
      } catch (fetchErr) {
        if (nextUrl.includes('/tracks')) {
          const fallbackUrl = nextUrl.replace('/tracks', '/items');
          console.warn(`Fetch ${nextUrl} failed, trying fallback ${fallbackUrl}...`);
          data = await spotifyFetch(fallbackUrl, token);
        } else {
          throw fetchErr;
        }
      }

      console.log('Page response:', data);
      
      const pageItems = getItemsArray(data);
      if (pageItems.length > 0) {
        const nextBatch = parseTrackItems(pageItems, allTracks.length);
        allTracks.push(...nextBatch);
      }

      const pageTotal = getTotalCount(data) || total;
      if (onProgress) {
        onProgress({
          fetched: allTracks.length,
          total: pageTotal || allTracks.length,
          percent: pageTotal > 0 ? Math.min(100, Math.round((allTracks.length / pageTotal) * 100)) : 100
        });
      }

      nextUrl = getNextUrl(data);
    } catch (err) {
      console.warn('Pagination query error:', err);
      break;
    }
  }

  // Update final count on metadata
  playlistInfo.totalTracks = allTracks.length;
  console.log(`Finished loading playlist. Total parsed tracks: ${allTracks.length}`);

  return {
    playlistInfo,
    tracks: allTracks
  };
}

/**
 * Extract Playlist ID from URL or URI
 */
export function parsePlaylistId(input) {
  if (!input) return null;
  const clean = input.trim();
  
  // Format: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  if (clean.startsWith('spotify:playlist:')) {
    return clean.replace('spotify:playlist:', '');
  }
  
  // Format: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
  const urlMatch = clean.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Raw alphanumeric ID (e.g. 22 characters)
  if (/^[a-zA-Z0-9]{15,30}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Create a new playlist in current user's library
 */
export async function createPlaylist(token, userId, { name, description, isPublic = true }) {
  try {
    return await spotifyFetch('/me/playlists', token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description || '',
        public: isPublic
      })
    });
  } catch (err) {
    console.warn('POST /me/playlists failed, trying /users/{userId}/playlists...', err);
    return await spotifyFetch(`/users/${userId}/playlists`, token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description || '',
        public: isPublic
      })
    });
  }
}

/**
 * Add tracks to playlist with resilient chunking and fallback for restricted tracks
 */
export async function addTracksToPlaylist(token, playlistId, trackUris, onProgress = null) {
  // Ensure only valid track URIs are sent
  const validUris = trackUris.filter(uri => 
    typeof uri === 'string' && 
    uri.startsWith('spotify:track:') && 
    !uri.includes('undefined') &&
    uri.length > 20
  );

  if (validUris.length === 0) {
    throw new Error('No valid Spotify track URIs to add.');
  }

  const batchSize = 50;
  let added = 0;

  for (let i = 0; i < validUris.length; i += batchSize) {
    const batch = validUris.slice(i, i + batchSize);
    let batchSuccess = false;

    // 1. Try standard /tracks endpoint
    try {
      await spotifyFetch(`/playlists/${playlistId}/tracks`, token, {
        method: 'POST',
        body: JSON.stringify({ uris: batch })
      });
      added += batch.length;
      batchSuccess = true;
    } catch (err1) {
      console.warn('Batch /tracks failed, trying /items endpoint...', err1);
    }

    // 2. Try /items endpoint if /tracks failed
    if (!batchSuccess) {
      try {
        await spotifyFetch(`/playlists/${playlistId}/items`, token, {
          method: 'POST',
          body: JSON.stringify({ uris: batch })
        });
        added += batch.length;
        batchSuccess = true;
      } catch (err2) {
        console.warn('Batch /items failed, trying song-by-song to skip any delisted/restricted songs...', err2);
      }
    }

    // 3. Fallback: Add song-by-song to gracefully skip any delisted/greyed-out songs
    if (!batchSuccess) {
      for (const singleUri of batch) {
        try {
          await spotifyFetch(`/playlists/${playlistId}/tracks`, token, {
            method: 'POST',
            body: JSON.stringify({ uris: [singleUri] })
          });
          added++;
        } catch (singleErr) {
          try {
            await spotifyFetch(`/playlists/${playlistId}/items`, token, {
              method: 'POST',
              body: JSON.stringify({ uris: [singleUri] })
            });
            added++;
          } catch (e) {
            console.warn(`Skipping delisted/unplayable track URI: ${singleUri}`);
          }
        }
      }
    }

    if (onProgress) {
      onProgress({
        added,
        total: validUris.length,
        percent: Math.min(100, Math.round((added / validUris.length) * 100))
      });
    }
  }

  return { success: true, count: added };
}
