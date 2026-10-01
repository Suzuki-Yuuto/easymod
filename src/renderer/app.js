// ==========================================================================
// EasyMod - Modpack Bridge Renderer Application
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    config: null,
    modpacks: [],
    installedVersions: [],
    filterLoader: 'all',
    filterStatus: 'all',
    searchQuery: '',
    selectedModpack: null,
    isSyncing: false
  };

  // DOM Elements - Navigation & Actions
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const statusFilter = document.getElementById('status-filter');
  const loaderFilterBtns = document.querySelectorAll('.filter-loader-btn');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnOpenMc = document.getElementById('btn-open-mc');
  const btnLaunchGame = document.getElementById('btn-launch-game');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnEmptySettings = document.getElementById('btn-empty-settings');

  // DOM Elements - Stats
  const statTotal = document.getElementById('stat-total');
  const statSynced = document.getElementById('stat-synced');
  const statReady = document.getElementById('stat-ready');
  const statMissing = document.getElementById('stat-missing');
  const activePathLabel = document.getElementById('active-path-label');

  // DOM Elements - Content Areas
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const modpackGrid = document.getElementById('modpack-grid');

  // DOM Elements - Import Modal
  const modalImport = document.getElementById('modal-import');
  const modalImportClose = document.getElementById('modal-import-close');
  const modalImportCancel = document.getElementById('modal-import-cancel');
  const modalImportConfirm = document.getElementById('modal-import-confirm');
  const modalImportTitle = document.getElementById('modal-import-title');
  const modalImportSubtitle = document.getElementById('modal-import-subtitle');
  const modalImportIconContainer = document.getElementById('modal-import-icon-container');
  const modalImportName = document.getElementById('modal-import-name');
  const modalImportBaseSelect = document.getElementById('modal-import-base-select');
  const modalImportBaseHint = document.getElementById('modal-import-base-hint');
  const modalImportRecloneRow = document.getElementById('modal-import-reclone-row');
  const modalImportReclone = document.getElementById('modal-import-reclone');
  const modalImportCleanSync = document.getElementById('modal-import-clean-sync');
  const modalImportIncludeSaves = document.getElementById('modal-import-include-saves');
  const modalImportBtnText = document.getElementById('modal-import-btn-text');

  // DOM Elements - Progress Modal
  const modalProgress = document.getElementById('modal-progress');
  const progressStageTitle = document.getElementById('progress-stage-title');
  const progressStageSubtitle = document.getElementById('progress-stage-subtitle');
  const progressPercentBadge = document.getElementById('progress-percent-badge');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressFilesCount = document.getElementById('progress-files-count');
  const progressBytesCount = document.getElementById('progress-bytes-count');
  const progressSpeed = document.getElementById('progress-speed');
  const progressStageBadge = document.getElementById('progress-stage-badge');
  const progressCurrentFile = document.getElementById('progress-current-file');
  const progressSpinnerIcon = document.getElementById('progress-spinner-icon');
  const progressSuccessIcon = document.getElementById('progress-success-icon');
  const progressSuccessPanel = document.getElementById('progress-success-panel');
  const successVersionName = document.getElementById('success-version-name');
  const progressCancelBtn = document.getElementById('progress-cancel-btn');
  const progressOpenFolderBtn = document.getElementById('progress-open-folder-btn');
  const progressDoneBtn = document.getElementById('progress-done-btn');
  const progressPlayBtn = document.getElementById('progress-play-btn');

  // DOM Elements - Guide Modal
  const modalGuide = document.getElementById('modal-guide');
  const modalGuideClose = document.getElementById('modal-guide-close');
  const guidePackTitle = document.getElementById('guide-pack-title');
  const guideTargetVersion = document.getElementById('guide-target-version');
  const guideOpenLauncherBtn = document.getElementById('guide-open-launcher-btn');
  const guideGotItBtn = document.getElementById('guide-got-it-btn');

  // DOM Elements - Settings Modal
  const modalSettings = document.getElementById('modal-settings');
  const modalSettingsClose = document.getElementById('modal-settings-close');
  const modalSettingsCancel = document.getElementById('modal-settings-cancel');
  const settingInstancesPath = document.getElementById('setting-instances-path');
  const settingMcPath = document.getElementById('setting-mc-path');
  const settingLauncherPath = document.getElementById('setting-launcher-path');
  const btnBrowseInstances = document.getElementById('btn-browse-instances');
  const btnBrowseMc = document.getElementById('btn-browse-mc');
  const btnBrowseLauncher = document.getElementById('btn-browse-launcher');
  const settingCleanSync = document.getElementById('setting-clean-sync');
  const settingIncludeSaves = document.getElementById('setting-include-saves');
  const btnResetSettings = document.getElementById('btn-reset-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnRerunWizard = document.getElementById('btn-rerun-wizard');

  // DOM Elements - First-Run Onboarding
  const onboardingView = document.getElementById('onboarding-view');
  const onboardingCfPath = document.getElementById('onboarding-cf-path');
  const onboardingBrowseCf = document.getElementById('onboarding-browse-cf');
  const onboardingCfBadge = document.getElementById('onboarding-cf-badge');
  const onboardingCfHint = document.getElementById('onboarding-cf-hint');
  const onboardingMcPath = document.getElementById('onboarding-mc-path');
  const onboardingBrowseMc = document.getElementById('onboarding-browse-mc');
  const onboardingMcBadge = document.getElementById('onboarding-mc-badge');
  const onboardingMcHint = document.getElementById('onboarding-mc-hint');
  const onboardingCleanSync = document.getElementById('onboarding-clean-sync');
  const onboardingStartBtn = document.getElementById('onboarding-start-btn');

  // DOM Elements - Details Drawer
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerDetails = document.getElementById('drawer-details');
  const drawerDetailsClose = document.getElementById('drawer-details-close');
  const drawerBannerContainer = document.getElementById('drawer-banner-container');
  const drawerTitle = document.getElementById('drawer-title');
  const drawerAuthor = document.getElementById('drawer-author');
  const drawerMcVersion = document.getElementById('drawer-mc-version');
  const drawerLoader = document.getElementById('drawer-loader');
  const drawerModsCount = document.getElementById('drawer-mods-count');
  const drawerStatus = document.getElementById('drawer-status');
  const drawerPathCf = document.getElementById('drawer-path-cf');
  const drawerPathHome = document.getElementById('drawer-path-home');
  const btnCopyCfPath = document.getElementById('btn-copy-cf-path');
  const btnCopyHomePath = document.getElementById('btn-copy-home-path');
  const drawerSyncMetaBox = document.getElementById('drawer-sync-meta-box');
  const drawerLastSyncDate = document.getElementById('drawer-last-sync-date');
  const drawerPlayBtn = document.getElementById('drawer-play-btn');
  const drawerActionBtn = document.getElementById('drawer-action-btn');
  const drawerOpenFolderBtn = document.getElementById('drawer-open-folder-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // Window Controls
  if (window.bridgeAPI) {
    btnMinimize?.addEventListener('click', () => window.bridgeAPI.windowMinimize());
    btnMaximize?.addEventListener('click', () => window.bridgeAPI.windowMaximize());
    btnClose?.addEventListener('click', () => window.bridgeAPI.windowClose());
  }

  // Toast Helper
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';

    let iconColor = '#38bdf8';
    if (type === 'success') iconColor = '#34d399';
    if (type === 'error') iconColor = '#f43f5e';

    toast.innerHTML = `
      <svg class="icon-16" style="color: ${iconColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  }

  // Scan Logic
  async function performScan() {
    if (!window.bridgeAPI) return;
    
    const refreshIcon = btnRefresh?.querySelector('.refresh-icon');
    refreshIcon?.classList.add('spin');
    loadingState.classList.remove('hidden');
    modpackGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
      const data = await window.bridgeAPI.scanAll();
      state.config = data.config;
      state.installedVersions = data.installedVersions || [];
      state.modpacks = data.modpacks || [];

      if (state.config && activePathLabel) {
        activePathLabel.textContent = state.config.minecraftPath;
        activePathLabel.title = `Instances: ${state.config.instancesPath}\n.minecraft: ${state.config.minecraftPath}`;
      }

      updateStats();
      renderModpacks();
    } catch (err) {
      console.error('Scan error:', err);
      showToast(`Scan error: ${err.message}`, 'error');
    } finally {
      refreshIcon?.classList.remove('spin');
      loadingState.classList.add('hidden');
    }
  }

  function updateStats() {
    const total = state.modpacks.length;
    const synced = state.modpacks.filter(m => m.status === 'synced').length;
    const ready = state.modpacks.filter(m => m.status === 'ready').length;
    const missing = state.modpacks.filter(m => m.status === 'missing_loader').length;

    if (statTotal) statTotal.textContent = total;
    if (statSynced) statSynced.textContent = synced;
    if (statReady) statReady.textContent = ready;
    if (statMissing) statMissing.textContent = missing;
  }

  function getFilteredModpacks() {
    return state.modpacks.filter(pack => {
      if (state.filterLoader !== 'all') {
        if (pack.loader.toLowerCase() !== state.filterLoader.toLowerCase()) return false;
      }
      if (state.filterStatus !== 'all') {
        if (pack.status !== state.filterStatus) return false;
      }
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        const matchName = pack.name.toLowerCase().includes(query);
        const matchMc = pack.gameVersion.toLowerCase().includes(query);
        const matchLoader = (pack.loader || '').toLowerCase().includes(query);
        const matchAuthor = (pack.author || '').toLowerCase().includes(query);
        if (!matchName && !matchMc && !matchLoader && !matchAuthor) return false;
      }
      return true;
    });
  }

  function renderModpacks() {
    const filtered = getFilteredModpacks();

    if (state.modpacks.length === 0) {
      emptyState.classList.remove('hidden');
      modpackGrid.classList.add('hidden');
      return;
    }

    if (filtered.length === 0) {
      modpackGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: #94a3b8;">
          <p style="font-size: 14px;">No modpacks match your search or filter criteria.</p>
          <button id="btn-reset-filters" style="margin-top: 10px; background: none; border: none; color: #10b981; font-weight: 600; cursor: pointer; text-decoration: underline;">Reset Filters</button>
        </div>
      `;
      modpackGrid.classList.remove('hidden');
      document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
        state.searchQuery = '';
        state.filterLoader = 'all';
        state.filterStatus = 'all';
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        loaderFilterBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.loader === 'all');
        });
        renderModpacks();
      });
      return;
    }

    emptyState.classList.add('hidden');
    modpackGrid.classList.remove('hidden');
    modpackGrid.innerHTML = '';

    filtered.forEach(pack => {
      const card = createModpackCard(pack);
      modpackGrid.appendChild(card);
    });
  }

  // Play Modpack: Pre-selects in Legacy Launcher and opens launcher
  async function handlePlayModpack(pack) {
    if (!pack) return;
    if (!pack.isSynced) {
      showToast(`"${pack.name}" is not imported yet. Please import it first.`, 'info');
      openImportModal(pack);
      return;
    }

    const versionName = pack.sanitizedName;
    showToast(`Pre-selecting "${versionName}" in launcher & launching...`, 'info');

    if (window.bridgeAPI && window.bridgeAPI.launchModpack) {
      try {
        const res = await window.bridgeAPI.launchModpack(versionName);
        if (res && res.success) {
          showToast(`Legacy Launcher opened! "${versionName}" is pre-selected.`, 'success');
        } else {
          showToast(res?.error || `Failed to launch launcher with "${versionName}". Check settings.`, 'error');
        }
      } catch (err) {
        showToast(`Launch failed: ${err.message}`, 'error');
      }
    } else {
      showToast('Launch API not available.', 'error');
    }
  }

  function createModpackCard(pack) {
    const card = document.createElement('div');
    const statusClass = pack.status === 'synced' ? 'is-synced' : (pack.status === 'ready' ? 'is-ready' : 'is-missing');
    card.className = `modpack-card ${statusClass}`;

    let loaderClass = 'tag-forge';
    let loaderLabel = `Forge ${pack.loaderVersion || ''}`.trim();
    if (pack.loader === 'fabric') {
      loaderClass = 'tag-fabric';
      loaderLabel = `Fabric ${pack.loaderVersion || ''}`.trim();
    } else if (pack.loader === 'neoforge') {
      loaderClass = 'tag-neoforge';
      loaderLabel = `NeoForge ${pack.loaderVersion || ''}`.trim();
    } else if (pack.loader === 'quilt') {
      loaderClass = 'tag-quilt';
      loaderLabel = `Quilt ${pack.loaderVersion || ''}`.trim();
    }

    let statusBadgeHtml = '';
    if (pack.status === 'synced') {
      statusBadgeHtml = `
        <span class="badge-tag tag-status-synced">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: #34d399;"></span>
          Synced
        </span>
      `;
    } else if (pack.status === 'ready') {
      statusBadgeHtml = `
        <span class="badge-tag tag-status-ready">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: #38bdf8;"></span>
          Ready
        </span>
      `;
    } else {
      statusBadgeHtml = `
        <span class="badge-tag tag-status-missing" title="${escapeHtml(pack.missingReason)}">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: #fbbf24;"></span>
          Missing Loader
        </span>
      `;
    }

    let bannerHtml = '';

    if (pack.thumbnail) {
      bannerHtml = `<img src="${pack.thumbnail}" alt="${escapeHtml(pack.name)}" loading="lazy">`;
    } else {
      bannerHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #475569; width: 100%; height: 100%;">
          <svg class="icon-32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h2v4H8V8zm6 0h2v4h-2V8zm-3 5h2v3h-2v-3z"/>
          </svg>
          <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px;">MC ${escapeHtml(pack.gameVersion)}</span>
        </div>
      `;
    }

    let actionBtnHtml = '';
    if (pack.status === 'synced') {
      actionBtnHtml = `
        <button class="btn-primary btn-play-pack card-play-btn" style="flex: 1.2;" title="Pre-select in Legacy Launcher & Play">
          <svg class="icon-14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Play
        </button>
        <button class="btn-primary btn-sync-cyan card-action-btn" data-action="resync" title="Re-Sync Files" style="height: 32px; padding: 0 10px; flex: 1;">
          <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Sync</span>
        </button>
        <button class="btn-card-icon card-open-folder" title="Open Game Directory">
          <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      `;
    } else if (pack.status === 'ready') {
      actionBtnHtml = `
        <button class="btn-primary card-action-btn" data-action="import" style="flex: 1;">
          <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Import
        </button>
      `;
    } else {
      actionBtnHtml = `
        <button class="btn-primary btn-warning-guide card-action-btn" data-action="guide" style="flex: 1;">
          <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Install Base Loader
        </button>
      `;
    }

    card.innerHTML = `
      <div class="card-banner">
        ${bannerHtml}
        <div class="banner-tag-left">
          <span class="badge-tag ${loaderClass}">${loaderLabel}</span>
          ${pack.packVersion ? `<span class="badge-tag tag-pack-ver">${escapeHtml(pack.packVersion)}</span>` : ''}
          <span class="badge-tag tag-mc">MC ${escapeHtml(pack.gameVersion)}</span>
        </div>
        <div class="banner-tag-right">
          ${statusBadgeHtml}
        </div>
      </div>

      <div class="card-body">
        <div>
          <div class="card-title-row">
            <h3 class="card-title" title="${escapeHtml(pack.name)}">${escapeHtml(pack.name)}</h3>
            <button class="card-info-btn" title="View Info">
              <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
          </div>

          <div class="card-author" title="By ${escapeHtml(pack.author)}">
            By ${escapeHtml(pack.author)}
          </div>

          <div class="card-meta-row">
            <svg class="icon-12" style="color: #64748b;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            <span>${pack.modCount} Mods</span>
          </div>

          ${pack.missingReason ? `
            <div class="card-warning">
              ⚠️ ${escapeHtml(pack.missingReason)}
            </div>
          ` : ''}
        </div>

        <div class="card-actions">
          ${actionBtnHtml}
        </div>
      </div>
    `;

    // Click Handlers
    const playBtns = card.querySelectorAll('.card-play-btn');
    playBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePlayModpack(pack);
      });
    });

    const actionBtn = card.querySelector('.card-action-btn');
    actionBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = actionBtn.dataset.action;
      if (action === 'import' || action === 'resync') openImportModal(pack);
      else if (action === 'guide') openGuideModal(pack);
    });

    const openFolderBtn = card.querySelector('.card-open-folder');
    openFolderBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pack.targetHomeDir && window.bridgeAPI) window.bridgeAPI.openPath(pack.targetHomeDir);
    });

    const infoBtn = card.querySelector('.card-info-btn');
    infoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailsDrawer(pack);
    });

    const titleEl = card.querySelector('.card-title');
    titleEl?.addEventListener('click', () => openDetailsDrawer(pack));

    return card;
  }

  // ==================== MODALS ====================

  function openImportModal(pack) {
    state.selectedModpack = pack;
    modalImportTitle.textContent = pack.isSynced ? `Re-Sync ${pack.name}` : `Import ${pack.name}`;
    modalImportSubtitle.textContent = `MC ${pack.gameVersion} • ${pack.loader.toUpperCase()} ${pack.loaderVersion || ''}`;
    modalImportName.value = pack.sanitizedName;
    modalImportBtnText.textContent = pack.isSynced ? 'Start Re-Sync' : 'Start Import to Launcher';

    if (pack.thumbnail) {
      modalImportIconContainer.innerHTML = `<img src="${pack.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      modalImportIconContainer.innerHTML = `
        <svg class="icon-20" style="color: #34d399;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h2v4H8V8zm6 0h2v4h-2V8zm-3 5h2v3h-2v-3z"/>
        </svg>
      `;
    }

    modalImportBaseSelect.innerHTML = '';
    const loaderGroup = document.getElementById('modal-import-loader-group');
    const matching = pack.availableMatches || [];
    const allInstalled = state.installedVersions || [];

    if (matching.length > 0) {
      matching.forEach(verId => {
        const opt = document.createElement('option');
        opt.value = verId;
        opt.textContent = `${verId} (Recommended)`;
        if (verId === pack.matchedVersion) opt.selected = true;
        modalImportBaseSelect.appendChild(opt);
      });
    }

    allInstalled.forEach(v => {
      if (!matching.includes(v.id)) {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `${v.id} [${v.loader}]`;
        modalImportBaseSelect.appendChild(opt);
      }
    });

    if (modalImportBaseSelect.options.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No matching loader found';
      modalImportBaseSelect.appendChild(opt);
    }

    if (pack.isSynced) {
      modalImportRecloneRow?.classList.remove('hidden');
      if (modalImportReclone) modalImportReclone.checked = false;
      loaderGroup.classList.add('hidden');

      if (modalImportReclone) {
        modalImportReclone.onchange = () => {
          if (modalImportReclone.checked) {
            loaderGroup.classList.remove('hidden');
          } else {
            loaderGroup.classList.add('hidden');
          }
        };
      }
    } else {
      modalImportRecloneRow?.classList.add('hidden');
      loaderGroup.classList.remove('hidden');
    }

    modalImportCleanSync.checked = state.config?.cleanSync ?? true;
    modalImportIncludeSaves.checked = state.config?.includeSaves ?? false;
    modalImport.classList.remove('hidden');
  }

  function closeImportModal() {
    modalImport.classList.add('hidden');
    state.selectedModpack = null;
  }

  modalImportConfirm?.addEventListener('click', async () => {
    const pack = state.selectedModpack;
    if (!pack || !window.bridgeAPI) return;

    const customName = modalImportName.value.trim() || pack.sanitizedName;
    const baseVersionId = modalImportBaseSelect.value || pack.matchedVersion;
    const cleanSync = modalImportCleanSync.checked;
    const includeSaves = modalImportIncludeSaves.checked;
    const recloneChecked = modalImportReclone ? modalImportReclone.checked : false;
    const skipVersionClone = pack.isSynced && !recloneChecked;

    closeImportModal();
    startSynchronization(pack, {
      customName,
      baseVersionId,
      cleanSync,
      includeSaves,
      skipVersionClone
    });
  });

  async function startSynchronization(pack, options) {
    state.isSyncing = true;
    progressStageTitle.textContent = `Synchronizing ${pack.name}...`;
    progressStageSubtitle.textContent = 'Starting file transfer and configuration...';
    progressPercentBadge.textContent = '0%';
    progressBarFill.style.width = '0%';
    progressFilesCount.textContent = '0 / 0 files';
    progressBytesCount.textContent = '0 MB / 0 MB';
    progressSpeed.textContent = '0.0 MB/s';
    progressCurrentFile.textContent = 'Initializing...';
    progressStageBadge.textContent = 'STARTING';
    progressSpinnerIcon.classList.remove('hidden');
    progressSuccessIcon.classList.add('hidden');
    progressSuccessPanel.classList.add('hidden');
    progressDoneBtn.classList.add('hidden');
    progressPlayBtn?.classList.add('hidden');
    progressOpenFolderBtn.classList.add('hidden');
    progressCancelBtn.classList.remove('hidden');

    modalProgress.classList.remove('hidden');

    try {
      const syncResult = await window.bridgeAPI.syncModpack({
        minecraftPath: state.config.minecraftPath,
        modpack: pack,
        baseVersionId: options.baseVersionId,
        customName: options.customName,
        cleanSync: options.cleanSync,
        includeSaves: options.includeSaves,
        skipVersionClone: options.skipVersionClone
      });

      progressStageTitle.textContent = 'Sync Completed Successfully!';
      progressStageSubtitle.textContent = `Version "${syncResult.targetName}" is ready to play in your launcher.`;
      progressPercentBadge.textContent = '100%';
      progressBarFill.style.width = '100%';
      progressStageBadge.textContent = 'DONE';
      progressSpinnerIcon.classList.add('hidden');
      progressSuccessIcon.classList.remove('hidden');
      progressSuccessPanel.classList.remove('hidden');
      successVersionName.textContent = syncResult.targetName;

      progressCancelBtn.classList.add('hidden');
      progressDoneBtn.classList.remove('hidden');
      progressOpenFolderBtn.classList.remove('hidden');
      progressPlayBtn?.classList.remove('hidden');

      if (progressPlayBtn) {
        progressPlayBtn.onclick = () => {
          modalProgress.classList.add('hidden');
          handlePlayModpack({
            name: syncResult.targetName,
            sanitizedName: syncResult.targetName,
            isSynced: true
          });
        };
      }

      progressOpenFolderBtn.onclick = () => window.bridgeAPI.openPath(syncResult.targetHomeDir);

      showToast(`"${syncResult.targetName}" synced successfully!`, 'success');
      performScan();
    } catch (err) {
      if (err.message && err.message.includes('cancelled')) {
        showToast('Synchronization was cancelled', 'info');
      } else {
        showToast(`Sync failed: ${err.message}`, 'error');
      }
      modalProgress.classList.add('hidden');
    } finally {
      state.isSyncing = false;
    }
  }

  if (window.bridgeAPI) {
    window.bridgeAPI.onSyncProgress((data) => {
      if (!data) return;
      if (data.percent !== undefined) {
        progressPercentBadge.textContent = `${data.percent}%`;
        progressBarFill.style.width = `${data.percent}%`;
      }
      if (data.stage) progressStageBadge.textContent = data.stage.toUpperCase();
      if (data.message) progressStageSubtitle.textContent = data.message;
      if (data.currentFile) progressCurrentFile.textContent = data.currentFile;
      if (data.copiedFiles !== undefined && data.totalFiles !== undefined) {
        progressFilesCount.textContent = `${data.copiedFiles} / ${data.totalFiles} files`;
      }
      if (data.copiedBytes !== undefined && data.totalBytes !== undefined) {
        progressBytesCount.textContent = `${formatBytes(data.copiedBytes)} / ${formatBytes(data.totalBytes)}`;
      }
      if (data.speedMBs !== undefined) progressSpeed.textContent = `${data.speedMBs} MB/s`;
    });
  }

  progressCancelBtn?.addEventListener('click', async () => {
    if (window.bridgeAPI) {
      progressCancelBtn.textContent = 'Cancelling...';
      await window.bridgeAPI.cancelSync();
    }
  });

  progressDoneBtn?.addEventListener('click', () => modalProgress.classList.add('hidden'));

  function openGuideModal(pack) {
    guidePackTitle.textContent = `${pack.name} (MC ${pack.gameVersion})`;
    guideTargetVersion.textContent = `${pack.loader.toUpperCase()} ${pack.gameVersion}${pack.loaderVersion ? ` (${pack.loaderVersion})` : ''}`;
    modalGuide.classList.remove('hidden');
  }

  guideOpenLauncherBtn?.addEventListener('click', async () => {
    if (window.bridgeAPI) await window.bridgeAPI.openLegacyLauncher();
  });
  guideGotItBtn?.addEventListener('click', () => modalGuide.classList.add('hidden'));
  modalGuideClose?.addEventListener('click', () => modalGuide.classList.add('hidden'));

  // Details Drawer
  function openDetailsDrawer(pack) {
    drawerTitle.textContent = pack.name;
    drawerAuthor.textContent = `Author: ${pack.author || 'Unknown'}`;
    drawerMcVersion.textContent = pack.gameVersion;
    drawerLoader.textContent = `${pack.loader.toUpperCase()} ${pack.loaderVersion || ''}`;
    drawerModsCount.textContent = `${pack.modCount} Mods`;
    drawerStatus.textContent = pack.status.replace('_', ' ').toUpperCase();

    if (pack.thumbnail) {
      drawerBannerContainer.innerHTML = `<img src="${pack.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      drawerBannerContainer.innerHTML = `
        <div style="color: #64748b; font-family: monospace; font-size: 11px; font-weight: 700;">
          MC ${pack.gameVersion}
        </div>
      `;
    }

    drawerPathCf.value = pack.instanceDir;
    drawerPathHome.value = pack.targetHomeDir;

    if (pack.syncMeta && pack.syncMeta.lastSynced) {
      drawerSyncMetaBox.classList.remove('hidden');
      drawerLastSyncDate.textContent = new Date(pack.syncMeta.lastSynced).toLocaleString();
    } else {
      drawerSyncMetaBox.classList.add('hidden');
    }

    if (pack.isSynced) {
      drawerPlayBtn?.classList.remove('hidden');
      if (drawerPlayBtn) {
        drawerPlayBtn.onclick = () => {
          closeDetailsDrawer();
          handlePlayModpack(pack);
        };
      }
      drawerActionBtn.innerHTML = `
        <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>Re-Sync Files</span>
      `;
      drawerActionBtn.className = 'btn-primary btn-sync-cyan';
    } else {
      drawerPlayBtn?.classList.add('hidden');
      if (pack.status === 'ready') {
        drawerActionBtn.innerHTML = `
          <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Import to Launcher</span>
        `;
        drawerActionBtn.className = 'btn-primary';
      } else {
        drawerActionBtn.innerHTML = `
          <svg class="icon-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>View Loader Guide</span>
        `;
        drawerActionBtn.className = 'btn-primary btn-warning-guide';
      }
    }

    drawerActionBtn.onclick = () => {
      closeDetailsDrawer();
      if (pack.status === 'synced' || pack.status === 'ready') openImportModal(pack);
      else openGuideModal(pack);
    };

    drawerOpenFolderBtn.onclick = () => {
      if (window.bridgeAPI) window.bridgeAPI.openPath(pack.isSynced ? pack.targetHomeDir : pack.instanceDir);
    };

    drawerDetails.classList.add('open');
    drawerBackdrop?.classList.add('active');
  }

  function closeDetailsDrawer() {
    drawerDetails?.classList.remove('open');
    drawerBackdrop?.classList.remove('active');
  }

  drawerDetailsClose?.addEventListener('click', closeDetailsDrawer);
  drawerBackdrop?.addEventListener('click', closeDetailsDrawer);

  // Click outside drawer dismisses it
  document.addEventListener('pointerdown', (e) => {
    if (!drawerDetails || !drawerDetails.classList.contains('open')) return;
    if (drawerDetails.contains(e.target)) return;
    // Don't close if clicking the info button or card title that triggered opening
    if (e.target.closest && (e.target.closest('.card-info-btn') || e.target.closest('.card-title'))) return;
    closeDetailsDrawer();
  });

  btnCopyCfPath?.addEventListener('click', () => {
    navigator.clipboard.writeText(drawerPathCf.value);
    showToast('CurseForge path copied to clipboard', 'info');
  });

  btnCopyHomePath?.addEventListener('click', () => {
    navigator.clipboard.writeText(drawerPathHome.value);
    showToast('Launcher home path copied to clipboard', 'info');
  });

  // Settings
  function openSettingsModal() {
    if (!state.config) return;
    settingInstancesPath.value = state.config.instancesPath || '';
    settingMcPath.value = state.config.minecraftPath || '';
    settingLauncherPath.value = state.config.customLauncherPath || '';
    settingCleanSync.checked = state.config.cleanSync ?? true;
    settingIncludeSaves.checked = state.config.includeSaves ?? false;
    modalSettings.classList.remove('hidden');
  }

  function closeSettingsModal() {
    modalSettings.classList.add('hidden');
  }

  btnBrowseInstances?.addEventListener('click', async () => {
    if (window.bridgeAPI) {
      const selected = await window.bridgeAPI.selectDirectory(settingInstancesPath.value);
      if (selected) settingInstancesPath.value = selected;
    }
  });

  btnBrowseMc?.addEventListener('click', async () => {
    if (window.bridgeAPI) {
      const selected = await window.bridgeAPI.selectDirectory(settingMcPath.value);
      if (selected) settingMcPath.value = selected;
    }
  });

  btnBrowseLauncher?.addEventListener('click', async () => {
    if (window.bridgeAPI && window.bridgeAPI.selectFile) {
      const selected = await window.bridgeAPI.selectFile({
        defaultPath: settingLauncherPath.value,
        title: 'Select Launcher Executable (.exe)'
      });
      if (selected) settingLauncherPath.value = selected;
    } else if (window.bridgeAPI) {
      const selected = await window.bridgeAPI.selectDirectory(settingLauncherPath.value);
      if (selected) settingLauncherPath.value = selected;
    }
  });

  btnSaveSettings?.addEventListener('click', async () => {
    if (!window.bridgeAPI) return;
    const newCfg = {
      instancesPath: settingInstancesPath.value.trim(),
      minecraftPath: settingMcPath.value.trim(),
      customLauncherPath: settingLauncherPath.value.trim(),
      cleanSync: settingCleanSync.checked,
      includeSaves: settingIncludeSaves.checked
    };
    await window.bridgeAPI.saveConfig(newCfg);
    state.config = newCfg;
    closeSettingsModal();
    showToast('Settings saved successfully', 'success');
    performScan();
  });

  btnResetSettings?.addEventListener('click', async () => {
    if (!window.bridgeAPI) return;
    const defaults = await window.bridgeAPI.getDefaults();
    settingInstancesPath.value = defaults.instancesPath;
    settingMcPath.value = defaults.minecraftPath;
    settingLauncherPath.value = defaults.customLauncherPath;
    settingCleanSync.checked = defaults.cleanSync;
    settingIncludeSaves.checked = defaults.includeSaves;
    showToast('Reset to default paths', 'info');
  });

  btnOpenSettings?.addEventListener('click', openSettingsModal);
  btnEmptySettings?.addEventListener('click', openSettingsModal);
  modalSettingsClose?.addEventListener('click', closeSettingsModal);
  modalSettingsCancel?.addEventListener('click', closeSettingsModal);

  modalImportClose?.addEventListener('click', closeImportModal);
  modalImportCancel?.addEventListener('click', closeImportModal);

  btnRefresh?.addEventListener('click', performScan);
  btnOpenMc?.addEventListener('click', () => {
    if (state.config && window.bridgeAPI) window.bridgeAPI.openPath(state.config.minecraftPath);
  });
  btnLaunchGame?.addEventListener('click', async () => {
    if (!window.bridgeAPI) return;
    showToast('Starting Legacy Launcher...', 'info');
    const res = await window.bridgeAPI.openLegacyLauncher();
    if (res && res.success) {
      showToast('Legacy Launcher launched!', 'success');
    } else {
      showToast(res?.error || 'Could not launch Legacy Launcher. Check settings.', 'error');
    }
  });

  // Search input
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    if (searchClearBtn) searchClearBtn.classList.toggle('hidden', state.searchQuery.length === 0);
    renderModpacks();
  });

  searchClearBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    searchClearBtn.classList.add('hidden');
    renderModpacks();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    } else if (e.key === 'Escape') {
      if (!modalImport.classList.contains('hidden')) closeImportModal();
      else if (!modalProgress.classList.contains('hidden') && !state.isSyncing) modalProgress.classList.add('hidden');
      else if (!modalGuide.classList.contains('hidden')) modalGuide.classList.add('hidden');
      else if (!modalSettings.classList.contains('hidden')) closeSettingsModal();
      else if (drawerDetails.classList.contains('open')) closeDetailsDrawer();
    }
  });

  loaderFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      loaderFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterLoader = btn.dataset.loader;
      renderModpacks();
    });
  });

  statusFilter?.addEventListener('change', (e) => {
    state.filterStatus = e.target.value;
    renderModpacks();
  });

  // ==================== ONBOARDING SETUP LOGIC ====================
  let validateTimeout = null;

  async function showOnboardingView() {
    if (!onboardingView) return;
    const cfg = state.config || (await window.bridgeAPI.getConfig());
    state.config = cfg;

    onboardingCfPath.value = cfg.instancesPath || '';
    onboardingMcPath.value = cfg.minecraftPath || '';
    onboardingCleanSync.checked = cfg.cleanSync ?? true;

    onboardingView.classList.remove('hidden', 'fade-out');

    // Run real-time validation immediately
    validateOnboardingPaths();
  }

  async function validateOnboardingPaths() {
    if (!window.bridgeAPI || !window.bridgeAPI.validatePaths) return;
    const cfPath = onboardingCfPath.value.trim();
    const mcPath = onboardingMcPath.value.trim();

    onboardingCfBadge.className = 'path-badge badge-checking';
    onboardingCfBadge.textContent = 'Checking...';
    onboardingMcBadge.className = 'path-badge badge-checking';
    onboardingMcBadge.textContent = 'Checking...';

    try {
      const res = await window.bridgeAPI.validatePaths({
        minecraftPath: mcPath,
        instancesPath: cfPath
      });

      // CurseForge validation
      if (res.curseforge.valid) {
        if (res.curseforge.count > 0) {
          onboardingCfBadge.className = 'path-badge badge-valid';
          onboardingCfBadge.textContent = `✓ ${res.curseforge.count} Modpacks found`;
        } else {
          onboardingCfBadge.className = 'path-badge badge-warning';
          onboardingCfBadge.textContent = 'Folder exists (0 packs)';
        }
      } else {
        onboardingCfBadge.className = 'path-badge badge-invalid';
        onboardingCfBadge.textContent = 'Not found';
      }
      onboardingCfHint.textContent = res.curseforge.message;

      // Minecraft validation
      if (res.minecraft.valid) {
        if (res.minecraft.count > 0) {
          onboardingMcBadge.className = 'path-badge badge-valid';
          onboardingMcBadge.textContent = `✓ ${res.minecraft.count} Loaders detected`;
        } else {
          onboardingMcBadge.className = 'path-badge badge-warning';
          onboardingMcBadge.textContent = 'Valid .minecraft';
        }
      } else {
        onboardingMcBadge.className = 'path-badge badge-invalid';
        onboardingMcBadge.textContent = 'Not found';
      }
      onboardingMcHint.textContent = res.minecraft.message;
    } catch (err) {
      console.error('Path validation error:', err);
    }
  }

  function debouncedValidate() {
    if (validateTimeout) clearTimeout(validateTimeout);
    validateTimeout = setTimeout(validateOnboardingPaths, 300);
  }

  onboardingCfPath?.addEventListener('input', debouncedValidate);
  onboardingMcPath?.addEventListener('input', debouncedValidate);

  onboardingBrowseCf?.addEventListener('click', async () => {
    if (!window.bridgeAPI) return;
    const selected = await window.bridgeAPI.selectDirectory(onboardingCfPath.value);
    if (selected) {
      onboardingCfPath.value = selected;
      validateOnboardingPaths();
    }
  });

  onboardingBrowseMc?.addEventListener('click', async () => {
    if (!window.bridgeAPI) return;
    const selected = await window.bridgeAPI.selectDirectory(onboardingMcPath.value);
    if (selected) {
      onboardingMcPath.value = selected;
      validateOnboardingPaths();
    }
  });

  onboardingStartBtn?.addEventListener('click', async () => {
    if (!window.bridgeAPI) return;
    const cfPath = onboardingCfPath.value.trim();
    const mcPath = onboardingMcPath.value.trim();
    const cleanSync = onboardingCleanSync.checked;

    if (!cfPath || !mcPath) {
      showToast('Please provide paths for both directories before starting.', 'error');
      return;
    }

    try {
      const updated = await window.bridgeAPI.saveConfig({
        instancesPath: cfPath,
        minecraftPath: mcPath,
        cleanSync,
        firstRunCompleted: true
      });
      state.config = updated;

      // Smooth fade transition to main interface
      onboardingView.classList.add('fade-out');
      setTimeout(() => {
        onboardingView.classList.add('hidden');
        onboardingView.classList.remove('fade-out');
        showToast('Directories confirmed! Scanning modpacks...', 'success');
        performScan();
      }, 250);
    } catch (err) {
      showToast('Failed to save configuration: ' + err.message, 'error');
    }
  });

  btnRerunWizard?.addEventListener('click', () => {
    closeSettingsModal();
    showOnboardingView();
  });

  // App Initialization Flow (First-run detection)
  async function initApp() {
    if (!window.bridgeAPI) return;
    try {
      const cfg = await window.bridgeAPI.getConfig();
      state.config = cfg;
      if (!cfg.firstRunCompleted) {
        showOnboardingView();
      } else {
        performScan();
      }
    } catch (err) {
      console.error('App init error:', err);
      performScan();
    }
  }

  initApp();
});
