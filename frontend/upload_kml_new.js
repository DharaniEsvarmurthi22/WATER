// upload_kml.js - Simplified KML Upload with Device Linking Popup

let supabase = null;
let currentUser = null;
let uploadedKmlId = null;

// Initialize
(async function init() {
    // Initialize Supabase
    if (window.ENV_CONFIG && window.supabase) {
        supabase = window.supabase.createClient(
            window.ENV_CONFIG.SUPABASE_URL,
            window.ENV_CONFIG.SUPABASE_ANON_KEY
        );
        console.log('✅ Supabase initialized');
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showMessage('Please login first', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }
    currentUser = user;

    // Setup event listeners
    setupEventListeners();

    // Load existing KMLs
    loadExistingKMLs();
})();

function setupEventListeners() {
    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleKMLUpload);
    }

    // Modal buttons
    const linkDeviceBtn = document.getElementById('linkDeviceBtn');
    const skipLinkBtn = document.getElementById('skipLinkBtn');
    
    if (linkDeviceBtn) {
        linkDeviceBtn.addEventListener('click', handleDeviceLink);
    }
    
    if (skipLinkBtn) {
        skipLinkBtn.addEventListener('click', closeModal);
    }
}

// Handle KML Upload
async function handleKMLUpload(e) {
    e.preventDefault();

    const kmlFile = document.getElementById('kmlFile').files[0];
    const overlayName = document.getElementById('overlayName').value || kmlFile.name.replace(/\.[^/.]+$/, "");

    if (!kmlFile) {
        showMessage('Please select a KML file', 'error');
        return;
    }

    showMessage('Uploading KML file...', 'info');

    try {
        // 1. Upload file to storage
        const timestamp = Date.now();
        const filename = `${currentUser.id}/${timestamp}_${kmlFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('kml-overlays')
            .upload(filename, kmlFile, {
                contentType: 'application/vnd.google-earth.kml+xml',
                upsert: false
            });

        if (uploadError) throw uploadError;

        console.log('✅ File uploaded:', uploadData.path);

        // 2. Create database record
        const { data: kmlRecord, error: dbError } = await supabase
            .from('kml_overlays')
            .insert({
                name: overlayName,
                file_name: kmlFile.name,
                storage_path: uploadData.path,
                owner_user_id: currentUser.id,
                enabled: true
            })
            .select()
            .single();

        if (dbError) throw dbError;

        console.log('✅ KML record created:', kmlRecord);

        uploadedKmlId = kmlRecord.id;

        showMessage('KML uploaded successfully! Now link a device...', 'success');

        // Clear form
        document.getElementById('kmlFile').value = '';
        document.getElementById('overlayName').value = '';

        // Show device linking modal
        setTimeout(() => {
            showDeviceLinkModal();
        }, 1000);

    } catch (error) {
        console.error('Upload error:', error);
        showMessage('Upload failed: ' + error.message, 'error');
    }
}

// Show Device Link Modal
function showDeviceLinkModal() {
    const modal = document.getElementById('deviceLinkModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        
        // Clear previous inputs
        document.getElementById('modalDeviceId').value = '';
        document.getElementById('modalDeviceName').value = '';
        document.getElementById('modalDevicePassword').value = '';
        document.getElementById('modalMessage').innerHTML = '';
        
        // Load user's claimed devices for quick selection
        loadClaimedDevicesForModal();
    }
}

// Load claimed devices to show in modal
async function loadClaimedDevicesForModal() {
    try {
        const { data: devices, error } = await supabase.rpc('get_user_devices');
        
        if (error) {
            console.warn('Could not load claimed devices:', error);
            return;
        }

        if (devices && devices.length > 0) {
            // Show info about already claimed devices
            const deviceList = devices.map(d => d.device_identifier || d.device_id).join(', ');
            showModalMessage(`💡 You already have claimed devices: ${deviceList}. You can link an existing device or claim a new one.`, 'info');
        }
    } catch (err) {
        console.warn('Error loading devices:', err);
    }
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('deviceLinkModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
    
    // Reload KML list
    loadExistingKMLs();
}

// Handle Device Linking
async function handleDeviceLink() {
    const deviceId = document.getElementById('modalDeviceId').value.trim();
    const deviceName = document.getElementById('modalDeviceName').value.trim();
    const devicePassword = document.getElementById('modalDevicePassword').value.trim();

    if (!deviceId || !devicePassword) {
        showModalMessage('Please enter Device ID and Password', 'error');
        return;
    }

    if (!uploadedKmlId) {
        showModalMessage('No KML file to link', 'error');
        return;
    }

    const linkBtn = document.getElementById('linkDeviceBtn');
    linkBtn.disabled = true;
    linkBtn.textContent = 'Linking...';

    try {
        showModalMessage('⏳ Claiming device...', 'info');

        // 1. Claim device using the correct RPC function (supports one-time claim with edit)
        const { data: claimData, error: claimError } = await supabase.rpc('claim_device', {
            p_device_identifier: deviceId,
            p_secret: devicePassword
        });

        if (claimError) {
            // Handle specific error messages
            if (claimError.message.includes('already claimed by another user')) {
                throw new Error('This device is already claimed by another user. Contact admin to reassign.');
            }
            throw claimError;
        }

        // claim_device returns a row, check if we got data
        if (!claimData || claimData.length === 0) {
            throw new Error('Device claim failed. Please check your credentials.');
        }

        const deviceInfo = claimData[0];
        console.log('✅ Device claimed/verified:', deviceInfo);

        showModalMessage('✅ Device claimed! Linking to KML...', 'info');

        // 2. Update device with name if provided (using update_device function)
        if (deviceName && deviceName !== deviceInfo.device_name) {
            const { data: updateResult, error: updateError } = await supabase.rpc('update_device', {
                p_device_identifier: deviceId,
                p_device_name: deviceName,
                p_location_id: null  // Keep existing location
            });

            if (updateError) {
                console.warn('Could not update device name:', updateError);
            } else if (updateResult && updateResult.success) {
                console.log('✅ Device name updated');
            }
        }

        // 3. Link device to KML using the link_device_to_kml function
        const { data: linkResult, error: linkError } = await supabase.rpc('link_device_to_kml', {
            p_device_identifier: deviceId,
            p_kml_overlay_id: uploadedKmlId
        });

        if (linkError) {
            console.error('Link error:', linkError);
            throw new Error('Failed to link device to KML: ' + linkError.message);
        }

        // Check if linking was successful
        if (!linkResult || !linkResult.success) {
            throw new Error(linkResult?.message || 'Failed to link device to KML');
        }

        console.log('✅ Device linked to KML:', linkResult);

        showModalMessage('✅ Device and KML linked successfully!', 'success');

        setTimeout(() => {
            closeModal();
            showMessage('KML uploaded and linked to device successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }, 1500);

    } catch (error) {
        console.error('Device link error:', error);
        showModalMessage('❌ ' + (error.message || 'Failed to link device'), 'error');
    } finally {
        linkBtn.disabled = false;
        linkBtn.textContent = 'Link Device';
    }
}

// Load Existing KMLs
async function loadExistingKMLs() {
    try {
        const { data: kmls, error } = await supabase
            .from('kml_overlays')
            .select('*, devices!kml_overlays_linked_device_id_fkey(device_id, device_name)')
            .eq('owner_user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const listDiv = document.getElementById('existingKmlList');
        
        if (!kmls || kmls.length === 0) {
            listDiv.innerHTML = '<div class="text-sm text-gray-500">No KML files uploaded yet</div>';
            return;
        }

        listDiv.innerHTML = kmls.map(kml => `
            <div class="border rounded p-3 bg-gray-50">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="font-medium">${kml.name}</div>
                        <div class="text-xs text-gray-600 mt-1">
                            File: ${kml.file_name}
                        </div>
                        ${kml.linked_device_id ? `
                            <div class="text-xs text-green-600 mt-1">
                                🔗 Linked to: ${kml.devices?.device_name || kml.linked_device_id}
                            </div>
                        ` : `
                            <div class="text-xs text-orange-600 mt-1">
                                ⚠️ No device linked
                            </div>
                        `}
                        <div class="text-xs text-gray-500 mt-1">
                            Uploaded: ${new Date(kml.created_at).toLocaleString()}
                        </div>
                    </div>
                    <button onclick="deleteKML('${kml.id}')" class="text-red-600 text-sm hover:underline">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading KMLs:', error);
    }
}

