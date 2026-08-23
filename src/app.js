import confetti from 'canvas-confetti';
import { 
  redirectToSpotifyAuth, 
  handleOAuthCallback, 
  getValidAccessToken, 
  logout, 
  getStoredClientId, 
  setStoredClientId,
  getRedirectUri
} from './auth.js';
import { 
  fetchCurrentUser, 
  fetchUserPlaylists, 
  fetchAllPlaylistTracks, 
  parsePlaylistId, 
  createPlaylist, 
  addTracksToPlaylist 
} from './spotifyApi.js';

// Application State
const state = {
  token: null,
  user: null,
  playlists: [],
  selectedPlaylistId: null,
  activePlaylistInfo: null,
  allTracks: [],
  
  // Filtering & Sorting State
  cutoffYear: 2015,
  isAllEraSelected: false,
  showOnlyIncluded: true,
  searchQuery: '',
  sortBy: 'original',
  
  // Manual inclusions/exclusions toggled by user
  manualOverrides: new Map(), // trackId -> boolean (true: forced include, false: forced exclude)
  
  // Audio preview state
  currentlyPlayingId: null,
  
  // Processing flags
  isLoadingPlaylist: false,
  isExporting: false
};

// DOM Elements
const elements = {
  // Auth
  authStatusContainer: document.getElementById('authStatusContainer'),
  authSection: document.getElementById('authSection'),
  mainWorkspace: document.getElementById('mainWorkspace'),
  clientIdInput: document.getElementById('clientIdInput'),
  loginForm: document.getElementById('loginForm'),
  currentRedirectUri: document.getElementById('currentRedirectUri'),
  copyUriBtn: document.getElementById('copyUriBtn'),

  // Playlist Selection
  playlistSelect: document.getElementById('playlistSelect'),
  playlistUrlInput: document.getElementById('playlistUrlInput'),
  loadUrlBtn: document.getElementById('loadUrlBtn'),
  refreshPlaylistsBtn: document.getElementById('refreshPlaylistsBtn'),
  loadingProgressContainer: document.getElementById('loadingProgressContainer'),
  loadingStatusText: document.getElementById('loadingStatusText'),
  loadingPercentText: document.getElementById('loadingPercentText'),
  loadingProgressBar: document.getElementById('loadingProgressBar'),

  // Workspace / Filter Station
  filterWorkspace: document.getElementById('filterWorkspace'),
  bannerPlaylistImg: document.getElementById('bannerPlaylistImg'),
  bannerPlaylistTitle: document.getElementById('bannerPlaylistTitle'),
  bannerPlaylistDesc: document.getElementById('bannerPlaylistDesc'),
  bannerTotalCount: document.getElementById('bannerTotalCount'),
  bannerOwner: document.getElementById('bannerOwner'),

  // Slider & Presets
  yearSlider: document.getElementById('yearSlider'),
  currentSliderYearValue: document.getElementById('currentSliderYearValue'),
  eraPresetButtons: document.querySelectorAll('.preset-chip'),

  // Stats
  statIncludedCount: document.getElementById('statIncludedCount'),
  statExcludedCount: document.getElementById('statExcludedCount'),
  statExcludedYear: document.getElementById('statExcludedYear'),
  statTotalCount: document.getElementById('statTotalCount'),

  // Search & Filter controls
  trackSearchInput: document.getElementById('trackSearchInput'),
  showIncludedOnlyBtn: document.getElementById('showIncludedOnlyBtn'),
  showAllTracksBtn: document.getElementById('showAllTracksBtn'),
  trackSortSelect: document.getElementById('trackSortSelect'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  deselectAllBtn: document.getElementById('deselectAllBtn'),
  resetOverridesBtn: document.getElementById('resetOverridesBtn'),

  // Table
  headerMasterCheckbox: document.getElementById('headerMasterCheckbox'),
  tracksTableBody: document.getElementById('tracksTableBody'),
  noTracksState: document.getElementById('noTracksState'),

  // Floating Bar
  exportTrackCount: document.getElementById('exportTrackCount'),
  openExportModalBtn: document.getElementById('openExportModalBtn'),

  // Modals
  exportModal: document.getElementById('exportModal'),
  exportForm: document.getElementById('exportForm'),
  exportPlaylistName: document.getElementById('exportPlaylistName'),
  exportPlaylistDesc: document.getElementById('exportPlaylistDesc'),
  exportPlaylistPublic: document.getElementById('exportPlaylistPublic'),
  modalExportCount: document.getElementById('modalExportCount'),
  modalAccountName: document.getElementById('modalAccountName'),
  cancelExportBtn: document.getElementById('cancelExportBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  exportProgressContainer: document.getElementById('exportProgressContainer'),
  exportProgressStatus: document.getElementById('exportProgressStatus'),
  exportProgressPercent: document.getElementById('exportProgressPercent'),
  exportProgressBar: document.getElementById('exportProgressBar'),
  confirmExportBtn: document.getElementById('confirmExportBtn'),

  // Success Modal
  successModal: document.getElementById('successModal'),
  successSummaryText: document.getElementById('successSummaryText'),
  openInSpotifyBtn: document.getElementById('openInSpotifyBtn'),
  closeSuccessBtn: document.getElementById('closeSuccessBtn'),

  // Audio
  audioPreviewPlayer: document.getElementById('audioPreviewPlayer')
};

// Initialize Application
async function init() {
  // Update redirect URI in UI
  const currentUri = getRedirectUri();
  if (elements.currentRedirectUri) {
    elements.currentRedirectUri.textContent = currentUri;
  }

  // Pre-fill stored client ID
  const storedId = getStoredClientId();
  if (storedId && elements.clientIdInput) {
    elements.clientIdInput.value = storedId;
  }

  // Bind Event Listeners
  setupEventListeners();

  try {
    // Check if handling OAuth callback
    const callbackToken = await handleOAuthCallback();
    if (callbackToken) {
      state.token = callbackToken;
    } else {
      state.token = await getValidAccessToken();
    }

    if (state.token) {
      await loadAuthenticatedUser();
    } else {
      showAuthSection();
    }
  } catch (err) {
    console.error('Auth initialization error:', err);
    alert(`Authentication Notice: ${err.message}`);
    showAuthSection();
  }
}

function showAuthSection() {
  elements.authSection.classList.remove('hidden');
  elements.mainWorkspace.classList.add('hidden');
  elements.authStatusContainer.innerHTML = '';
}

async function loadAuthenticatedUser() {
  try {
    state.user = await fetchCurrentUser(state.token);
    elements.authSection.classList.add('hidden');
    elements.mainWorkspace.classList.remove('hidden');

    renderUserHeader();
    await loadUserPlaylists();
  } catch (err) {
    console.error('Failed to load user profile:', err);
    logout();
    showAuthSection();
  }
}

function renderUserHeader() {
  const avatarUrl = state.user.images?.[0]?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
  elements.authStatusContainer.innerHTML = `
    <div class="user-profile-badge">
      <img src="${avatarUrl}" alt="${state.user.display_name}" class="user-avatar" />
      <span class="user-name">${state.user.display_name}</span>
      <button id="logoutBtn" class="btn-sm btn-ghost" title="Disconnect account">Log out</button>
    </div>
  `;

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    logout();
    window.location.reload();
  });
}

