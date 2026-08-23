/**
 * Main Application Controller
 * Handles UI interactions, dual-range era filtering, timeline analytics,
 * decade batch splitting, story cards, and Spotify export workflows.
 */

import { 
  handleOAuthCallback, 
  redirectToSpotifyAuth, 
  getValidAccessToken, 
  logout, 
  getRedirectUri 
} from './auth.js';

import { 
  fetchCurrentUser, 
  fetchUserPlaylists, 
  fetchAllPlaylistTracks, 
  parsePlaylistId, 
  createPlaylist, 
  addTracksToPlaylist,
  uploadPlaylistCover
} from './spotifyApi.js';

import { renderDecadeChart, getClickedDecade } from './chart.js';
import { generateSocialStoryCard, downloadSocialStoryCard } from './socialCard.js';
import { generateRetroCoverArt } from './coverArt.js';
import { segmentTracksByDecade, executeDecadeSplitExport } from './decadeSplitter.js';
import confetti from 'canvas-confetti';

// Global Application State
const state = {
  token: null,
  user: null,
  playlists: [],
  selectedPlaylistId: null,
  activePlaylistInfo: null,
  allTracks: [],
  minYear: 1960,
  maxYear: 2015,
  isAllEraSelected: false,
  searchQuery: '',
  showOnlyIncluded: true,
  sortBy: 'original',
  manualOverrides: new Map(), // trackId -> boolean
  currentlyPlayingId: null,
  isLoadingPlaylist: false,
  isExporting: false,
  socialCardDataUrl: null,
  decadeSplitBuckets: []
};

