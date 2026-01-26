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
        this.timeInterval = '24h'; // Default to 24 hours
        this.minValue = 6.5;  // WHO drinking water standard (pH)
        this.maxValue = 8.5;  // pH default upper bound per user request (set to 8.5)
        this.autoScale = false; // Don't auto-scale by default - respect user sliders
        this.sensorData = {};

        console.log('   Settings:', {
            parameter: this.currentParameter,
            timeInterval: this.timeInterval,
            min: this.minValue,
            max: this.maxValue,
            autoScale: this.autoScale
        });

        // Color schemes for different parameters
        this.colorSchemes = {
            ph: {
                // Asymmetric pH gradient: Violet -> Blue -> Green -> Yellow -> Orange -> Red
                colors: ['#7c3aed', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'],
                // Stops in the full parameter range (0..14) for reference
                stops: [0, 4, 7, 9.5, 11.5, 14],
                defaultMin: 0,
                defaultMax: 14,
                safeMin: 6.5,  // requested default lower bound
                safeMax: 8.5,  // requested default upper bound for pH
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
                safeMin: 20,   // Default range requested by user
                safeMax: 28,   // Default range requested by user
                optimal: [20, 28]
            },
            tds: {
                colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'],
                stops: [0, 300, 600, 900, 1200],
                defaultMin: 0,
                defaultMax: 1200,
                safeMin: 50,   // Default lower bound requested by user
                safeMax: 600,  // Default upper bound requested by user
                optimal: [50, 600]
            }
        };

        this.init();
    }

    // Fetch sensor data and populate `this.sensorData` WITHOUT modifying min/max range.
    // This allows the UI to load fresh data while preserving the user's or safe defaults
    // for the color range (used when Auto-adjust is ON).
    async fetchSensorData(silent = false) {
        try {
            console.log('📡 fetchSensorData: fetching sensor data without changing ranges...');

            const now = new Date();
            const timeThresholds = {
                '1h': new Date(now - 1 * 60 * 60 * 1000),
                '6h': new Date(now - 6 * 60 * 60 * 1000),
                '24h': new Date(now - 24 * 60 * 60 * 1000),
                '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
                '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
                '3m': new Date(now - 90 * 24 * 60 * 60 * 1000),
                '6m': new Date(now - 180 * 24 * 60 * 60 * 1000),
                '1y': new Date(now - 365 * 24 * 60 * 60 * 1000)
            };
            const timeThreshold = timeThresholds[this.timeInterval];

            const supabaseClient = (window.getSupabaseClient && window.getSupabaseClient()) || null;

            let locations = [];
            let allReadings = [];

            if (supabaseClient) {
                try {
                    const { data: locData, error: locError } = await supabaseClient
                        .from('locations')
                        .select('location_id, name');
                    if (locError) throw locError;
                    locations = locData || [];

                    const sensorIds = locations.map(loc => `${loc.location_id}_${this.currentParameter}`);
                    const { data: readingsData, error: readError } = await supabaseClient
                        .from('sensor_readings')
                        .select('sensor_id, value, timestamp')
                        .in('sensor_id', sensorIds.length ? sensorIds : [''])
                        .gte('timestamp', timeThreshold.toISOString())
                        .order('timestamp', { ascending: false });
                    if (readError) throw readError;
                    allReadings = readingsData || [];
                } catch (err) {
                    console.warn('⚠️ Supabase fetch failed in fetchSensorData, will try local fallback:', err);
                    locations = [];
                    allReadings = [];
                }
            }

            if ((!locations || locations.length === 0) && window.sensorData && window.sensorData.locations) {
                locations = window.sensorData.locations.map(loc => ({ location_id: loc.id, name: loc.name }));
            }

            if ((!allReadings || allReadings.length === 0) && window.allReadings) {
                allReadings = window.allReadings.filter(r => {
                    try {
                        const ts = new Date(r.timestamp);
                        return r.sensor_id.endsWith(`_${this.currentParameter}`) && ts >= timeThreshold;
                    } catch (e) {
                        return false;
                    }
                });
            }

            // Group by sensor_id and calculate AVERAGE for each location
            this.sensorData = {};
            const sensorReadings = {};

            for (const reading of allReadings) {
                if (!sensorReadings[reading.sensor_id]) sensorReadings[reading.sensor_id] = [];
                sensorReadings[reading.sensor_id].push(reading);
            }

            let locationsWithData = 0;
            for (const location of locations) {
                const sensorId = `${location.location_id}_${this.currentParameter}`;
                const readings = sensorReadings[sensorId];
                if (readings && readings.length > 0) {
                    const sum = readings.reduce((acc, r) => acc + parseFloat(r.value), 0);
                    const avgValue = sum / readings.length;
                    this.sensorData[location.location_id] = {
                        value: avgValue,
                        count: readings.length,
                        timestamp: readings[0].timestamp,
                        name: location.name
                    };
                    locationsWithData++;
                }
            }

            console.log('📡 fetchSensorData complete — sensorData populated with', Object.keys(this.sensorData).length, 'locations');

            if (locationsWithData === 0) {
                // No data in selected time range — either notify user and reset colors
                // (when not silent) or quietly return false (when silent=true).
                const msg = `No data found for ${this.currentParameter} in the selected time interval (${this.timeInterval}).`;
                if (!silent) {
                    alert(`${msg} Please select a different time range.`);
                    console.error('❌ NO DATA FOUND in fetchSensorData - Resetting to default colors');
                    this.resetToDefaultColors();
                } else {
                    console.warn('❌ NO DATA FOUND in fetchSensorData (silent):', msg);
                }
                return false;
            }

            return true;
        } catch (err) {
            console.error('❌ fetchSensorData error:', err);
            return false;
        }
    }

    init() {
        console.log('🎨 Colorscale Manager initializing...');
        this.setupEventListeners();

        // Initialize sliders and gradient to match default pH values
        this.onParameterChange();

        // Ensure Auto-adjust is OFF by default on initial load
        this.autoScale = false;
        const autoScaleCheckbox = document.getElementById('autoScale');
        if (autoScaleCheckbox) autoScaleCheckbox.checked = false;

        // DON'T auto-load sensor data or apply colors
        // Only apply when user clicks "Apply Color Scale" button
        console.log('✅ Colorscale ready. Click "Apply Color Scale" to activate.');
    }

    // -----------------------
    // Color Theme / Colormap Support
    // -----------------------
    getSelectedColormapName() {
        const el = document.getElementById('colorTheme');
        return el ? el.value : 'custom';
    }

    // Return an RGB hex for a normalized position [0,1] for given colormap name
    colormapAt(name, t) {
        const clamp = (v) => Math.max(0, Math.min(1, v));

        const rgbToHex = (r, g, b) => {
            const toHex = (x) => {
                const v = Math.round(clamp(x) * 255);
                return (v < 16 ? '0' : '') + v.toString(16);
            };
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        };

        // Basic building blocks
        const hsv = (h, s, v) => {
            // h in [0,1]
            let r = 0, g = 0, b = 0;
            const i = Math.floor(h * 6);
            const f = h * 6 - i;
            const p = v * (1 - s);
            const q = v * (1 - f * s);
            const u = v * (1 - (1 - f) * s);
            switch (i % 6) {
                case 0: r = v; g = u; b = p; break;
                case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = u; break;
                case 3: r = p; g = q; b = v; break;
                case 4: r = u; g = p; b = v; break;
                case 5: r = v; g = p; b = q; break;
            }
            return [r, g, b];
        };

        // Common colormap implementations
        const maps = {
            hsv: (t) => {
                const [r,g,b] = hsv(1 - t, 1, 1);
                return rgbToHex(r,g,b);
            },
            hot: (t) => {
                const r = Math.min(1, 3 * t);
                const g = Math.min(1, Math.max(0, 3 * t - 1));
                const b = Math.min(1, Math.max(0, 3 * t - 2));
                return rgbToHex(r,g,b);
            },
            cool: (t) => rgbToHex(t, 1 - t, 1),
            jet: (t) => {
                const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 3)));
                const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 2)));
                const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 1)));
                return rgbToHex(r, g, b);
            },
            gray: (t) => rgbToHex(t, t, t),
            bone: (t) => {
                // light gray-blueish
                const r = 0.9 * t + 0.1;
                const g = 0.9 * t + 0.1;
                const b = 1.0 * t + 0.0;
                return rgbToHex(r, g, b);
            },
            copper: (t) => {
                const r = 1.0 * (0.7 * t + 0.3);
                const g = 0.78 * (0.5 * t + 0.2);
                const b = 0.5 * (0.2 * t + 0.1);
                return rgbToHex(r, g, b);
            },
            pink: (t) => rgbToHex(1.0, 0.75 * (1 - t) + 0.25 * t, 0.8 * (1 - t) + 0.2 * t),
            spring: (t) => rgbToHex(1.0, t, 1 - t),
            summer: (t) => rgbToHex(0.3 + 0.7 * t, 0.7 * t + 0.3, 0.4),
            autumn: (t) => rgbToHex(1.0, t, 0.0),
            winter: (t) => rgbToHex(0.0, t * 0.7 + 0.3, 1 - 0.5 * t),
            colorcube: (t) => {
                // simple discrete cube-like cycling
                const n = Math.floor(t * 27); // 3x3x3 cube
                const r = ((n % 3) / 2);
                const g = ((Math.floor(n / 3) % 3) / 2);
                const b = ((Math.floor(n / 9) % 3) / 2);
                return rgbToHex(r, g, b);
            }
        };

        const fn = maps[name];
        if (fn) return fn(t);
        // fallback: return null so caller may use parameter palette
        return null;
    }

    // Build an array of color stops (hex) from the selected colormap
    getColormapColors(count = 11) {
        const name = this.getSelectedColormapName();
        if (!name || name === 'custom') return null;
        const colors = [];
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const c = this.colormapAt(name, t) || '#cccccc';
            colors.push(c);
        }
        return colors;
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

        // Time interval selection
        const timeSelect = document.getElementById('colorTimeInterval');
        if (timeSelect) {
            timeSelect.addEventListener('change', (e) => {
                this.timeInterval = e.target.value;
                console.log(`⏰ Time interval changed to: ${this.timeInterval}`);
            });
        }

        // Color Theme selection
        const themeSelect = document.getElementById('colorTheme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                console.log('🎨 Color theme changed to:', e.target.value);
                this.updateColorGradient();
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
                    // If autoScale is enabled we want to fetch fresh data but KEEP the
                    // safe defaults (do not let data-driven min/max overwrite them).
                    if (this.autoScale) {
                        const ok = await this.fetchSensorData();
                        if (!ok) {
                            // no data - fetchSensorData already alerted and reset colors
                            return;
                        }
                        // Apply colors using the current min/max (safe defaults)
                        this.applyColorScale();
                    } else {
                        // Normal flow: load sensor data which may update ranges if enabled
                        await this.loadSensorData();
                    }
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
            autoScaleCheckbox.addEventListener('change', async (e) => {
                this.autoScale = e.target.checked;
                const scheme = this.colorSchemes[this.currentParameter] || {};
                const minSliderEl = document.getElementById('minSlider');
                const maxSliderEl = document.getElementById('maxSlider');

                if (this.autoScale) {
                    // When auto-adjust is enabled, use the parameter's SAFE default range
                    // (these are the values you requested) and update the UI immediately.
                    this.minValue = (scheme.safeMin !== undefined) ? scheme.safeMin : this.minValue;
                    this.maxValue = (scheme.safeMax !== undefined) ? scheme.safeMax : this.maxValue;

                    // Remove any saved override for this parameter so saved values
                    // don't replace the safe defaults while Auto-adjust is active.
                    try {
                        localStorage.removeItem(`colorscale:${this.currentParameter}`);
                        console.log('💾 Cleared saved colorscale for', this.currentParameter);
                    } catch (err) {
                        console.warn('Unable to clear saved colorscale for', this.currentParameter, err);
                    }

                    if (minSliderEl) minSliderEl.value = this.minValue;
                    if (maxSliderEl) maxSliderEl.value = this.maxValue;
                    const minValueDisplay = document.getElementById('minValueDisplay');
                    const maxValueDisplay = document.getElementById('maxValueDisplay');
                    if (minValueDisplay) minValueDisplay.textContent = this.minValue.toFixed(1);
                    if (maxValueDisplay) maxValueDisplay.textContent = this.maxValue.toFixed(1);

                    this.updateColorGradient();

                    // Fetch fresh sensor data silently (do NOT alert/reset here)
                    // — alerts should only appear when the user presses Apply.
                    await this.fetchSensorData(true);
                } else {
                    // When disabled, restore saved values if available (or keep current)
                    const saved = localStorage.getItem(`colorscale:${this.currentParameter}`);
                    if (saved) {
                        try {
                            const parsed = JSON.parse(saved);
                            if (parsed && typeof parsed.minValue === 'number' && typeof parsed.maxValue === 'number') {
                                this.minValue = parsed.minValue;
                                this.maxValue = parsed.maxValue;
                                this.updateColorGradient();
                                const minSliderEl = document.getElementById('minSlider');
                                const maxSliderEl = document.getElementById('maxSlider');
                                if (minSliderEl) minSliderEl.value = this.minValue;
                                if (maxSliderEl) maxSliderEl.value = this.maxValue;
                                const minValueDisplay = document.getElementById('minValueDisplay');
                                const maxValueDisplay = document.getElementById('maxValueDisplay');
                                if (minValueDisplay) minValueDisplay.textContent = this.minValue.toFixed(1);
                                if (maxValueDisplay) maxValueDisplay.textContent = this.maxValue.toFixed(1);
                            }
                        } catch (err) {
                            console.warn('Failed to parse saved colorscale settings', err);
                        }
                    }
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

        // Ensure auto-adjust is turned OFF when switching parameters
        this.autoScale = false;
        const autoScaleCheckbox = document.getElementById('autoScale');
        if (autoScaleCheckbox) autoScaleCheckbox.checked = false;

        // Update slider ranges
        const minSlider = document.getElementById('minSlider');
        const maxSlider = document.getElementById('maxSlider');

        if (minSlider && maxSlider) {
            minSlider.min = scheme.defaultMin;
            minSlider.max = scheme.defaultMax;
            maxSlider.min = scheme.defaultMin;
            maxSlider.max = scheme.defaultMax;

            // Restore saved values for this parameter if present
            const saved = localStorage.getItem(`colorscale:${this.currentParameter}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed.minValue === 'number' && typeof parsed.maxValue === 'number') {
                        this.minValue = parsed.minValue;
                        this.maxValue = parsed.maxValue;
                        if (minSlider) minSlider.value = this.minValue;
                        if (maxSlider) maxSlider.value = this.maxValue;
                        const minValEl = document.getElementById('minValueDisplay');
                        const maxValEl = document.getElementById('maxValueDisplay');
                        if (minValEl) minValEl.textContent = this.minValue.toFixed(1);
                        if (maxValEl) maxValEl.textContent = this.maxValue.toFixed(1);

                        // NOTE: do not auto-enable autoScale from saved settings — default should remain OFF
                    } else {
                        // fallback to scheme safe range
                        this.minValue = scheme.safeMin;
                        this.maxValue = scheme.safeMax;
                        minSlider.value = this.minValue;
                        maxSlider.value = this.maxValue;
                        document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                        document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
                    }
                } catch (err) {
                    console.warn('Failed to parse saved colorscale settings', err);
                    this.minValue = scheme.safeMin;
                    this.maxValue = scheme.safeMax;
                    minSlider.value = this.minValue;
                    maxSlider.value = this.maxValue;
                    document.getElementById('minValueDisplay').textContent = this.minValue.toFixed(1);
                    document.getElementById('maxValueDisplay').textContent = this.maxValue.toFixed(1);
                }
            } else {
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

        // The gradient bar represents the selected colormap or parameter palette
        // Prefer chosen colormap; fallback to parameter palette
        const cmap = this.getColormapColors(11);
        const colors = (cmap && cmap.length) ? cmap : ((scheme && scheme.colors && scheme.colors.length) ? scheme.colors : ['#22c55e', '#ef4444']);
        const gradientStops = [];
        for (let i = 0; i < colors.length; i++) {
            const pct = (i / (colors.length - 1)) * 100;
            gradientStops.push(`${colors[i]} ${pct.toFixed(1)}%`);
        }
        gradient.style.background = `linear-gradient(to right, ${gradientStops.join(', ')})`;

        // Update labels to show USER'S selected range (not parameter's full range)
        document.getElementById('paramMinLabel').textContent = this.minValue.toFixed(1);
        document.getElementById('paramMaxLabel').textContent = this.maxValue.toFixed(1);
    }

    async loadSensorData() {
        try {
            console.log('📡 Loading sensor data...');
            console.log('   Parameter:', this.currentParameter);
            console.log('   Time Interval:', this.timeInterval);

            // Calculate time threshold based on selected interval
            const now = new Date();
            const timeThresholds = {
                '1h': new Date(now - 1 * 60 * 60 * 1000),
                '6h': new Date(now - 6 * 60 * 60 * 1000),
                '24h': new Date(now - 24 * 60 * 60 * 1000),
                '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
                '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
                '3m': new Date(now - 90 * 24 * 60 * 60 * 1000),
                '6m': new Date(now - 180 * 24 * 60 * 60 * 1000),
                '1y': new Date(now - 365 * 24 * 60 * 60 * 1000)
            };
            const timeThreshold = timeThresholds[this.timeInterval];
            console.log('   Time threshold:', timeThreshold && timeThreshold.toISOString ? timeThreshold.toISOString() : timeThreshold);

            // Try to fetch from Supabase first, otherwise fallback to local data
            let supabaseClient = (window.getSupabaseClient && window.getSupabaseClient()) || null;
            console.log('🔍 Supabase client check (from window.getSupabaseClient):', supabaseClient ? 'AVAILABLE ✅' : 'NULL ❌');
            
            // If no client from data.js, create our own directly
            if (!supabaseClient && window.ENV_CONFIG) {
                console.log('🔧 Creating Supabase client directly from ENV_CONFIG...');
                try {
                    supabaseClient = window.supabase.createClient(
                        window.ENV_CONFIG.SUPABASE_URL,
                        window.ENV_CONFIG.SUPABASE_ANON_KEY
                    );
                    console.log('✅ Supabase client created successfully');
                } catch (err) {
                    console.error('❌ Failed to create Supabase client:', err);
                }
            }

            let locations = [];
            let allReadings = [];

            if (supabaseClient) {
                try {
                    console.log('✅ Supabase client available - fetching readings');
                    console.log('   Query: sensor_id ILIKE %_' + this.currentParameter);
                    
                    // FIRST: Try WITHOUT time filter to see if data exists at all
                    console.log('🧪 TEST QUERY 1: Fetching ALL data (no time filter)...');
                    const { data: testData, error: testError } = await supabaseClient
                        .from('sensor_readings')
                        .select('sensor_id, value, timestamp')
                        .ilike('sensor_id', `%_${this.currentParameter}`)
                        .order('timestamp', { ascending: false })
                        .limit(10);
                    
                    console.log('   Test query result:', testError ? 'ERROR' : 'SUCCESS');
                    console.log('   Test error:', testError);
                    console.log('   Test data count:', testData?.length);
                    if (testData && testData.length > 0) {
                        console.log('   Sample test data:', testData.slice(0, 2));
                    }
                    
                    // SECOND: Try WITH time filter
                    console.log('🧪 TEST QUERY 2: Fetching with time filter >= ' + timeThreshold.toISOString());
                    const { data: readingsData, error: readError } = await supabaseClient
                        .from('sensor_readings')
                        .select('sensor_id, value, timestamp')
                        .ilike('sensor_id', `%_${this.currentParameter}`)
                        .gte('timestamp', timeThreshold.toISOString())
                        .order('timestamp', { ascending: false });

                    console.log('   Filtered query result:', readError ? 'ERROR' : 'SUCCESS');
                    console.log('   Filtered error:', readError);
                    console.log('   Filtered data count:', readingsData?.length);
                    if (readingsData && readingsData.length > 0) {
                        console.log('   Sample filtered data:', readingsData.slice(0, 2));
                    }

                    if (readError) {
                        console.error('❌ Query error:', readError);
                        throw readError;
                    }

                    // If time-filtered query is empty but test query has data, use all data
                    if ((!readingsData || readingsData.length === 0) && testData && testData.length > 0) {
                        console.warn('⚠️ Time filter returned 0 results but data exists! Using all data instead.');
                        allReadings = testData;
                    } else {
                        allReadings = readingsData || [];
                    }
                    
                    console.log(`✅ Using ${allReadings.length} readings for ${this.currentParameter}`);
                    
                    // Extract unique locations from sensor_id
                    const locationIds = new Set();
                    allReadings.forEach(r => {
                        const locId = r.sensor_id.split('_')[0];
                        locationIds.add(locId);
                    });
                    
                    locations = Array.from(locationIds).map(id => ({
                        location_id: id,
                        name: id.charAt(0).toUpperCase() + id.slice(1)
                    }));
                    
                    console.log(`✅ Found ${locations.length} locations from data:`, locations.map(l => l.name));
                } catch (err) {
                    console.error('❌ Supabase fetch failed:', err);
                    console.error('   Error details:', JSON.stringify(err));
                    locations = [];
                    allReadings = [];
                }
            } else {
                console.error('❌ No Supabase client available!');
            }

            // Local fallback: use window.sensorData.locations if Supabase not available
            if ((!locations || locations.length === 0) && window.sensorData && window.sensorData.locations) {
                locations = window.sensorData.locations.map(loc => ({ location_id: loc.id, name: loc.name }));
                console.log('ℹ️ Using local locations for colorscale:', locations.map(l => l.name));
            }

            if ((!allReadings || allReadings.length === 0) && window.allReadings) {
                // Use ALL readings for current parameter (ignore time filter for fallback)
                allReadings = window.allReadings.filter(r => {
                    return r.sensor_id.endsWith(`_${this.currentParameter}`);
                });
                console.log('ℹ️ Using local readings fallback (ALL TIME), count:', allReadings.length);
                if (allReadings.length > 0) {
                    console.log('   Sample:', allReadings[0]);
                }
            }

            // If we have local readings but the current `locations` list appears to
            // contain device names (e.g. SALEM_ESP32_001) which won't match the
            // reading `sensor_id` prefixes (e.g. yercaud_ph), prefer deriving
            // locations from the readings themselves so color mapping aligns.
            if (allReadings && allReadings.length > 0) {
                const firstPrefix = (allReadings[0].sensor_id || '').split('_')[0];
                const hasMatchingLocation = locations && locations.some(l => l.location_id === firstPrefix);
                if (!hasMatchingLocation) {
                    const locSet = new Set();
                    allReadings.forEach(r => {
                        const p = (r.sensor_id || '').split('_')[0];
                        if (p) locSet.add(p);
                    });
                    locations = Array.from(locSet).map(id => ({
                        location_id: id,
                        name: id.charAt(0).toUpperCase() + id.slice(1)
                    }));
                    console.log('ℹ️ Derived locations from local readings:', locations.map(l => l.location_id));
                }
            }

            console.log(`📊 Total readings to process: ${allReadings.length}`);

            // Group by sensor_id and calculate AVERAGE for each location
            this.sensorData = {};
            const sensorReadings = {};

            // Group readings by sensor
            for (const reading of allReadings) {
                if (!sensorReadings[reading.sensor_id]) {
                    sensorReadings[reading.sensor_id] = [];
                }
                sensorReadings[reading.sensor_id].push(reading);
            }

            let locationsWithData = 0;
            let locationsWithoutData = 0;

            // Calculate average for each location
            for (const location of locations) {
                const sensorId = `${location.location_id}_${this.currentParameter}`;
                const readings = sensorReadings[sensorId];

                if (readings && readings.length > 0) {
                    // Calculate AVERAGE value
                    const sum = readings.reduce((acc, r) => acc + parseFloat(r.value), 0);
                    const avgValue = sum / readings.length;

                    this.sensorData[location.location_id] = {
                        value: avgValue,
                        count: readings.length,
                        timestamp: readings[0].timestamp,
                        name: location.name
                    };
                    console.log(`   ✅ ${location.name}: avg=${avgValue.toFixed(2)} (${readings.length} readings)`);
                    locationsWithData++;
                } else {
                    console.warn(`   ⚠️ No data found for ${location.name} in ${this.timeInterval}`);
                    locationsWithoutData++;
                }
            }

            console.log(`📊 Sensor data loaded: ${locationsWithData} with data, ${locationsWithoutData} without data`);

            // Show alert if no data found and reset to default colors
            if (locationsWithData === 0) {
                alert(`No data found for ${this.currentParameter} in the selected time interval (${this.timeInterval}). Please select a different time range.`);
                console.error('❌ NO DATA FOUND - Resetting to default colors');
                this.resetToDefaultColors();
                return;
            }

            // Auto-adjust handling:
            // If autoScale is enabled we intentionally use the parameter's safe default range
            // (set by the checkbox handler) and DO NOT override those values with data-driven
            // min/max. If autoScale is OFF, we use the user's slider values.
            if (this.autoScale) {
                console.log('🔄 Auto-adjust is enabled — using safe default range for', this.currentParameter, ':', this.minValue, '-', this.maxValue);
                // Do NOT call updateRangeFromData() here so the safe defaults remain in effect.
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

        // Update UI everywhere the min/max appear
        const minSliderEl = document.getElementById('minSlider');
        const maxSliderEl = document.getElementById('maxSlider');
        if (minSliderEl) minSliderEl.value = this.minValue;
        if (maxSliderEl) maxSliderEl.value = this.maxValue;

        const minValueDisplay = document.getElementById('minValueDisplay');
        const maxValueDisplay = document.getElementById('maxValueDisplay');
        if (minValueDisplay) minValueDisplay.textContent = this.minValue.toFixed(1);
        if (maxValueDisplay) maxValueDisplay.textContent = this.maxValue.toFixed(1);

        const minLabel = document.getElementById('minLabel');
        const maxLabel = document.getElementById('maxLabel');
        if (minLabel) minLabel.textContent = this.minValue.toFixed(1);
        if (maxLabel) maxLabel.textContent = this.maxValue.toFixed(1);

        // Also update the gradient end labels shown above the bar
        const paramMinLabel = document.getElementById('paramMinLabel');
        const paramMaxLabel = document.getElementById('paramMaxLabel');
        if (paramMinLabel) paramMinLabel.textContent = this.minValue.toFixed(1);
        if (paramMaxLabel) paramMaxLabel.textContent = this.maxValue.toFixed(1);

        // Refresh the gradient display to reflect the new min/max
        this.updateColorGradient();
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

        // Persist the applied range and autoScale setting for this parameter so it survives refresh
        try {
            const payload = {
                minValue: this.minValue,
                maxValue: this.maxValue,
                autoScale: this.autoScale
            };
            localStorage.setItem(`colorscale:${this.currentParameter}`, JSON.stringify(payload));
            console.log('💾 Saved colorscale settings to localStorage for', this.currentParameter);
        } catch (err) {
            console.warn('Unable to save colorscale settings to localStorage', err);
        }
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
                    // Mark feature as no-data: set fill to white and clear sensorValue
                    feature.properties.fillColor = '#ffffff';
                    feature.properties.sensorValue = null;
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
                    // No-data: set marker color to white and clear sensorValue
                    feature.properties.markerColor = '#ffffff';
                    feature.properties.sensorValue = null;
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
                // Render marker as white to indicate N/A
                const markerEl = marker._element.querySelector('.marker');
                if (markerEl) {
                    markerEl.style.backgroundColor = '#ffffff';
                    markerEl.style.borderColor = '#bdbdbd';
                } else {
                    marker._element.style.backgroundColor = '#ffffff';
                }
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
        const range = this.maxValue - this.minValue || 1;
        const normalizedPosition = (value - this.minValue) / range;

        // If a standard color theme is selected, use that colormap for mapping
        const cmapName = this.getSelectedColormapName();
        if (cmapName && cmapName !== 'custom') {
            const color = this.colormapAt(cmapName, Math.max(0, Math.min(1, normalizedPosition)));
            if (color) return color;
        }

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

        // Map value linearly across the fixed color array (even distribution)
        const colors = (scheme && scheme.colors && scheme.colors.length) ? scheme.colors : ['#22c55e', '#ef4444'];
        if (colors.length === 1) return colors[0];

        // normalizedPosition is in [0,1], clamp
        const pos = Math.max(0, Math.min(1, normalizedPosition));
        const totalSegments = colors.length - 1;
        const segmentLength = 1 / totalSegments;
        const segmentIndex = Math.min(totalSegments - 1, Math.floor(pos / segmentLength));
        const segmentStart = segmentIndex * segmentLength;
        const localFactor = (pos - segmentStart) / (segmentLength || 1);
        return this.interpolateColor(colors[segmentIndex], colors[segmentIndex + 1], localFactor);
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

    resetToDefaultColors() {
        console.log('🔄 Resetting all colors to original colorful defaults...');

        // Original colorful palette from map.js
        const villageColors = [
            '#22c55e', '#f97316', '#3b82f6', '#a855f7', '#eab308',
            '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f59e0b'
        ];

        const map = this.mapManager.map;

        // Reset polygon colors to original colorful scheme
        const layers = map.getStyle().layers;
        const polygonLayers = layers.filter(layer =>
            layer.type === 'fill' &&
            (layer.id.includes('kml') || layer.id.includes('polygon') || layer.id.includes('nallampatti'))
        );

        polygonLayers.forEach(layer => {
            const source = map.getSource(layer.source);
            if (source && source._data) {
                const features = source._data.features || [];
                features.forEach((feature, index) => {
                    feature.properties.fillColor = villageColors[index % villageColors.length];
                    delete feature.properties.sensorValue;
                });
                map.getSource(layer.source).setData(source._data);
            }
        });

        // Reset circle marker colors to original colorful scheme
        const circleLayers = layers.filter(layer =>
            layer.type === 'circle' &&
            (layer.id.includes('kml') || layer.id.includes('point') || layer.id.includes('nallampatti'))
        );

        circleLayers.forEach(layer => {
            const source = map.getSource(layer.source);
            if (source && source._data) {
                const features = source._data.features || [];
                features.forEach((feature, index) => {
                    feature.properties.markerColor = villageColors[index % villageColors.length];
                    delete feature.properties.sensorValue;
                });
                map.getSource(layer.source).setData(source._data);
            }
        });

        // Reset HTML marker colors to original colorful scheme
        if (this.mapManager.markers) {
            this.mapManager.markers.forEach((marker, index) => {
                const color = villageColors[index % villageColors.length];
                const markerEl = marker._element.querySelector('.marker');
                if (markerEl) {
                    markerEl.style.backgroundColor = color;
                    markerEl.style.borderColor = this.darkenColor(color);
                } else {
                    marker._element.style.backgroundColor = color;
                }
            });
        }

        console.log('✅ All colors reset to original colorful palette');
    }
}

// Export for use in main application
window.ColorscaleManager = ColorscaleManager;