async function loadUserPlaylists() {
  try {
    elements.refreshPlaylistsBtn.textContent = 'Loading...';
    state.playlists = await fetchUserPlaylists(state.token);
    
    elements.playlistSelect.innerHTML = '<option value="">-- Choose a playlist created by you --</option>';
    
    // Only display playlists created/owned by the logged-in user
    const myPlaylists = state.playlists.filter(pl => {
      return !pl.owner || !state.user || pl.owner.id === state.user.id;
    });

    if (myPlaylists.length === 0) {
      elements.playlistSelect.innerHTML = '<option value="">No playlists created by your account found</option>';
    } else {
      myPlaylists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        const count = pl.tracks?.total ?? pl.total;
        opt.textContent = count !== undefined && count !== null 
          ? `${pl.name} (${count} tracks)` 
          : pl.name;
        elements.playlistSelect.appendChild(opt);
      });
    }

    elements.refreshPlaylistsBtn.textContent = 'Refresh';
  } catch (err) {
    console.error('Error fetching playlists:', err);
    elements.refreshPlaylistsBtn.textContent = 'Refresh';
  }
}

async function loadPlaylistTracks(playlistId) {
  if (!playlistId || state.isLoadingPlaylist) return;

  state.isLoadingPlaylist = true;
  state.selectedPlaylistId = playlistId;
  state.manualOverrides.clear();

  // Show loading progress
  elements.loadingProgressContainer.classList.remove('hidden');
  elements.loadingProgressBar.style.width = '0%';
  elements.loadingPercentText.textContent = '0%';
  elements.loadingStatusText.textContent = 'Fetching playlist details...';

  try {
    const result = await fetchAllPlaylistTracks(state.token, playlistId, (progress) => {
      elements.loadingStatusText.textContent = `Scanning & analyzing tracks (${progress.fetched} of ${progress.total})...`;
      elements.loadingPercentText.textContent = `${progress.percent}%`;
      elements.loadingProgressBar.style.width = `${progress.percent}%`;
    });

    state.activePlaylistInfo = result.playlistInfo;
    state.allTracks = result.tracks;

    // Render playlist banner
    elements.bannerPlaylistImg.src = state.activePlaylistInfo.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';
    elements.bannerPlaylistTitle.textContent = state.activePlaylistInfo.name;
    elements.bannerPlaylistDesc.textContent = state.activePlaylistInfo.description || 'No description';
    elements.bannerTotalCount.textContent = `${state.allTracks.length} tracks`;
    elements.bannerOwner.textContent = `By ${state.activePlaylistInfo.owner}`;

    // Set default export playlist name
    elements.exportPlaylistName.value = `${state.activePlaylistInfo.name} (<= 2015 Retro Classics)`;

    elements.filterWorkspace.classList.remove('hidden');
    elements.loadingProgressContainer.classList.add('hidden');

    applyFiltersAndRender();
  } catch (err) {
    console.error('Failed to load playlist tracks:', err);
    alert(`Failed to load playlist: ${err.message}`);
    elements.loadingProgressContainer.classList.add('hidden');
  } finally {
    state.isLoadingPlaylist = false;
  }
}

