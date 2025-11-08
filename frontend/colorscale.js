// ============================================
// COLORSCALE MANAGER
// Handles dynamic color-coding of villages based on sensor values
// ============================================

class ColorscaleManager {
    constructor(mapManager) {
        console.log('🎨 ========== ColorscaleManager Constructor Called ==========');
        console.log('   Map Manager:', mapManager);
        
        this.mapManager = mapManager;
        this.currentParameter = 'ph';
        this.minValue = 6.5;  // WHO drinking water standard
        this.maxValue = 8.5;  // WHO drinking water standard
        this.autoScale = false; // Don't auto-scale by default - respect user sliders
        this.sensorData = {};
        
        console.log('   Settings:', { 
            parameter: this.currentParameter, 
            min: this.minValue, 
            max: this.maxValue,
            autoScale: this.autoScale
        });
        
        // Color schemes for different parameters
        this.colorSchemes = {
            ph: {
                colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#eab308', '#f97316', '#ef4444'],
                stops: [0, 5, 6.5, 7, 7.5, 9, 14],
                defaultMin: 0,
                defaultMax: 14,
                safeMin: 6.5,  // WHO standard
                safeMax: 8.5,  // WHO standard
                optimal: [6.5, 8.5]
            },
            turbidity: {
                colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'],
                stops: [0, 5, 25, 50, 100],
                defaultMin: 0,
                defaultMax: 100,
                safeMin: 0,    // WHO standard
                safeMax: 5,    // WHO standard (5 NTU)
                optimal: [0, 5]
            },
            temperature: {
                colors: ['#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444'],
                stops: [0, 15, 20, 25, 30, 40],
                defaultMin: 0,
                defaultMax: 40,
                safeMin: 15,   // Acceptable range
                safeMax: 25,   // Acceptable range (room temp)
                optimal: [20, 30]
            },
            tds: {
                colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'],
                stops: [0, 300, 600, 900, 1200],
                defaultMin: 0,
                defaultMax: 1200,
                safeMin: 50,   // WHO standard
                safeMax: 300,  // WHO standard (300 ppm)
                optimal: [0, 500]
            }
        };
        
        this.init();
    }
    
    init() {
        console.log('🎨 Colorscale Manager initializing...');
        this.setupEventListeners();
        
        // Initialize sliders and gradient to match default pH values
        this.onParameterChange();
        
        // DON'T auto-load sensor data or apply colors
        // Only apply when user clicks "Apply Color Scale" button
        console.log('✅ Colorscale ready. Click "Apply Color Scale" to activate.');
    }
    