// DOM Element Registry
const elements = {
  authSection: document.getElementById('authSection'),
  mainWorkspace: document.getElementById('mainWorkspace'),
  authStatusContainer: document.getElementById('authStatusContainer'),
  loginForm: document.getElementById('loginForm'),
  clientIdInput: document.getElementById('clientIdInput'),
  currentRedirectUri: document.getElementById('currentRedirectUri'),
  copyUriBtn: document.getElementById('copyUriBtn'),

  // Workspace Elements
  playlistSelect: document.getElementById('playlistSelect'),
  playlistUrlInput: document.getElementById('playlistUrlInput'),
  loadUrlBtn: document.getElementById('loadUrlBtn'),
  refreshPlaylistsBtn: document.getElementById('refreshPlaylistsBtn'),

  // Progress Bar
  loadingProgressContainer: document.getElementById('loadingProgressContainer'),
  loadingProgressBar: document.getElementById('loadingProgressBar'),
  loadingStatusText: document.getElementById('loadingStatusText'),
  loadingPercentText: document.getElementById('loadingPercentText'),

  // Filter Workspace
  filterWorkspace: document.getElementById('filterWorkspace'),
  bannerPlaylistImg: document.getElementById('bannerPlaylistImg'),
  bannerPlaylistTitle: document.getElementById('bannerPlaylistTitle'),
  bannerPlaylistDesc: document.getElementById('bannerPlaylistDesc'),
  bannerTotalCount: document.getElementById('bannerTotalCount'),
  bannerOwner: document.getElementById('bannerOwner'),

  // Power Actions
  openDecadeSplitterBtn: document.getElementById('openDecadeSplitterBtn'),
  openSocialCardBtn: document.getElementById('openSocialCardBtn'),

  // Timeline Chart
  timelineChartCanvas: document.getElementById('timelineChartCanvas'),

  // Dual Range Sliders
  minYearSlider: document.getElementById('minYearSlider'),
  maxYearSlider: document.getElementById('maxYearSlider'),
  dualSliderHighlight: document.getElementById('dualSliderHighlight'),
  displayMinYear: document.getElementById('displayMinYear'),
  displayMaxYear: document.getElementById('displayMaxYear'),
  activeRangeSummary: document.getElementById('activeRangeSummary'),
  eraPresetButtons: document.querySelectorAll('.preset-chip'),

  // Stats
  statIncludedCount: document.getElementById('statIncludedCount'),
  statExcludedCount: document.getElementById('statExcludedCount'),
  statTotalCount: document.getElementById('statTotalCount'),

  // Search and Sort
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

  // Export Floating Bar
  exportTrackCount: document.getElementById('exportTrackCount'),
  openExportModalBtn: document.getElementById('openExportModalBtn'),

  // Export Modal
  exportModal: document.getElementById('exportModal'),
  exportForm: document.getElementById('exportForm'),
  exportPlaylistName: document.getElementById('exportPlaylistName'),
  exportPlaylistDesc: document.getElementById('exportPlaylistDesc'),
  exportPlaylistPublic: document.getElementById('exportPlaylistPublic'),
  generateCoverArtCheck: document.getElementById('generateCoverArtCheck'),
  modalExportCount: document.getElementById('modalExportCount'),
  modalAccountName: document.getElementById('modalAccountName'),
  exportProgressContainer: document.getElementById('exportProgressContainer'),
  exportProgressBar: document.getElementById('exportProgressBar'),
  exportProgressStatus: document.getElementById('exportProgressStatus'),
  exportProgressPercent: document.getElementById('exportProgressPercent'),
  confirmExportBtn: document.getElementById('confirmExportBtn'),
  cancelExportBtn: document.getElementById('cancelExportBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),

  // Decade Splitter Modal
  decadeSplitterModal: document.getElementById('decadeSplitterModal'),
  decadeBucketsContainer: document.getElementById('decadeBucketsContainer'),
  decadeExportProgressContainer: document.getElementById('decadeExportProgressContainer'),
  decadeExportProgressBar: document.getElementById('decadeExportProgressBar'),
  decadeExportStatus: document.getElementById('decadeExportStatus'),
  decadeExportPercent: document.getElementById('decadeExportPercent'),
  confirmDecadeSplitBtn: document.getElementById('confirmDecadeSplitBtn'),
  cancelDecadeSplitBtn: document.getElementById('cancelDecadeSplitBtn'),
  closeDecadeModalBtn: document.getElementById('closeDecadeModalBtn'),

  // Social Story Card Modal
  socialCardModal: document.getElementById('socialCardModal'),
  storyCardPreviewImg: document.getElementById('storyCardPreviewImg'),
  downloadStoryCardBtn: document.getElementById('downloadStoryCardBtn'),
  closeSocialModalBtn: document.getElementById('closeSocialModalBtn'),
  closeStoryModalBtn: document.getElementById('closeStoryModalBtn'),

  // Success Modal
  successModal: document.getElementById('successModal'),
  successSummaryText: document.getElementById('successSummaryText'),
  createdPlaylistsLinksList: document.getElementById('createdPlaylistsLinksList'),
  openInSpotifyBtn: document.getElementById('openInSpotifyBtn'),
  closeSuccessBtn: document.getElementById('closeSuccessBtn'),

  // Audio Player
  audioPreviewPlayer: document.getElementById('audioPreviewPlayer')
};

// Application Initialization
async function init() {
  if (elements.currentRedirectUri) {
    elements.currentRedirectUri.textContent = getRedirectUri();
  }

  setupEventListeners();

  try {
    state.token = await handleOAuthCallback();
    if (state.token) {
      await loadAuthenticatedUser();
    } else {
      const activeToken = await getValidAccessToken();
      if (activeToken) {
        state.token = activeToken;
        await loadAuthenticatedUser();
      } else {
        showAuthSection();
      }
    }
  } catch (err) {
    console.error('Auth initialization error:', err);
    showAuthSection();
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration note:', err));
  }
}

function showAuthSection() {
  elements.authSection.classList.remove('hidden');
  elements.mainWorkspace.classList.add('hidden');
  document.getElementById('landingNav')?.classList.remove('hidden');
  elements.authStatusContainer.innerHTML = `
    <a href="#connect" class="btn btn-primary btn-pill btn-sm">
      <span>Connect Spotify</span>
      <div class="btn-icon-circle">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  `;
}

async function loadAuthenticatedUser() {
  try {
    state.user = await fetchCurrentUser(state.token);
    elements.authSection.classList.add('hidden');
    elements.mainWorkspace.classList.remove('hidden');
    document.getElementById('landingNav')?.classList.add('hidden');

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

    elements.filterWorkspace.classList.remove('hidden');
    elements.loadingProgressContainer.classList.add('hidden');

    updateDualSliderUI();
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

  // Check release year within [minYear, maxYear] window
  if (!track.releaseYear) {
    return false;
  }

  return track.releaseYear >= state.minYear && track.releaseYear <= state.maxYear;
}

function updateDualSliderUI() {
  const minSlider = elements.minYearSlider;
  const maxSlider = elements.maxYearSlider;
  const track = elements.dualSliderHighlight;

  if (!minSlider || !maxSlider || !track) return;

  const min = parseInt(minSlider.min, 10);
  const max = parseInt(minSlider.max, 10);

  const percentMin = ((state.minYear - min) / (max - min)) * 100;
  const percentMax = ((state.maxYear - min) / (max - min)) * 100;

  track.style.left = `${percentMin}%`;
  track.style.width = `${percentMax - percentMin}%`;

  elements.displayMinYear.textContent = state.minYear;
  elements.displayMaxYear.textContent = state.maxYear;

  if (state.isAllEraSelected) {
    elements.activeRangeSummary.textContent = 'Window: All Tracks';
  } else {
    elements.activeRangeSummary.textContent = `Window: ${state.minYear} to ${state.maxYear}`;
  }
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
  elements.exportTrackCount.textContent = includedCount;
  elements.modalExportCount.textContent = includedCount;

  // Render Table Rows
  renderTracksTable(displayTracks);

  // Render Decade Timeline Chart
  if (elements.timelineChartCanvas) {
    renderDecadeChart(elements.timelineChartCanvas, state.allTracks, state.minYear, state.maxYear);
  }
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

  // FAQ Accordion Toggle
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      item.classList.toggle('active');
    });
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

  // Dual Range Sliders
  elements.minYearSlider?.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (val > state.maxYear) {
      val = state.maxYear;
      elements.minYearSlider.value = val;
    }
    state.minYear = val;
    state.isAllEraSelected = false;
    updateDualSliderUI();
    applyFiltersAndRender();
  });

  elements.maxYearSlider?.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (val < state.minYear) {
      val = state.minYear;
      elements.maxYearSlider.value = val;
    }
    state.maxYear = val;
    state.isAllEraSelected = false;
    updateDualSliderUI();
    applyFiltersAndRender();
  });

  // Interactive Timeline Chart Click to Filter by Decade
  elements.timelineChartCanvas?.addEventListener('click', (e) => {
    const clicked = getClickedDecade(elements.timelineChartCanvas, e);
    if (clicked) {
      state.isAllEraSelected = false;
      state.minYear = clicked.min;
      state.maxYear = clicked.max;
      elements.minYearSlider.value = state.minYear;
      elements.maxYearSlider.value = state.maxYear;
      
      // Update preset chips highlight
      elements.eraPresetButtons.forEach(btn => {
        const isMatch = parseInt(btn.dataset.min, 10) === state.minYear && parseInt(btn.dataset.max, 10) === state.maxYear;
        btn.classList.toggle('active', isMatch);
      });

      updateDualSliderUI();
      applyFiltersAndRender();
    }
  });

  // Preset Chips
  elements.eraPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.eraPresetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.all === 'true') {
        state.isAllEraSelected = true;
        state.minYear = 1960;
        state.maxYear = 2026;
      } else {
        state.isAllEraSelected = false;
        state.minYear = parseInt(btn.dataset.min, 10);
        state.maxYear = parseInt(btn.dataset.max, 10);
      }

      elements.minYearSlider.value = state.minYear;
      elements.maxYearSlider.value = state.maxYear;
      updateDualSliderUI();
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

    const baseName = state.activePlaylistInfo?.name || 'Playlist';
    let eraTag = '';
    let eraDescription = '';

    if (state.isAllEraSelected) {
      eraTag = 'Curated Selection';
      eraDescription = 'Curated collection of tracks exported with Spotify Playlist Filter.';
    } else if (state.minYear === 1960) {
      eraTag = `<= ${state.maxYear} Classics`;
      eraDescription = `Curated collection of tracks released on or before ${state.maxYear}.`;
    } else {
      eraTag = `${state.minYear}-${state.maxYear} Era`;
      eraDescription = `Curated collection of tracks released between ${state.minYear} and ${state.maxYear}.`;
    }

    elements.exportPlaylistName.value = `${baseName} (${eraTag})`;
    elements.exportPlaylistDesc.value = eraDescription;

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

  // Open Decade Splitter Modal
  elements.openDecadeSplitterBtn?.addEventListener('click', () => {
    if (!state.allTracks || state.allTracks.length === 0) {
      alert('Please load a playlist first.');
      return;
    }

    state.decadeSplitBuckets = segmentTracksByDecade(state.allTracks);
    renderDecadeBucketsUI();
    elements.decadeExportProgressContainer.classList.add('hidden');
    elements.confirmDecadeSplitBtn.disabled = false;
    elements.decadeSplitterModal.classList.remove('hidden');
  });

  elements.cancelDecadeSplitBtn?.addEventListener('click', () => {
    elements.decadeSplitterModal.classList.add('hidden');
  });
  elements.closeDecadeModalBtn?.addEventListener('click', () => {
    elements.decadeSplitterModal.classList.add('hidden');
  });

  // Confirm Decade Split Export
  elements.confirmDecadeSplitBtn?.addEventListener('click', async () => {
    await handleDecadeSplitExport();
  });

  // Open Social Story Card Modal
  elements.openSocialCardBtn?.addEventListener('click', () => {
    if (!state.allTracks || state.allTracks.length === 0) {
      alert('Please load a playlist first.');
      return;
    }

    const dataUrl = generateSocialStoryCard(
      state.activePlaylistInfo, 
      state.allTracks, 
      state.user?.display_name || 'Music Lover'
    );

    state.socialCardDataUrl = dataUrl;
    elements.storyCardPreviewImg.src = dataUrl;
    elements.socialCardModal.classList.remove('hidden');
  });

  elements.downloadStoryCardBtn?.addEventListener('click', () => {
    if (state.socialCardDataUrl) {
      const cleanName = (state.activePlaylistInfo?.name || 'playlist').toLowerCase().replace(/[^a-z0-9]/g, '-');
      downloadSocialStoryCard(state.socialCardDataUrl, `${cleanName}-era-dna.png`);
    }
  });

  elements.closeSocialModalBtn?.addEventListener('click', () => {
    elements.socialCardModal.classList.add('hidden');
  });
  elements.closeStoryModalBtn?.addEventListener('click', () => {
    elements.socialCardModal.classList.add('hidden');
  });

  // Close Success Modal
  elements.closeSuccessBtn?.addEventListener('click', () => {
    elements.successModal.classList.add('hidden');
  });
}