function isTrackIncluded(track) {
  // Check for manual user override first
  if (state.manualOverrides.has(track.id)) {
    return state.manualOverrides.get(track.id);
  }

  // If "All Era" is selected
  if (state.isAllEraSelected) {
    return true;
  }

  // Check release year
  if (!track.releaseYear) {
    return false;
  }

  return track.releaseYear <= state.cutoffYear;
}

function applyFiltersAndRender() {
  const query = state.searchQuery.toLowerCase().trim();

  // Calculate inclusion stats for all tracks
  let includedCount = 0;
  let excludedCount = 0;

  state.allTracks.forEach(track => {
    if (isTrackIncluded(track)) {
      includedCount++;
    } else {
      excludedCount++;
    }
  });

  // Filter for display
  let displayTracks = state.allTracks.filter(track => {
    const isInc = isTrackIncluded(track);
    
    // View mode filter
    if (state.showOnlyIncluded && !isInc) {
      return false;
    }

    // Search query filter
    if (query) {
      const matchTitle = track.name.toLowerCase().includes(query);
      const matchArtist = track.artists.toLowerCase().includes(query);
      const matchAlbum = track.albumName.toLowerCase().includes(query);
      if (!matchTitle && !matchArtist && !matchAlbum) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  displayTracks.sort((a, b) => {
    if (state.sortBy === 'year-asc') {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999);
    }
    if (state.sortBy === 'year-desc') {
      return (b.releaseYear || 0) - (a.releaseYear || 0);
    }
    if (state.sortBy === 'title-asc') {
      return a.name.localeCompare(b.name);
    }
    if (state.sortBy === 'artist-asc') {
      return a.artists.localeCompare(b.artists);
    }
    return a.index - b.index;
  });

  // Update UI Stats
  elements.statIncludedCount.textContent = includedCount;
  elements.statExcludedCount.textContent = excludedCount;
  elements.statTotalCount.textContent = state.allTracks.length;
  elements.statExcludedYear.textContent = state.isAllEraSelected ? 'All' : state.cutoffYear;
  elements.exportTrackCount.textContent = includedCount;
  elements.modalExportCount.textContent = includedCount;

  // Render Table Rows
  renderTracksTable(displayTracks);
}

function renderTracksTable(tracks) {
  elements.tracksTableBody.innerHTML = '';

  if (tracks.length === 0) {
    elements.noTracksState.classList.remove('hidden');
    elements.headerMasterCheckbox.checked = false;
    return;
  }

  elements.noTracksState.classList.add('hidden');

  const fragment = document.createDocumentFragment();

  tracks.forEach(track => {
    const isInc = isTrackIncluded(track);
    const year = track.releaseYear || 'Unknown';
    const isRetro = track.releaseYear && track.releaseYear <= 2015;

    const row = document.createElement('div');
    row.className = `track-row ${isInc ? 'is-included' : 'is-excluded'}`;
    row.dataset.trackId = track.id;

    row.innerHTML = `
      <div class="col-check">
        <input type="checkbox" class="track-checkbox" data-track-id="${track.id}" ${isInc ? 'checked' : ''} />
      </div>
      <div class="col-num">${track.index}</div>
      <div class="col-art">
        <img src="${track.albumImage || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=60&auto=format&fit=crop&q=80'}" alt="" class="track-row-art" loading="lazy" />
      </div>
      <div class="col-title track-title-box">
        <span class="track-name" title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</span>
        <span class="track-artists" title="${escapeHtml(track.artists)}">${escapeHtml(track.artists)}</span>
      </div>
      <div class="col-album track-album" title="${escapeHtml(track.albumName)}">
        ${escapeHtml(track.albumName)}
      </div>
      <div class="col-year">
        <span class="year-badge ${isRetro ? 'retro-hit' : 'recent-hit'}" title="Album date: ${track.albumReleaseDate}">
          ${year}
        </span>
      </div>
      <div class="col-status">
        <span class="status-badge ${isInc ? 'included' : 'excluded'}">
          ${isInc ? 'Included' : 'Excluded'}
        </span>
      </div>
      <div class="col-preview">
        ${track.previewUrl ? `
          <button class="btn-preview" data-preview-url="${track.previewUrl}" data-track-id="${track.id}" title="Play 30s preview">
            Play
          </button>
        ` : `<span style="color:var(--text-muted);font-size:0.8rem;">—</span>`}
      </div>
    `;

    fragment.appendChild(row);
  });

  elements.tracksTableBody.appendChild(fragment);

  // Update master checkbox state
  const visibleCheckboxes = elements.tracksTableBody.querySelectorAll('.track-checkbox');
  const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
  elements.headerMasterCheckbox.checked = visibleCheckboxes.length > 0 && allChecked;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Audio Player Handling
function toggleAudioPreview(button) {
  const previewUrl = button.dataset.previewUrl;
  const trackId = button.dataset.trackId;

  if (state.currentlyPlayingId === trackId) {
    elements.audioPreviewPlayer.pause();
    state.currentlyPlayingId = null;
    button.textContent = 'Play';
    button.classList.remove('playing');
  } else {
    // Reset any other playing button
    document.querySelectorAll('.btn-preview.playing').forEach(btn => {
      btn.textContent = 'Play';
      btn.classList.remove('playing');
    });

    elements.audioPreviewPlayer.src = previewUrl;
    elements.audioPreviewPlayer.play();
    state.currentlyPlayingId = trackId;
    button.textContent = 'Pause';
    button.classList.add('playing');

    elements.audioPreviewPlayer.onended = () => {
      state.currentlyPlayingId = null;
      button.textContent = 'Play';
      button.classList.remove('playing');
    };
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Login Form
  elements.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = elements.clientIdInput.value.trim();
    if (!clientId) {
      alert('Please enter your Spotify Client ID');
      return;
    }
    try {
      await redirectToSpotifyAuth(clientId);
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  });

  // Copy URI button
  elements.copyUriBtn?.addEventListener('click', () => {
    const uri = getRedirectUri();
    navigator.clipboard.writeText(uri).then(() => {
      elements.copyUriBtn.textContent = 'Copied!';
      setTimeout(() => {
        elements.copyUriBtn.textContent = 'Copy';
      }, 2000);
    });
  });

  // Select Playlist Dropdown
  elements.playlistSelect?.addEventListener('change', (e) => {
    const id = e.target.value;
    if (id) {
      loadPlaylistTracks(id);
    }
  });

  // Load URL Button
  elements.loadUrlBtn?.addEventListener('click', () => {
    const inputVal = elements.playlistUrlInput.value;
    const parsedId = parsePlaylistId(inputVal);
    if (!parsedId) {
      alert('Please enter a valid Spotify Playlist URL or URI.');
      return;
    }
    loadPlaylistTracks(parsedId);
  });

  // Refresh Playlists Button
  elements.refreshPlaylistsBtn?.addEventListener('click', () => {
    loadUserPlaylists();
  });

  // Year Slider
  elements.yearSlider?.addEventListener('input', (e) => {
    state.cutoffYear = parseInt(e.target.value, 10);
    state.isAllEraSelected = false;
    elements.currentSliderYearValue.textContent = `≤ ${state.cutoffYear}`;

    // Update preset buttons active state
    elements.eraPresetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.year === state.cutoffYear.toString());
    });

    applyFiltersAndRender();
  });

  // Preset Chips
  elements.eraPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.eraPresetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const yearVal = btn.dataset.year;
      if (yearVal === 'all') {
        state.isAllEraSelected = true;
        elements.currentSliderYearValue.textContent = 'All Tracks';
      } else {
        state.isAllEraSelected = false;
        state.cutoffYear = parseInt(yearVal, 10);
        elements.yearSlider.value = state.cutoffYear;
        elements.currentSliderYearValue.textContent = `≤ ${state.cutoffYear}`;
      }

      applyFiltersAndRender();
    });
  });

  // Search Input
  elements.trackSearchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    applyFiltersAndRender();
  });

  // View Filter Toggle: Show Included vs Show All
  elements.showIncludedOnlyBtn?.addEventListener('click', () => {
    state.showOnlyIncluded = true;
    elements.showIncludedOnlyBtn.classList.add('active');
    elements.showAllTracksBtn.classList.remove('active');
    applyFiltersAndRender();
  });

  elements.showAllTracksBtn?.addEventListener('click', () => {
    state.showOnlyIncluded = false;
    elements.showAllTracksBtn.classList.add('active');
    elements.showIncludedOnlyBtn.classList.remove('active');
    applyFiltersAndRender();
  });

  // Sort Select
  elements.trackSortSelect?.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applyFiltersAndRender();
  });

  // Table Master Checkbox
  elements.headerMasterCheckbox?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    elements.tracksTableBody.querySelectorAll('.track-checkbox').forEach(cb => {
      cb.checked = isChecked;
      state.manualOverrides.set(cb.dataset.trackId, isChecked);
    });
    applyFiltersAndRender();
  });

  // Table Row Checkbox & Audio Preview Click delegation
  elements.tracksTableBody?.addEventListener('click', (e) => {
    const target = e.target;

    // Checkbox toggle
    if (target.classList.contains('track-checkbox')) {
      const trackId = target.dataset.trackId;
      state.manualOverrides.set(trackId, target.checked);
      applyFiltersAndRender();
      return;
    }

    // Audio preview click
    const previewBtn = target.closest('.btn-preview');
    if (previewBtn) {
      toggleAudioPreview(previewBtn);
      return;
    }
  });

  // Bulk Selection Buttons
  elements.selectAllBtn?.addEventListener('click', () => {
    state.allTracks.forEach(t => state.manualOverrides.set(t.id, true));
    applyFiltersAndRender();
  });

  elements.deselectAllBtn?.addEventListener('click', () => {
    state.allTracks.forEach(t => state.manualOverrides.set(t.id, false));
    applyFiltersAndRender();
  });

  elements.resetOverridesBtn?.addEventListener('click', () => {
    state.manualOverrides.clear();
    applyFiltersAndRender();
  });

  // Open Export Modal
  elements.openExportModalBtn?.addEventListener('click', () => {
    const includedTracks = state.allTracks.filter(t => isTrackIncluded(t));
    if (includedTracks.length === 0) {
      alert('No tracks are currently selected to export!');
      return;
    }

    elements.modalExportCount.textContent = includedTracks.length;
    elements.modalAccountName.textContent = state.user?.display_name || 'Your Spotify Account';
    elements.exportProgressContainer.classList.add('hidden');
    elements.confirmExportBtn.disabled = false;
    elements.exportModal.classList.remove('hidden');
  });

  // Close Export Modal
  elements.cancelExportBtn?.addEventListener('click', () => {
    elements.exportModal.classList.add('hidden');
  });
  elements.closeModalBtn?.addEventListener('click', () => {
    elements.exportModal.classList.add('hidden');
  });

  // Confirm Export Form Submit
  elements.exportForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleExportPlaylist();
  });

  // Success Modal Close
  elements.closeSuccessBtn?.addEventListener('click', () => {
    elements.successModal.classList.add('hidden');
  });
}

