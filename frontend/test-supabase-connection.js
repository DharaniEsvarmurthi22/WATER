// ============================================
// SUPABASE CONNECTION TEST - Frontend
// Test this in browser console on your dashboard
// ============================================

async function testSupabaseConnection() {
    console.log('========================================');
    console.log('   SUPABASE CONNECTION TEST');
    console.log('========================================\n');

    // 1. Check if Supabase is initialized
    console.log('1. CHECKING SUPABASE CLIENT...');
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase client not initialized');
        console.log('   Make sure env-config.js is loaded');
        return;
    }
    console.log('✅ Supabase client initialized\n');

    // 2. Check authentication
    console.log('2. CHECKING AUTHENTICATION...');
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (user) {
            console.log('✅ User authenticated');
            console.log('   User ID:', user.id);
            console.log('   Email:', user.email);
        } else {
            console.log('⚠️  No user authenticated');
            console.log('   Please login first');
        }
    } catch (error) {
        console.error('❌ Authentication check failed:', error.message);
    }
    console.log('');

    // 3. Test devices table
    console.log('3. CHECKING DEVICES TABLE...');
    try {
        const { data, error, count } = await supabase
            .from('devices')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ devices table accessible');
        console.log('   Total records:', count);
    } catch (error) {
        console.error('❌ devices table error:', error.message);
    }
    console.log('');

    // 4. Test kml_overlays table
    console.log('4. CHECKING KML_OVERLAYS TABLE...');
    try {
        const { data, error, count } = await supabase
            .from('kml_overlays')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ kml_overlays table accessible');
        console.log('   Total records:', count);
    } catch (error) {
        console.error('❌ kml_overlays table error:', error.message);
    }
    console.log('');

    // 5. Test user_profiles table
    console.log('5. CHECKING USER_PROFILES TABLE...');
    try {
        const { data, error, count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ user_profiles table accessible');
        console.log('   Total records:', count);
    } catch (error) {
        console.error('❌ user_profiles table error:', error.message);
    }
    console.log('');

    // 6. Test sensor_readings table
    console.log('6. CHECKING SENSOR_READINGS TABLE...');
    try {
        const { data, error, count } = await supabase
            .from('sensor_readings')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ sensor_readings table accessible');
        console.log('   Total records:', count);
    } catch (error) {
        console.error('❌ sensor_readings table error:', error.message);
    }
    console.log('');

    // 7. Test RPC functions
    console.log('7. CHECKING RPC FUNCTIONS...');
    
    // Test claim_device (will fail without params, but shows it exists)
    try {
        await supabase.rpc('claim_device', {
            p_device_identifier: 'TEST',
            p_secret: 'TEST'
        });
        console.log('✅ claim_device() function exists');
    } catch (error) {
        if (error.message.includes('does not exist')) {
            console.error('❌ claim_device() function NOT found');
        } else {
            console.log('✅ claim_device() function exists (test call failed as expected)');
        }
    }

    // Test get_user_devices
    try {
        const { data, error } = await supabase.rpc('get_user_devices');
        if (error && error.message.includes('does not exist')) {
            console.error('❌ get_user_devices() function NOT found');
        } else {
            console.log('✅ get_user_devices() function exists');
            console.log('   Your devices:', data ? data.length : 0);
        }
    } catch (error) {
        console.log('✅ get_user_devices() function exists');
    }

    // Test link_device_to_kml
    try {
        await supabase.rpc('link_device_to_kml', {
            p_device_identifier: 'TEST',
            p_kml_overlay_id: '00000000-0000-0000-0000-000000000000'
        });
        console.log('✅ link_device_to_kml() function exists');
    } catch (error) {
        if (error.message.includes('does not exist')) {
            console.error('❌ link_device_to_kml() function NOT found');
        } else {
            console.log('✅ link_device_to_kml() function exists (test call failed as expected)');
        }
    }
    
    console.log('');

    // 8. Test Storage
    console.log('8. CHECKING STORAGE BUCKET...');
    try {
        const { data, error } = await supabase.storage
            .from('kml-overlays')
            .list('', { limit: 1 });
        
        if (error) throw error;
        
        console.log('✅ kml-overlays bucket accessible');
    } catch (error) {
        console.error('❌ Storage bucket error:', error.message);
    }
    console.log('');

    // 9. Summary
    console.log('========================================');
    console.log('   TEST COMPLETE');
    console.log('========================================\n');
    console.log('Check for ❌ marks above to identify issues.');
    console.log('If functions are missing, run SQL setup scripts in Supabase.');
}

// Run the test
testSupabaseConnection();
