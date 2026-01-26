// device_linking.js - Handle device claiming and device-to-KML linking
console.log('🚀 device_linking.js LOADED AT:', new Date().toISOString());

// Global variables
let currentKmlId = null;
let currentKmlName = null;

// Wait for DOM to be ready before attaching event listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDeviceLinking);
} else {
    initializeDeviceLinking();
}

function initializeDeviceLinking() {
    console.log('🔧 Initializing device linking...');
    
    // Initialize claim device modal handlers
    initializeClaimDeviceModal();
    
    // Legacy KML linking removed per user request — no link popup will be shown
}

// ========================================================================
// Claim Device Modal (Password-Based Claiming)
// ========================================================================

function initializeClaimDeviceModal() {
    console.log('🔧 Initializing claim device modal...');
    
    const openClaimBtn = document.getElementById('openClaimModal');
    const claimModal = document.getElementById('claimDeviceModal');
    const closeClaimBtn = document.getElementById('closeClaimModal');
    const cancelClaimBtn = document.getElementById('cancelClaimBtn');
    const claimForm = document.getElementById('claimDeviceForm');
    
    console.log('📋 Claim modal elements:', {
        openClaimBtn: !!openClaimBtn,
        claimModal: !!claimModal,
        closeClaimBtn: !!closeClaimBtn,
        cancelClaimBtn: !!cancelClaimBtn,
        claimForm: !!claimForm
    });
    
    // Open claim modal
    if (openClaimBtn && claimModal) {
        openClaimBtn.addEventListener('click', () => {
            console.log('🎯 Claim button clicked!');
            claimModal.classList.remove('hidden');
            claimModal.style.display = 'flex';
            loadClaimedDevices();
        });
        console.log('✅ Open claim button listener attached');
    } else {
        console.error('❌ Missing claim modal elements:', { openClaimBtn: !!openClaimBtn, claimModal: !!claimModal });
    }
    
    // Close claim modal
    function closeClaimModal() {
        if (claimModal) {
            claimModal.classList.add('hidden');
            claimModal.style.display = 'none';
        }
    }
    
    if (closeClaimBtn) {
        closeClaimBtn.addEventListener('click', closeClaimModal);
        console.log('✅ Close claim button listener attached');
    }
    
    if (cancelClaimBtn) {
        cancelClaimBtn.addEventListener('click', closeClaimModal);
        console.log('✅ Cancel claim button listener attached');
    }
    
    // Handle claim form submission
    if (claimForm) {
        claimForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📝 Claim form submitted');
            
            const deviceIdInput = document.getElementById('deviceIdInput');
            const devicePasswordInput = document.getElementById('devicePasswordInput');
            
            const deviceSecret = devicePasswordInput.value.trim();
            const deviceName = deviceIdInput.value.trim();
            
            console.log('📝 Form values:', { deviceSecret: deviceSecret ? '***' : '(empty)', deviceName });
            
            if (!deviceSecret) {
                showClaimMessage('Please enter device password', 'error');
                return;
            }
            
            try {
                const supaClient = authManager.getSupabaseClient();
                if (!supaClient) {
                    showClaimMessage('Not authenticated', 'error');
                    return;
                }
                
                console.log('📱 Claiming device with secret:', deviceSecret);
                showClaimMessage('Claiming device...', 'info');
                
                const { data, error } = await supaClient.rpc('claim_device', {
                    p_device_secret: deviceSecret,
                    p_device_name: deviceName || null
                });
                
                if (error) {
                    console.error('❌ Claim error:', error);
                    showClaimMessage('Claim failed: ' + error.message, 'error');
                    return;
                }
                
                console.log('✅ Claim result:', data);
                
                if (data && data.success) {
                    showClaimMessage('Device claimed successfully! Refreshing data...', 'success');
                    claimForm.reset();
                    
                    // Reload devices and data
                    await loadClaimedDevices();
                    
                    // Refresh dashboard data
                    if (window.fetchSensorData) {
                        setTimeout(() => {
                            window.fetchSensorData();
                            closeClaimModal();
                        }, 2000);
                    }
                } else {
                    showClaimMessage(data.error || 'Failed to claim device', 'error');
                }
                
            } catch (err) {
                console.error('Exception claiming device:', err);
                showClaimMessage('Error: ' + err.message, 'error');
            }
        });
        console.log('✅ Claim form listener attached');
    }
    
    // Show message in claim modal
    function showClaimMessage(message, type) {
        const claimMessage = document.getElementById('claimMessage');
        if (!claimMessage) return;
        
        claimMessage.textContent = message;
        claimMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700', 'bg-blue-100', 'text-blue-700');
        
        if (type === 'error') {
            claimMessage.classList.add('bg-red-100', 'text-red-700');
        } else if (type === 'success') {
            claimMessage.classList.add('bg-green-100', 'text-green-700');
        } else {
            claimMessage.classList.add('bg-blue-100', 'text-blue-700');
        }
    }
    
    // Load and display claimed devices
    async function loadClaimedDevices() {
        const devicesContainer = document.getElementById('devicesContainer');
        if (!devicesContainer) return;
        
        try {
            const supaClient = authManager.getSupabaseClient();
            if (!supaClient) return;
            
            const user = await supaClient.auth.getUser();
            if (!user.data.user) return;
            
            const { data, error } = await supaClient
                .from('device_registry')
                .select('*')
                .eq('claimed_by', user.data.user.id)
                .eq('is_claimed', true);
            
            if (error) {
                console.error('Error loading devices:', error);
                devicesContainer.innerHTML = '<p class="text-sm text-gray-500">No devices claimed yet</p>';
                return;
            }
            
            if (!data || data.length === 0) {
                devicesContainer.innerHTML = '<p class="text-sm text-gray-500">No devices claimed yet</p>';
                return;
            }
            
            devicesContainer.innerHTML = data.map(device => `
                <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-900">${device.device_name || 'Unnamed Device'}</p>
                            <p class="text-xs text-gray-500">${device.device_mac || 'No MAC'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button class="unclaimDeviceBtn px-2 py-1 text-xs text-red-600 border border-red-300 rounded" data-secret="${device.device_secret}">Unclaim</button>
                            <span class="text-xs text-green-600">✓ Active</span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Attach unclaim handlers
            document.querySelectorAll('.unclaimDeviceBtn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const secret = e.currentTarget.dataset.secret;
                    if (!secret) return;
                    if (!confirm(`Are you sure you want to unclaim device ${secret}?`)) return;
                    try {
                        const supaClient = authManager.getSupabaseClient();
                        if (!supaClient) throw new Error('Supabase client not available');
                        const { data: res, error } = await supaClient.rpc('unclaim_device', { p_device_secret: secret });
                        if (error) throw error;
                        alert('Device unclaimed successfully');
                        await loadClaimedDevices();
                    } catch (err) {
                        console.error('Unclaim failed:', err);
                        alert('Failed to unclaim device: ' + (err.message || err));
                    }
                });
            });
            
        } catch (err) {
            console.error('Exception loading devices:', err);
        }
    }
}

// Legacy KML linking support removed.
console.log('✅ Device linking module initialized (claiming only; legacy KML linking removed)');