// Export Playlist to Spotify
async function handleExportPlaylist() {
  if (state.isExporting) return;
  state.isExporting = true;

  const playlistName = elements.exportPlaylistName.value.trim() || 'Bollywood Retro Classics (≤ 2015)';
  const playlistDesc = elements.exportPlaylistDesc.value.trim();
  const isPublic = elements.exportPlaylistPublic.checked;

  const tracksToExport = state.allTracks.filter(t => isTrackIncluded(t));
  const trackUris = tracksToExport.map(t => t.uri);

  if (trackUris.length === 0) {
    alert('No tracks to export.');
    state.isExporting = false;
    return;
  }

  // Show progress inside modal
  elements.exportProgressContainer.classList.remove('hidden');
  elements.confirmExportBtn.disabled = true;
  elements.exportProgressBar.style.width = '0%';
  elements.exportProgressPercent.textContent = '0%';
  elements.exportProgressStatus.textContent = 'Creating new Spotify playlist...';

  try {
    // 1. Create Playlist
    const newPlaylist = await createPlaylist(state.token, state.user.id, {
      name: playlistName,
      description: playlistDesc,
      isPublic: isPublic
    });

    elements.exportProgressStatus.textContent = `Adding ${trackUris.length} songs to Spotify in batches...`;

    // 2. Batch Add Tracks
    await addTracksToPlaylist(state.token, newPlaylist.id, trackUris, (progress) => {
      elements.exportProgressStatus.textContent = `Adding songs (${progress.added} of ${progress.total})...`;
      elements.exportProgressPercent.textContent = `${progress.percent}%`;
      elements.exportProgressBar.style.width = `${progress.percent}%`;
    });

    // Close export modal
    elements.exportModal.classList.add('hidden');

    // Setup success modal
    elements.successSummaryText.innerHTML = `
      Successfully added <strong>${trackUris.length} songs</strong> to your new playlist 
      <strong style="color:var(--spotify-green)">"${escapeHtml(playlistName)}"</strong>!
    `;
    elements.openInSpotifyBtn.href = newPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${newPlaylist.id}`;

    elements.successModal.classList.remove('hidden');

    // Trigger celebratory confetti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

  } catch (err) {
    console.error('Export failed:', err);
    alert(`Export failed: ${err.message}`);
  } finally {
    state.isExporting = false;
    elements.confirmExportBtn.disabled = false;
  }
}

// Start application
init();
