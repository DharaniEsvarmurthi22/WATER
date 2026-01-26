// user_overlays.js
// Manage per-user overlay list and admin user selector
(async function () {
  // DEBUG: Check if device_linking.js loaded
  console.log('🔍 user_overlays.js starting, checking for showDeviceLinkPopup...');
  console.log('window.showDeviceLinkPopup exists?', typeof window.showDeviceLinkPopup);
  
  // wait for auth manager if present
  async function waitForAuth(timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (window.authManager && (window.authManager.currentUser || window.authManager.userProfile)) return window.authManager;
      await new Promise(r => setTimeout(r, 100));
    }
    return window.authManager || null;
  }

  const auth = await waitForAuth();
  const supClient = (auth && typeof auth.getSupabaseClient === 'function') ? auth.getSupabaseClient() : (window.supabase && window.ENV_CONFIG ? window.supabase.createClient(window.ENV_CONFIG.SUPABASE_URL, window.ENV_CONFIG.SUPABASE_ANON_KEY) : null);
  if (!supClient) {
    console.warn('Supabase client not available for user_overlays');
    return;
  }

  const userOverlayList = document.getElementById('userOverlayList');
  const adminPanel = document.getElementById('adminPanel');
  const adminSelect = document.getElementById('adminUserSelect');
  const adminLoadBtn = document.getElementById('adminLoadUserBtn');
  // removed forceLoadBtn: temporary 'Load' button removed from UI

  // populate admin select (try user_profiles first, fallback to kml_overlays owners)
  async function populateAdminSelect() {
    if (!adminSelect) return;
    try {
      // debug logging removed

      // Fetch profiles and owners in parallel
      const [profilesRes, ownersRes] = await Promise.all([
        supClient.from('user_profiles').select('user_id,email,role'),
        supClient.from('kml_overlays').select('owner_user_id').limit(1000)
      ]);

      const users = profilesRes.data || [];
      const owners = ownersRes.data || [];
      if (profilesRes.error) console.warn('user_profiles error', profilesRes.error);
      if (ownersRes.error) console.warn('kml_overlays owners error', ownersRes.error);

      // Build map of id -> profile
      const profMap = {};
      users.forEach(u => { if (u && u.user_id) profMap[String(u.user_id).trim()] = u; });

      // Collect all distinct user_ids from profiles + owners
      const idSet = new Set();
      users.forEach(u => { if (u && u.user_id) idSet.add(String(u.user_id).trim()); });
      owners.forEach(o => { if (o && o.owner_user_id) idSet.add(String(o.owner_user_id).trim()); });

      let entries = Array.from(idSet).map(id => {
        const p = profMap[id];
        const label = (p && p.email) ? String(p.email).trim() : id;
        const role = p && p.role ? p.role : null;
        return { id, label, role };
      });

      // Deduplicate entries by label (case-insensitive).
      // If multiple ids map to the same label (e.g. owner stored as email vs user_profiles row),
      // prefer an entry whose id actually appears in `kml_overlays.owner_user_id` (owners list),
      // otherwise prefer an entry that has a role (e.g., admin), else keep the first seen.
      const ownerIds = new Set((owners || []).map(o => (o && o.owner_user_id) ? String(o.owner_user_id).trim() : null).filter(Boolean));
      const byLabel = {};
      entries.forEach(e => {
        const key = (e.label || '').toLowerCase();
        if (!byLabel[key]) {
          byLabel[key] = e;
          return;
        }
        const existing = byLabel[key];
        const existingIsOwner = ownerIds.has(String(existing.id).trim());
        const candidateIsOwner = ownerIds.has(String(e.id).trim());
        if (candidateIsOwner && !existingIsOwner) {
          byLabel[key] = e;
          return;
        }
        if (!candidateIsOwner && existingIsOwner) {
          // keep existing
          return;
        }
        // Neither or both are owners: prefer one with a role (admin)
        if ((!existing.role || existing.role === null) && e.role) {
          byLabel[key] = e;
          return;
        }
        // otherwise keep existing
      });
      entries = Object.values(byLabel);

      if (entries.length === 0) {
        adminSelect.innerHTML = '';
        adminSelect.appendChild(new Option('(No users found)', ''));
        return;
      }

      // Sort by label (case-insensitive)
      entries.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

      adminSelect.innerHTML = '';
      adminSelect.appendChild(new Option('-- Select user --', ''));
      entries.forEach(e => {
        const roleLabel = e.role === 'admin' ? ' (admin)' : '';
        adminSelect.appendChild(new Option(e.label + roleLabel, String(e.id).trim()));
      });

      // admin debug message removed
    } catch (err) {
      console.error('populateAdminSelect error', err);
      adminSelect.innerHTML = '';
      adminSelect.appendChild(new Option('(Failed to load users)', ''));
      // admin debug message removed
    }
  }

  // render overlays for a user (expose globally for map.js to call)
  async function renderOverlaysForUser(userId, displayLabel) {
    if (!userOverlayList) return;
    userId = (userId || '').toString().trim();
    displayLabel = (displayLabel || '').toString().trim();
    if (!userId) {
      userOverlayList.innerHTML = '<div class="text-xs text-gray-500">No user selected</div>';
      return;
    }
    try {
      userOverlayList.innerHTML = '<div class="text-xs text-gray-500">Loading overlays...</div>';
      let { data: rows, error } = await supClient.from('kml_overlays').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false });
      console.log('renderOverlaysForUser primary query', userId, rows, error);
      if (error) throw error;

      // Fallbacks: if no rows found, try matching by email label or by storage_path/file_name containing id or label
      if ((!rows || rows.length === 0) && displayLabel) {
        // try owner_user_id == displayLabel (in case owner stored as email)
        try {
          const { data: rows2, error: err2 } = await supClient.from('kml_overlays').select('*').eq('owner_user_id', displayLabel).order('created_at', { ascending: false });
          console.log('renderOverlaysForUser fallback owner_user_id=email', displayLabel, rows2, err2);
          if (!err2 && rows2 && rows2.length > 0) { rows = rows2; error = null; }
        } catch (e) { console.warn('fallback owner by email failed', e); }
      }

      if ((!rows || rows.length === 0) && (userId || displayLabel)) {
        const likeCandidates = [];
        if (userId) likeCandidates.push(userId);
        if (displayLabel) likeCandidates.push(displayLabel);
        // try storage_path contains
        for (const candidate of likeCandidates) {
          try {
            const { data: rows3, error: err3 } = await supClient.from('kml_overlays').select('*').ilike('storage_path', `%${candidate}%`).order('created_at', { ascending: false });
            console.log('renderOverlaysForUser fallback storage_path ilike', candidate, rows3, err3);
            if (!err3 && rows3 && rows3.length > 0) { rows = rows3; error = null; break; }
          } catch (e) { console.warn('fallback storage_path failed', e); }
        }
      }

      if ((!rows || rows.length === 0) && displayLabel) {
        try {
          const { data: rows4, error: err4 } = await supClient.from('kml_overlays').select('*').ilike('file_name', `%${displayLabel}%`).order('created_at', { ascending: false });
          console.log('renderOverlaysForUser fallback file_name ilike', displayLabel, rows4, err4);
          if (!err4 && rows4 && rows4.length > 0) { rows = rows4; error = null; }
        } catch (e) { console.warn('fallback file_name failed', e); }
      }

      console.log('renderOverlaysForUser final rows', userId, displayLabel, rows);

      // If still no rows, fetch a sample of recent overlays to help debugging owner mismatches
      if ((!rows || rows.length === 0)) {
        try {
          const { data: sampleAll, error: sampleErr } = await supClient.from('kml_overlays').select('id,owner_user_id,storage_path,file_name,created_at').order('created_at', { ascending: false }).limit(200);
          if (sampleErr) console.warn('sample overlays error', sampleErr);
          const sampleText = (sampleAll || []).slice(0, 50).map(a => `${a.id}:${String(a.owner_user_id)}:${a.file_name || a.storage_path}`).join('\n');
          // admin debug sample removed
          console.log('Recent overlays sample for debugging', sampleAll);
        } catch (e) {
          console.error('sample overlays fetch failed', e);
        }
      }

      if (error) throw error;
      if (!rows || rows.length === 0) {
        userOverlayList.innerHTML = '<div class="text-xs text-gray-500">No overlays found</div>';
        return;
      }
      userOverlayList.innerHTML = rows.map(r => {
        const created = new Date(r.created_at).toLocaleString();
        const deviceInfo = (r.device_name || r.device_identifier) ?
          `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              <i class="fas fa-microchip mr-1"></i>${r.device_name || r.device_identifier}
            </span>` : '';
        
        return `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">${r.name || r.file_name}</div>
              <div class="text-xs text-gray-500">${r.file_name || r.storage_path}</div>
              <div class="text-xs text-gray-400 mt-1">${created}</div>
              <div class="mt-1">${deviceInfo}</div>
            </div>
            <div class="ml-2 flex flex-col gap-1">
              <button class="loadOverlayBtn px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" data-path="${r.storage_path}" data-overlay-id="${r.id}" data-source="supabase">
                <i class="fas fa-eye mr-1"></i>Show
              </button>
              <button class="deleteOverlayBtn px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50">
                <i class="fas fa-trash mr-1"></i>Delete
              </button>
            </div>
          </div>`;
      }).join('');

      document.querySelectorAll('.loadOverlayBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const path = e.currentTarget.dataset.path;
          const overlayId = e.currentTarget.dataset.overlayId;
          if (window.mapManager && typeof window.mapManager.clearKMLLayers === 'function') window.mapManager.clearKMLLayers();
          if (window.mapManager && typeof window.mapManager.loadOverlaysFromRows === 'function') {
            const payload = [{ storage_path: path, enabled: true, name: path, file_name: path, source: 'supabase', id: overlayId, overlayId: overlayId }];
            console.log('mapManager.loadOverlaysFromRows called with payload:', payload);
            await window.mapManager.loadOverlaysFromRows(payload);
          }
        });
      });

      // Link device functionality removed: no interactive link buttons are shown anymore.

      document.querySelectorAll('.deleteOverlayBtn').forEach((btn, idx) => {
        btn.addEventListener('click', async (e) => {
          const row = rows[idx];
          if (!row) return;
          if (!confirm('Delete overlay from database? This cannot be undone.')) return;
          try {
            const { error } = await supClient.from('kml_overlays').delete().eq('id', row.id);
            if (error) throw error;
            renderOverlaysForUser(row.owner_user_id);
          } catch (err) {
            console.error(err);
            alert('Delete failed: ' + (err.message || err));
          }
        });
      });
      // Also attempt to load all overlays for this user onto the map (user dashboard behavior)
      try {
        if (window.mapManager && typeof window.mapManager.loadOverlaysFromRows === 'function') {
          const rowsForMap = rows.map(r => ({ 
            storage_path: r.storage_path, 
            file_name: r.file_name || r.storage_path, 
            name: r.name || r.file_name || r.storage_path, 
            enabled: true, 
            source: 'supabase',
            id: r.id,
            overlayId: r.id
          }));
          console.log('mapManager.loadOverlaysFromRows called with rowsForMap (render):', rowsForMap);
          await window.mapManager.loadOverlaysFromRows(rowsForMap);
        }
      } catch (e) {
        console.error('mapManager load error in renderOverlaysForUser', e);
      }
    } catch (err) {
      console.error('Error loading overlays for user', err);
      userOverlayList.innerHTML = '<div class="text-xs text-red-600">Failed to load overlays</div>';
    }
  }

  // wire buttons

  if (adminLoadBtn && adminSelect) {
    adminLoadBtn.addEventListener('click', async () => {
      const sel = (adminSelect.value || '').toString().trim();
      if (!sel) {
        return alert('Select a user first');
      }
      // admin debug message removed
      const label = (adminSelect.options[adminSelect.selectedIndex]?.text || '').replace(/ \(admin\)$/, '').trim();
      await renderOverlaysForUser(sel, label);
      // Also load all overlays for this user onto the map immediately for a focused user dashboard
      try {
        const { data: rows, error } = await supClient.from('kml_overlays').select('*').eq('owner_user_id', sel).order('created_at', { ascending: false });
        console.log('admin load rows for', sel, rows, error);
        if (!error && rows && rows.length > 0 && window.mapManager && typeof window.mapManager.loadOverlaysFromRows === 'function') {
          const rowsForMap = rows.map(r => ({ storage_path: r.storage_path, file_name: r.file_name || r.storage_path, name: r.name || r.file_name || r.storage_path, enabled: true, source: 'supabase' }));
          console.log('mapManager.loadOverlaysFromRows called with rowsForMap (admin load):', rowsForMap);
          try { await window.mapManager.loadOverlaysFromRows(rowsForMap); } catch (e) { console.error('mapManager load error', e); }
        } else if (!error && (!rows || rows.length === 0)) {
          // admin debug removed
        }
      } catch (e) {
        console.error('Error loading overlays onto map', e);
      }
      // do not hide the admin panel; keep admin UI visible
    });
  }

  // Auto-load and debug when admin selection changes (helps detect owner_id mismatches)
  if (adminSelect) {
    adminSelect.addEventListener('change', async () => {
      const sel = (adminSelect.value || '').toString().trim();
      if (!sel) {
        return;
      }
      // admin debug message removed
      try {
        // show distinct owner_user_id values from kml_overlays to detect mismatches
        const { data: owners, error: ownersErr } = await supClient.from('kml_overlays').select('owner_user_id').limit(1000);
        if (ownersErr) {
          console.warn('owners query error', ownersErr);
        }
        const ownerIds = Array.from(new Set((owners || []).map(o => (o && o.owner_user_id) ? String(o.owner_user_id).trim() : null).filter(Boolean)));
        // admin debug removed
        console.log('owners in overlays', ownerIds);
      } catch (e) {
        console.error('owners list error', e);
      }
      // render overlays for the selected user as admin convenience
      const label = (adminSelect.options[adminSelect.selectedIndex]?.text || '').replace(/ \(admin\)$/, '').trim();
      await renderOverlaysForUser(sel, label);
    });
  }

  // Decide whether to show admin panel or load current user's overlays
  let profile = auth?.userProfile || null;
  const currentUserId = auth?.currentUser?.id || auth?.currentUser?.user?.id;

  // If profile not yet populated but we have a signed-in user, try to load the profile
  if (!profile && auth && typeof auth.loadUserProfile === 'function' && currentUserId) {
    try {
      await auth.loadUserProfile();
      profile = auth.userProfile || null;
    } catch (e) {
      console.warn('Could not eagerly load profile for admin check', e);
    }
  }

  if (profile && profile.role === 'admin') {
    if (adminPanel) adminPanel.classList.remove('hidden');
    await populateAdminSelect();
  } else {
    if (adminPanel) adminPanel.classList.add('hidden');
    if (currentUserId) await renderOverlaysForUser(currentUserId);
  }

  // Expose renderOverlaysForUser globally so map.js can refresh the list after upload
  window.renderOverlaysForUser = renderOverlaysForUser;
  console.log('✅ user_overlays.js initialized, renderOverlaysForUser exposed globally');

})();