function renderDecadeBucketsUI() {
  elements.decadeBucketsContainer.innerHTML = '';

  if (state.decadeSplitBuckets.length === 0) {
    elements.decadeBucketsContainer.innerHTML = '<p class="empty-state">No track release dates found to split.</p>';
    return;
  }

  state.decadeSplitBuckets.forEach(bucket => {
    const div = document.createElement('div');
    div.className = 'decade-bucket-card';
    div.innerHTML = `
      <div class="bucket-left">
        <input type="checkbox" class="decade-bucket-check" data-bucket-id="${bucket.id}" checked />
        <div>
          <div class="bucket-title">${escapeHtml(bucket.name)}</div>
          <div class="bucket-sub">${escapeHtml(bucket.subtext)}</div>
        </div>
      </div>
      <div class="bucket-count-badge">${bucket.tracks.length} tracks</div>
    `;
    elements.decadeBucketsContainer.appendChild(div);
  });
}

async function handleDecadeSplitExport() {
  const checks = elements.decadeBucketsContainer.querySelectorAll('.decade-bucket-check:checked');
  const selectedIds = Array.from(checks).map(c => c.dataset.bucketId);
  const chosenBuckets = state.decadeSplitBuckets.filter(b => selectedIds.includes(b.id));

  if (chosenBuckets.length === 0) {
    alert('Please select at least one decade to export.');
    return;
  }

  elements.decadeExportProgressContainer.classList.remove('hidden');
  elements.confirmDecadeSplitBtn.disabled = true;

  try {
    const results = await executeDecadeSplitExport(
      state.token,
      state.user.id,
      state.activePlaylistInfo.name,
      chosenBuckets,
      (prog) => {
        elements.decadeExportStatus.textContent = `Creating ${prog.currentName} (${prog.currentIndex} of ${prog.totalPlaylists})...`;
        elements.decadeExportPercent.textContent = `${prog.percent}%`;
        elements.decadeExportProgressBar.style.width = `${prog.percent}%`;
      }
    );

    elements.decadeSplitterModal.classList.add('hidden');

    // Show Success Modal with all created playlist links
    elements.successSummaryText.innerHTML = `
      Successfully generated <strong>${results.length} decade playlists</strong> in your Spotify account!
    `;

    elements.createdPlaylistsLinksList.innerHTML = '';
    elements.createdPlaylistsLinksList.classList.remove('hidden');

    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'created-link-item';
      item.innerHTML = `
        <span>${escapeHtml(res.bucketName)} (${res.trackCount} tracks)</span>
        <a href="${res.playlistUrl}" target="_blank">Open in Spotify ➔</a>
      `;
      elements.createdPlaylistsLinksList.appendChild(item);
    });

    elements.openInSpotifyBtn.href = results[0]?.playlistUrl || '#';
    elements.successModal.classList.remove('hidden');

    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.6 }
    });

  } catch (err) {
    console.error('Decade split export error:', err);
    alert(`Export failed: ${err.message}`);
  } finally {
    elements.confirmDecadeSplitBtn.disabled = false;
  }
}