// Delete KML
async function deleteKML(kmlId) {
    if (!confirm('Delete this KML overlay?')) return;

    try {
        // Get KML details
        const { data: kml } = await supabase
            .from('kml_overlays')
            .select('storage_path')
            .eq('id', kmlId)
            .single();

        // Delete from storage
        if (kml?.storage_path) {
            await supabase.storage
                .from('kml-overlays')
                .remove([kml.storage_path]);
        }

        // Delete from database
        const { error } = await supabase
            .from('kml_overlays')
            .delete()
            .eq('id', kmlId);

        if (error) throw error;

        showMessage('KML deleted successfully', 'success');
        loadExistingKMLs();

    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Delete failed: ' + error.message, 'error');
    }
}

// Utility: Show Message
function showMessage(msg, type) {
    const msgDiv = document.getElementById('message');
    if (!msgDiv) return;

    const colors = {
        success: 'text-green-700 bg-green-100 border-green-400',
        error: 'text-red-700 bg-red-100 border-red-400',
        info: 'text-blue-700 bg-blue-100 border-blue-400'
    };

    msgDiv.className = `mb-4 text-sm p-3 border-l-4 ${colors[type] || colors.info}`;
    msgDiv.textContent = msg;
    msgDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            msgDiv.style.display = 'none';
        }, 5000);
    }
}

// Utility: Show Modal Message
function showModalMessage(msg, type) {
    const msgDiv = document.getElementById('modalMessage');
    if (!msgDiv) return;

    const colors = {
        success: 'text-green-700 bg-green-100 border-green-400',
        error: 'text-red-700 bg-red-100 border-red-400',
        info: 'text-blue-700 bg-blue-100 border-blue-400'
    };

    msgDiv.className = `mb-4 text-sm p-3 border-l-4 ${colors[type] || colors.info}`;
    msgDiv.textContent = msg;
}

// Make deleteKML global
window.deleteKML = deleteKML;