    setupEventListeners() {
        // Parameter selection
        const paramSelect = document.getElementById('colorParameter');
        if (paramSelect) {
            paramSelect.addEventListener('change', (e) => {
                this.currentParameter = e.target.value;
                this.onParameterChange();
            });
        }
        
        // Min slider
        const minSlider = document.getElementById('minSlider');
        if (minSlider) {
            minSlider.addEventListener('input', (e) => {
                this.minValue = parseFloat(e.target.value);
                document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                this.updateColorGradient(); // Update arrows when min changes
                
                // Ensure min < max
                if (this.minValue >= this.maxValue) {
                    this.maxValue = this.minValue + 0.1;
                    document.getElementById('maxSlider').value = this.maxValue;
                    document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
                }
            });
        }
        
        // Min increment/decrement buttons
        const minIncrement = document.getElementById('minIncrement');
        const minDecrement = document.getElementById('minDecrement');
        
        if (minIncrement) {
            minIncrement.addEventListener('click', () => {
                this.minValue = Math.min(this.minValue + 0.5, parseFloat(minSlider.max));
                minSlider.value = this.minValue;
                document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                this.updateColorGradient(); // Update arrows
                console.log(`➕ Min value increased to: ${this.minValue}`);
            });
        }
        
        if (minDecrement) {
            minDecrement.addEventListener('click', () => {
                this.minValue = Math.max(this.minValue - 0.5, parseFloat(minSlider.min));
                minSlider.value = this.minValue;
                document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                this.updateColorGradient(); // Update arrows
                console.log(`➖ Min value decreased to: ${this.minValue}`);
            });
        }
        
        // Max slider
        const maxSlider = document.getElementById('maxSlider');
        if (maxSlider) {
            maxSlider.addEventListener('input', (e) => {
                this.maxValue = parseFloat(e.target.value);
                document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
                this.updateColorGradient(); // Update arrows when max changes
                this.updateColorGradient(); // Update arrows when max changes
                
                // Ensure max > min
                if (this.maxValue <= this.minValue) {
                    this.minValue = this.maxValue - 0.1;
                    document.getElementById('minSlider').value = this.minValue;
                    document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                }
            });
        }
        
        // Max increment/decrement buttons
        const maxIncrement = document.getElementById('maxIncrement');
        const maxDecrement = document.getElementById('maxDecrement');
        
        if (maxIncrement) {
            maxIncrement.addEventListener('click', () => {
                this.maxValue = Math.min(this.maxValue + 0.5, parseFloat(maxSlider.max));
                maxSlider.value = this.maxValue;
                document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
                this.updateColorGradient(); // Update arrows
                console.log(`➕ Max value increased to: ${this.maxValue}`);
            });
        }
        
        if (maxDecrement) {
            maxDecrement.addEventListener('click', () => {
                this.maxValue = Math.max(this.maxValue - 0.5, parseFloat(maxSlider.min));
                maxSlider.value = this.maxValue;
                document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
                this.updateColorGradient(); // Update arrows
                console.log(`➖ Max value decreased to: ${this.maxValue}`);
            });
        }
        
        // Apply button
        const applyBtn = document.getElementById('applyColorscale');
        if (applyBtn) {
            console.log('✅ Apply button found, attaching click listener');
            applyBtn.addEventListener('click', async () => {
                console.log('🖱️ ========== APPLY BUTTON CLICKED! ==========');
                
                // Show loading state
                const originalHTML = applyBtn.innerHTML;
                applyBtn.disabled = true;
                applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Applying...';
                applyBtn.classList.add('opacity-75', 'cursor-not-allowed');
                
                try {
                    // Reload sensor data first, then apply colors
                    await this.loadSensorData();
                } finally {
                    // Restore button state
                    applyBtn.disabled = false;
                    applyBtn.innerHTML = originalHTML;
                    applyBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }
            });
        } else {
            console.error('❌ Apply button NOT found! ID: applyColorscale');
        }
        
        // Auto-scale checkbox
        const autoScaleCheckbox = document.getElementById('autoScale');
        if (autoScaleCheckbox) {
            autoScaleCheckbox.addEventListener('change', (e) => {
                this.autoScale = e.target.checked;
                if (this.autoScale) {
                    this.updateRangeFromData();
                }
            });
        }
        
        // Toggle panel
        const toggleBtn = document.getElementById('toggleColorscale');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const panel = document.getElementById('colorscaleLegend');
                const icon = toggleBtn.querySelector('i');
                
                if (panel.classList.contains('collapsed')) {
                    panel.classList.remove('collapsed');
                    icon.className = 'fas fa-chevron-up';
                } else {
                    panel.classList.add('collapsed');
                    icon.className = 'fas fa-chevron-down';
                }
            });
        }
    }
    
    onParameterChange() {
        const scheme = this.colorSchemes[this.currentParameter];
        if (!scheme) return;
        
        // Update slider ranges
        const minSlider = document.getElementById('minSlider');
        const maxSlider = document.getElementById('maxSlider');
        
        if (minSlider && maxSlider) {
            minSlider.min = scheme.defaultMin;
            minSlider.max = scheme.defaultMax;
            maxSlider.min = scheme.defaultMin;
            maxSlider.max = scheme.defaultMax;
            
            if (this.autoScale) {
                this.updateRangeFromData();
            } else {
                // Set to WHO/drinking water standards
                this.minValue = scheme.safeMin;
                this.maxValue = scheme.safeMax;
                minSlider.value = this.minValue;
                maxSlider.value = this.maxValue;
                document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
            }
        }
        
        this.updateColorGradient();
        
        // DON'T auto-apply colors when changing parameter
        // User must click "Apply Color Scale" button
        console.log(`📊 Parameter changed to: ${this.currentParameter}`);
        console.log(`   Safe range: ${this.minValue} - ${this.maxValue}`);
        console.log('   Click "Apply Color Scale" to update map colors');
    }
    
    updateColorGradient() {
        const scheme = this.colorSchemes[this.currentParameter];
        if (!scheme) return;
        
        const gradient = document.getElementById('colorGradient');
        if (!gradient) return;
        
        // The gradient bar now represents ONLY the range between minValue and maxValue
        // This is the user's selected range
        
        if (this.currentParameter === 'temperature') {
            // Temperature: Blue (cold) → Cyan → Green → Yellow → Red (hot)
            gradient.style.background = `linear-gradient(to right, 
                #3b82f6 0%, 
                #06b6d4 25%, 
                #22c55e 50%, 
                #eab308 75%, 
                #ef4444 100%
            )`;
        } else {
            // pH, Turbidity, TDS: Light Red → Yellow → Green → Yellow → Light Red
            gradient.style.background = `linear-gradient(to right, 
                #fca5a5 0%, 
                #fde047 25%, 
                #22c55e 50%, 
                #fde047 75%, 
                #fca5a5 100%
            )`;
        }
        
        // Update labels to show USER'S selected range (not parameter's full range)
        document.getElementById('paramMinLabel').textContent = this.minValue.toFixed(1);
        document.getElementById('paramMaxLabel').textContent = this.maxValue.toFixed(1);
    }
    
    async loadSensorData() {
        try {
            console.log('📡 Loading sensor data...');
            console.log('   Parameter:', this.currentParameter);
            
            // Fetch latest sensor readings for all locations
            const supabaseClient = window.getSupabaseClient();
            if (!supabaseClient) {
                console.error('❌ Supabase client not available');
                return;
            }
            
            console.log('✅ Supabase client available');
            
            // Get all locations
            const { data: locations, error: locError } = await supabaseClient
                .from('locations')
                .select('location_id, name');
            
            if (locError) {
                console.error('❌ Error fetching locations:', locError);
                return;
            }
            
            console.log(`✅ Found ${locations.length} locations:`, locations.map(l => l.name));
            
            // Fetch ALL readings for the current parameter at once (MUCH FASTER!)
            const sensorIds = locations.map(loc => `${loc.location_id}_${this.currentParameter}`);
            console.log(`   Fetching data for ${sensorIds.length} sensors in ONE query...`);
            
            const { data: allReadings, error: readError } = await supabaseClient
                .from('sensor_readings')
                .select('sensor_id, value, timestamp')
                .in('sensor_id', sensorIds)
                .order('timestamp', { ascending: false });
            
            if (readError) {
                console.error('❌ Error fetching sensor readings:', readError);
                return;
            }
            
            console.log(`✅ Fetched ${allReadings.length} total readings`);
            
            // Group by sensor_id and get the latest reading for each
            this.sensorData = {};
            const latestReadings = {};
            
            // Find the most recent reading for each sensor
            for (const reading of allReadings) {
                if (!latestReadings[reading.sensor_id] || 
                    new Date(reading.timestamp) > new Date(latestReadings[reading.sensor_id].timestamp)) {
                    latestReadings[reading.sensor_id] = reading;
                }
            }
            
            // Map sensor data back to locations
            for (const location of locations) {
                const sensorId = `${location.location_id}_${this.currentParameter}`;
                const reading = latestReadings[sensorId];
                
                if (reading) {
                    this.sensorData[location.location_id] = {
                        value: reading.value,
                        timestamp: reading.timestamp,
                        name: location.name
                    };
                    console.log(`   ✅ ${location.name}: ${reading.value}`);
                } else {
                    console.warn(`   ⚠️ No data found for ${location.name}`);
                }
            }
            
            console.log('📊 Sensor data loaded:', this.sensorData);
            console.log(`   Total locations with data: ${Object.keys(this.sensorData).length}`);
            
            // DON'T auto-adjust range - respect user's slider values
            // Only auto-adjust if checkbox is checked
            if (this.autoScale) {
                console.log('🔄 Auto-adjusting range (checkbox is enabled)...');
                this.updateRangeFromData();
            } else {
                console.log('✅ Using user-defined range:', this.minValue, '-', this.maxValue);
            }
            
            // Apply color scale after loading data
            console.log('🎨 Applying color scale to map...');
            this.applyColorScale();
            
        } catch (error) {
            console.error('❌ Error loading sensor data:', error);
        }
    }
    
    updateRangeFromData() {
        const values = Object.values(this.sensorData).map(d => d.value);
        
        if (values.length === 0) {
            // No data, use defaults
            const scheme = this.colorSchemes[this.currentParameter];
            this.minValue = scheme.defaultMin;
            this.maxValue = scheme.defaultMax;
        } else {
            // Calculate min/max with some padding
            const dataMin = Math.min(...values);
            const dataMax = Math.max(...values);
            const range = dataMax - dataMin;
            const padding = range * 0.1; // 10% padding
            
            this.minValue = Math.max(this.colorSchemes[this.currentParameter].defaultMin, dataMin - padding);
            this.maxValue = Math.min(this.colorSchemes[this.currentParameter].defaultMax, dataMax + padding);
        }
        
        // Update UI
        document.getElementById('minSlider').value = this.minValue;
        document.getElementById('maxSlider').value = this.maxValue;
        document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
        document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
        document.getElementById('minLabel').textContent = this.minValue.toFixed(1);
        document.getElementById('maxLabel').textContent = this.maxValue.toFixed(1);
    }
    
    applyColorScale() {
        console.log('🎨 ============ APPLY COLOR SCALE CLICKED ============');
        console.log('   Current parameter:', this.currentParameter);
        console.log('   Min value:', this.minValue);
        console.log('   Max value:', this.maxValue);
        console.log('   Auto-scale:', this.autoScale);
        console.log('   Sensor data count:', Object.keys(this.sensorData).length);
        console.log('   Sensor data:', this.sensorData);
        
        if (!this.mapManager) {
            console.error('❌ Map manager is NULL!');
            return;
        }
        
        if (!this.mapManager.map) {
            console.error('❌ Map is NULL!');
            return;
        }
        
        console.log('✅ Map manager and map are available');
        
        // Reset alert counter
        this.alertCount = 0;
        
        // Update polygon fill colors
        console.log('🔄 Starting polygon color update...');
        this.updatePolygonColors();
        console.log('✅ Polygon colors updated');
        
        // Update circle marker colors (the zoom-responsive circles)
        console.log('🔄 Starting circle marker color update...');
        this.updateCircleMarkerColors();
        console.log('✅ Circle marker colors updated');
        
        // Update HTML marker colors
        console.log('🔄 Starting HTML marker color update...');
        this.updateMarkerColors();
        console.log('✅ HTML marker colors updated');
        
        // Show alert summary if there are violations
        if (this.alertCount > 0) {
            console.error(`🚨 ALERT: ${this.alertCount} location(s) have values outside the safe range!`);
            this.showAlertNotification(this.alertCount);
        } else {
            console.log('✅ All values are within safe range');
        }
        
        console.log('✅ ============ COLOR SCALE APPLIED SUCCESSFULLY ============');
    }
    
    showAlertNotification(count) {
        // Create or update alert banner
        let banner = document.getElementById('colorscaleAlert');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'colorscaleAlert';
            banner.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #dc2626;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(banner);
        }
        
        banner.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span style="margin-left: 8px;">
                ${count} location(s) outside safe range (${this.minValue.toFixed(1)} - ${this.maxValue.toFixed(1)})
            </span>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (banner) banner.remove();
        }, 5000);
    }
    
    updatePolygonColors() {
        const map = this.mapManager.map;
        
        console.log('📐 Updating polygon colors...');
        
        // Find all KML polygon layers
        const layers = map.getStyle().layers;
        console.log('   Total layers in map:', layers.length);
        
        // Look for polygon layers - they could be named with 'kml', 'polygon', or be type 'fill'
        const polygonLayers = layers.filter(layer => 
            layer.type === 'fill' && 
            (layer.id.includes('kml') || layer.id.includes('polygon') || layer.id.includes('nallampatti'))
        );
        
        console.log('   Found polygon layers:', polygonLayers.length);
        polygonLayers.forEach(layer => console.log('      - ', layer.id));
        
        if (polygonLayers.length === 0) {
            console.warn('⚠️ No polygon layers found!');
            console.log('   All fill layers:', layers.filter(l => l.type === 'fill').map(l => l.id));
            return;
        }
        
        polygonLayers.forEach(layer => {
            console.log(`   Processing layer: ${layer.id}`);
            
            // Extract location name from layer properties
            const source = map.getSource(layer.source);
            if (!source || !source._data) {
                console.warn(`      ⚠️ No source data for layer ${layer.id}`);
                return;
            }
            
            const features = source._data.features || [];
            console.log(`      Features count: ${features.length}`);
            
            features.forEach((feature, index) => {
                const locationName = feature.properties.name;
                if (!locationName) {
                    console.warn(`         ⚠️ Feature ${index} has no name`);
                    return;
                }
                
                const locationId = locationName.toLowerCase().replace(/\s+/g, '');
                const data = this.sensorData[locationId];
                
                if (data) {
                    console.log(`         ${locationName}: value=${data.value}, range=[${this.minValue}, ${this.maxValue}]`);
                    
                    const color = this.getColorForValue(data.value);
                    console.log(`         → Color: ${color}`);
                    
                    // Count alerts (values outside range)
                    if (data.value < this.minValue || data.value > this.maxValue) {
                        this.alertCount++;
                        console.warn(`🚨 ALERT: ${locationName} = ${data.value} (safe range: ${this.minValue.toFixed(1)} - ${this.maxValue.toFixed(1)})`);
                    }
                    
                    // Update feature properties
                    feature.properties.fillColor = color;
                    feature.properties.sensorValue = data.value;
                } else {
                    console.warn(`         ⚠️ No sensor data for ${locationId}`);
                }
            });
            
            // Force map to reload the source
            console.log(`      ✅ Reloading source for layer ${layer.id}`);
            map.getSource(layer.source).setData(source._data);
        });
        
        console.log('✅ Polygon colors update complete');
    }
    
    updateCircleMarkerColors() {
        const map = this.mapManager.map;
        
        console.log('⭕ Updating circle marker colors...');
        
        // Find all circle layers (point markers from KML)
        const layers = map.getStyle().layers;
        console.log('   Total layers in map:', layers.length);
        
        const circleLayers = layers.filter(layer => 
            layer.type === 'circle' && 
            (layer.id.includes('kml') || layer.id.includes('point') || layer.id.includes('nallampatti'))
        );
        
        console.log('   Found circle layers:', circleLayers.length);
        circleLayers.forEach(layer => console.log('      - ', layer.id));
        
        if (circleLayers.length === 0) {
            console.warn('⚠️ No circle layers found!');
            console.log('   All circle layers:', layers.filter(l => l.type === 'circle').map(l => l.id));
            return;
        }
        
        circleLayers.forEach(layer => {
            console.log(`   Processing circle layer: ${layer.id}`);
            
            // Get the source data
            const source = map.getSource(layer.source);
            if (!source || !source._data) {
                console.warn(`      ⚠️ No source data for layer ${layer.id}`);
                return;
            }
            
            const features = source._data.features || [];
            console.log(`      Features count: ${features.length}`);
            
            features.forEach((feature, index) => {
                const locationName = feature.properties.name || feature.properties.Name;
                if (!locationName) {
                    console.warn(`         ⚠️ Feature ${index} has no name`);
                    return;
                }
                
                const locationId = locationName.toLowerCase().replace(/\s+/g, '');
                const data = this.sensorData[locationId];
                
                if (data) {
                    console.log(`         ${locationName}: value=${data.value}`);
                    
                    const color = this.getColorForValue(data.value);
                    console.log(`         → Circle color: ${color}`);
                    
                    // Update feature properties for circle color
                    feature.properties.markerColor = color;
                    feature.properties.sensorValue = data.value;
                } else {
                    console.warn(`         ⚠️ No sensor data for ${locationId}`);
                }
            });
            
            // Force map to reload the source
            console.log(`      ✅ Reloading circle source for layer ${layer.id}`);
            map.getSource(layer.source).setData(source._data);
        });
        
        console.log('✅ Circle marker colors update complete');
    }
    
    updateMarkerColors() {
        console.log('🎯 ============ UPDATING MARKER COLORS ============');
        
        if (!this.mapManager.markers) {
            console.warn('   ⚠️ No markers available');
            return;
        }
        
        console.log(`   Found ${this.mapManager.markers.length} markers on map`);
        console.log(`   Available sensor data locations:`, Object.keys(this.sensorData));
        
        let updatedCount = 0;
        
        this.mapManager.markers.forEach((marker, index) => {
            const locationId = marker._element.dataset.locationId;
            
            console.log(`\n   Marker ${index}:`);
            console.log(`      DOM Location ID: "${locationId}"`);
            
            if (!locationId) {
                console.warn(`      ⚠️ No location ID in dataset!`);
                console.log(`      Marker element:`, marker._element);
                return;
            }
            
            // Try to find matching sensor data
            let data = this.sensorData[locationId];
            
            // If not found, try without special characters
            if (!data) {
                const normalizedId = locationId.toLowerCase().replace(/[^a-z0-9]/g, '');
                console.log(`      Trying normalized ID: "${normalizedId}"`);
                
                for (const key in this.sensorData) {
                    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalizedKey === normalizedId) {
                        data = this.sensorData[key];
                        console.log(`      ✅ Matched with key: "${key}"`);
                        break;
                    }
                }
            }
            
            if (!data) {
                console.warn(`      ⚠️ No sensor data for "${locationId}"`);
                console.log(`      All available keys:`, Object.keys(this.sensorData));
                return;
            }
            
            const color = this.getColorForValue(data.value);
            console.log(`      Value: ${data.value} → Color: ${color}`);
            
            // Update marker color using MapLibre API
            const markerEl = marker._element.querySelector('.marker');
            if (markerEl) {
                markerEl.style.backgroundColor = color;
                const darkerColor = this.darkenColor(color);
                markerEl.style.borderColor = darkerColor;
                updatedCount++;
                console.log(`      ✅ Marker UPDATED! Background: ${color}, Border: ${darkerColor}`);
            } else {
                console.warn(`      ⚠️ .marker div not found!`);
                console.log(`      Marker HTML:`, marker._element.innerHTML);
                
                // Try direct update on parent element
                marker._element.style.backgroundColor = color;
                console.log(`      ⚠️ Applied color to parent element instead`);
            }
        });
        
        console.log(`\n✅ Marker update complete: ${updatedCount}/${this.mapManager.markers.length} markers updated`);
        
        if (updatedCount === 0) {
            console.error('❌ NO MARKERS WERE UPDATED! Check the logs above for details.');
        }
    }
    
    getColorForValue(value) {
        const scheme = this.colorSchemes[this.currentParameter];
        if (!scheme) return '#94a3b8'; // gray
        
        // OUT OF RANGE: Dark Red
        if (value < this.minValue || value > this.maxValue) {
            return '#7f1d1d'; // Dark red for out of range values
        }
        
        // Calculate position in range (0 to 1)
        const range = this.maxValue - this.minValue;
        const normalizedPosition = (value - this.minValue) / range;
        
        // Temperature: Blue (cold) → Cyan → Green → Yellow → Red (hot)
        if (this.currentParameter === 'temperature') {
            if (normalizedPosition < 0.25) {
                // Blue to Cyan (0% to 25%)
                return this.interpolateColor('#3b82f6', '#06b6d4', normalizedPosition / 0.25);
            } else if (normalizedPosition < 0.5) {
                // Cyan to Green (25% to 50%)
                return this.interpolateColor('#06b6d4', '#22c55e', (normalizedPosition - 0.25) / 0.25);
            } else if (normalizedPosition < 0.75) {
                // Green to Yellow (50% to 75%)
                return this.interpolateColor('#22c55e', '#eab308', (normalizedPosition - 0.5) / 0.25);
            } else {
                // Yellow to Red (75% to 100%)
                return this.interpolateColor('#eab308', '#ef4444', (normalizedPosition - 0.75) / 0.25);
            }
        }
        
        // pH, Turbidity, TDS: Light Red → Yellow → Green → Yellow → Light Red
        if (normalizedPosition < 0.25) {
            // Light Red to Yellow (0% to 25%)
            return this.interpolateColor('#fca5a5', '#fde047', normalizedPosition / 0.25);
        } else if (normalizedPosition < 0.5) {
            // Yellow to Green (25% to 50% - approaching optimal)
            return this.interpolateColor('#fde047', '#22c55e', (normalizedPosition - 0.25) / 0.25);
        } else if (normalizedPosition < 0.75) {
            // Green to Yellow (50% to 75% - leaving optimal)
            return this.interpolateColor('#22c55e', '#fde047', (normalizedPosition - 0.5) / 0.25);
        } else {
            // Yellow to Light Red (75% to 100%)
            return this.interpolateColor('#fde047', '#fca5a5', (normalizedPosition - 0.75) / 0.25);
        }
    }
    
    interpolateColor(color1, color2, factor) {
        // Convert hex to RGB
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        if (!c1 || !c2) return color1;
        
        // Interpolate
        const r = Math.round(c1.r + factor * (c2.r - c1.r));
        const g = Math.round(c1.g + factor * (c2.g - c1.g));
        const b = Math.round(c1.b + factor * (c2.b - c1.b));
        
        // Convert back to hex
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    darkenColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 0.7;
        const r = Math.round(rgb.r * factor);
        const g = Math.round(rgb.g * factor);
        const b = Math.round(rgb.b * factor);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
}

// Export for use in main application
window.ColorscaleManager = ColorscaleManager;