// Single Playlist Export Handler
async function handleExportPlaylist() {
  if (state.isExporting) return;
  state.isExporting = true;

  const playlistName = elements.exportPlaylistName.value.trim();
  const playlistDesc = elements.exportPlaylistDesc.value.trim();
  const isPublic = elements.exportPlaylistPublic.checked;
  const shouldGenCover = elements.generateCoverArtCheck.checked;

  const trackUris = state.allTracks
    .filter(t => isTrackIncluded(t))
    .map(t => t.uri)
    .filter(Boolean);

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

    // 2. Batch Add Tracks
    elements.exportProgressStatus.textContent = `Adding ${trackUris.length} tracks in batches...`;
    await addTracksToPlaylist(state.token, newPlaylist.id, trackUris, (progress) => {
      elements.exportProgressStatus.textContent = `Adding tracks (${progress.added} of ${progress.total})...`;
      elements.exportProgressPercent.textContent = `${progress.percent}%`;
      elements.exportProgressBar.style.width = `${progress.percent}%`;
    });

    // 3. Optional: Generate & Upload Retro Cover Art
    if (shouldGenCover) {
      try {
        elements.exportProgressStatus.textContent = 'Generating & uploading retro cover art...';
        const eraLabel = state.isAllEraSelected ? 'Vault Hits' : `${state.minYear}-${state.maxYear}`;
        const cover = generateRetroCoverArt(playlistName, eraLabel, `${trackUris.length} Tracks Vault`);
        await uploadPlaylistCover(state.token, newPlaylist.id, cover.base64Data);
      } catch (coverErr) {
        console.warn('Cover art upload note:', coverErr);
      }
    }

    // Close export modal
    elements.exportModal.classList.add('hidden');

    // Setup success modal
    elements.createdPlaylistsLinksList.classList.add('hidden');
    elements.successSummaryText.innerHTML = `
      Successfully added <strong>${trackUris.length} tracks</strong> to your new playlist 
      <strong style="color:var(--spotify-green)">"${escapeHtml(playlistName)}"</strong>!
    `;
    elements.openInSpotifyBtn.href = newPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${newPlaylist.id}`;

    elements.successModal.classList.remove('hidden');

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
