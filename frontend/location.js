// Location Dashboard - Full sensor details for a specific location
class LocationDashboard {
    constructor() {
        this.supabase = null;
        this.locationId = null;
        this.sensorData = [];
        this.allDataChart = null;
        this.historicalChart = null;
        this.singleSensorChart = null;
        this.currentTimeRange = '24h';
        
        console.log('🎯 LocationDashboard initializing...');
        this.init();
    }

    async init() {
        // Get location ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.locationId = urlParams.get('location');
        
        if (!this.locationId) {
            console.error('❌ No location specified');
            alert('No location specified. Returning to map.');
            window.location.href = 'index.html';
            return;
        }

        console.log('📍 Location ID:', this.locationId);
        
        // Wait for auth to be ready
        await this.waitForAuth();
        
        // Initialize Supabase
        await this.initializeSupabase();
        
        // Set up UI
        this.setupUI();
        
        // Load sensor data
        await this.loadSensorData();
        
        // Set up time range selector
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.currentTimeRange = e.target.value;
                this.updateHistoricalChart();
            });
        }
        
        // Set up auto-refresh
        setInterval(() => this.loadSensorData(), 30000);
    }

    async waitForAuth() {
        console.log('⏳ Waiting for authentication...');
        
        // Wait up to 10 seconds for authManager and Supabase client
        for (let i = 0; i < 100; i++) {
            if (window.authManager && window.authManager.getSupabaseClient) {
                const client = window.authManager.getSupabaseClient();
                if (client) {
                    console.log('✅ Auth ready - Supabase client available');
                    return;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('⚠️ Auth timeout - proceeding anyway');
    }

    async initializeSupabase() {
        if (window.authManager && window.authManager.getSupabaseClient) {
            this.supabase = window.authManager.getSupabaseClient();
            console.log('✅ Using authManager Supabase client');
        } else if (window.supabaseClient) {
            this.supabase = window.supabaseClient;
            console.log('✅ Using global Supabase client');
        } else {
            console.error('❌ No Supabase client available');
        }
    }

    setupUI() {
        // Update page title
        const locationNames = {
            'salemsouth': 'Salem South',
            'yercaud': 'Yercaud',
            'sankari': 'Sankari',
            'edappadi': 'Edappadi',
            'omalur': 'Omalur',
            'mettur': 'Mettur'
        };
        
        const locationName = locationNames[this.locationId] || this.locationId;
        const titleEl = document.getElementById('locationTitle');
        if (titleEl) {
            titleEl.textContent = locationName;
        }
        
        // Back button
        const backBtn = document.getElementById('backToMapBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        // Create sensor tabs
        this.createSensorTabs();
        
        // Create sensor cards in the grid
        this.createSensorCards();
    }

    createSensorTabs() {
        const tabsContainer = document.getElementById('sensorTabs');
        if (!tabsContainer) return;

        const tabs = [
            { id: 'all', name: 'All Sensors', icon: 'fa-th-large' },
            { id: 'ph', name: 'pH Level', icon: 'fa-flask' },
            { id: 'turbidity', name: 'Turbidity', icon: 'fa-eye-dropper' },
            { id: 'temperature', name: 'Temperature', icon: 'fa-thermometer-half' },
            { id: 'tds', name: 'TDS', icon: 'fa-tint' }
        ];

        tabsContainer.innerHTML = tabs.map(tab => `
            <button 
                class="sensor-tab px-4 py-2 rounded-lg border transition-all ${tab.id === 'all' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'}"
                data-sensor="${tab.id}"
                onclick="window.locationDashboard.showSensor('${tab.id}')">
                <i class="fas ${tab.icon} mr-2"></i>
                ${tab.name}
            </button>
        `).join('');
    }

    updateActiveTab(sensorType) {
        // Update tab button styles to reflect active sensor
        try {
            document.querySelectorAll('.sensor-tab').forEach(tab => {
                const isActive = tab.dataset.sensor === sensorType;
                if (isActive) {
                    tab.className = 'sensor-tab px-4 py-2 rounded-lg border transition-all bg-blue-500 text-white border-blue-500';
                } else {
                    tab.className = 'sensor-tab px-4 py-2 rounded-lg border transition-all bg-white text-gray-700 border-gray-300 hover:border-blue-500';
                }
            });
        } catch (e) {
            // Fail silently if DOM not ready
            console.warn('updateActiveTab error:', e);
        }
    }

    showSensor(sensorType) {
        console.log('🔄 Switching to sensor:', sensorType);
        
        // Update active tab
        document.querySelectorAll('.sensor-tab').forEach(tab => {
            const isActive = tab.dataset.sensor === sensorType;
            if (isActive) {
                tab.className = 'sensor-tab px-4 py-2 rounded-lg border transition-all bg-blue-500 text-white border-blue-500';
            } else {
                tab.className = 'sensor-tab px-4 py-2 rounded-lg border transition-all bg-white text-gray-700 border-gray-300 hover:border-blue-500';
            }
        });

        if (sensorType === 'all') {
            this.showAllSensors();
        } else {
            this.showSingleSensor(sensorType);
        }
    }

    showAllSensors() {
        console.log('📊 Showing all sensors view');
        
        // Hide loading state
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.classList.add('hidden');
        
        const grid = document.getElementById('allSensorsGrid');
        const allChartsSection = document.getElementById('allSensorsChartsSection');
        const singleChartsSection = document.getElementById('singleSensorChartsSection');
        
        if (!grid) return;

        // Restore grid layout and clear any single sensor content
        grid.style.display = 'grid';
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
        
        // Clear any single-sensor state and re-render all sensor cards
        this.currentSensorType = null;
        this.renderAllSensorCards();
        
        // Show charts for all sensors
        if (allChartsSection) {
            allChartsSection.style.display = 'grid';
        }
        
        // Hide single sensor charts
        if (singleChartsSection) {
            singleChartsSection.style.display = 'none';
        }

        // Update active tab
        this.updateActiveTab('all');

        // Update charts and table (show all sensors)
        this.updateHistoricalChart();
        this.createRecentReadingsTable();
    }

    renderAllSensorCards() {
        const grid = document.getElementById('allSensorsGrid');
        if (!grid || !this.sensorData || this.sensorData.length === 0) return;

        const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
        let cardsHTML = '';

        sensorTypes.forEach(type => {
            const readings = this.sensorData.filter(r => 
                r.sensor_id && r.sensor_id.endsWith(`_${type}`)
            );

            if (readings.length > 0) {
                const latest = readings[0];
                const value = latest[type] || latest.value || 0;
                const unit = this.getUnit(type);
                const status = this.getStatus(type, value);
                const sensorName = this.getSensorName(type);
                const icon = this.getSensorIcon(type);

                cardsHTML += `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                         onclick="window.locationDashboard.showSingleSensor('${type}')">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-medium text-gray-600">${sensorName}</h3>
                            <i class="fas ${icon} text-blue-500 text-xl"></i>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-gray-900">${value.toFixed(2)}</p>
                            <p class="text-sm text-gray-500">${unit}</p>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="px-2 py-1 rounded text-xs font-medium ${status.class}">
                                ${status.label}
                            </span>
                            <span class="text-xs text-gray-500">
                                ${this.getTimeAgo(new Date(latest.timestamp))}
                            </span>
                        </div>
                    </div>
                `;
            }
        });

        grid.innerHTML = cardsHTML;
    }

    showSingleSensor(sensorType) {
        console.log(`📊 Showing single sensor view: ${sensorType}`);
        
        // Hide loading state
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.classList.add('hidden');
        
        const grid = document.getElementById('allSensorsGrid');
        const allChartsSection = document.getElementById('allSensorsChartsSection');
        const singleChartsSection = document.getElementById('singleSensorChartsSection');
        
        if (!grid) return;

        // Filter and sort data for this sensor (newest first)
        const sensorReadings = (this.sensorData || [])
            .filter(r => r.sensor_id && r.sensor_id.endsWith(`_${sensorType}`))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sensorReadings.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <i class="fas fa-info-circle text-yellow-500 text-3xl mb-2"></i>
                    <p class="text-yellow-800 font-medium">No ${sensorType} data available</p>
                </div>
            `;
            if (allChartsSection) allChartsSection.style.display = 'none';
            if (singleChartsSection) singleChartsSection.style.display = 'none';
            return;
        }

        const latest = sensorReadings[0];
        const value = latest ? (latest[sensorType] || latest.value || 0) : 0;
        // Compute average over recent readings (up to 50)
        const recentForAvg = sensorReadings.slice(0, 50);
        const avg = recentForAvg.length > 0 ? (recentForAvg.reduce((s, r) => {
            const v = (r[sensorType] !== undefined) ? r[sensorType] : (r.value || 0);
            return s + Number(v);
        }, 0) / recentForAvg.length) : null;
        const decimals = sensorType === 'tds' ? 0 : 2;
        const unit = this.getUnit(sensorType);
        const status = this.getStatus(sensorType, value);
        const sensorName = this.getSensorName(sensorType);

        // Show single sensor card
        grid.style.display = 'block';
        grid.className = '';
        grid.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-2xl mx-auto">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">${sensorName}</h2>
                    <i class="fas ${this.getSensorIcon(sensorType)} text-4xl text-blue-500"></i>
                </div>
                <div class="text-center mb-6">
                    <p class="text-6xl font-bold text-gray-900 mb-2">${sensorType === 'tds' ? value.toFixed(0) : value.toFixed(2)}</p>
                    <p class="text-xl text-gray-600">${unit}</p>
                    ${avg !== null ? `<p class="text-sm text-gray-500 mt-2">Average (recent ${recentForAvg.length}): <strong>${(sensorType === 'tds' ? avg.toFixed(0) : avg.toFixed(2))} ${unit}</strong></p>` : ''}
                </div>
                <div class="flex justify-center mb-4">
                    <span class="px-4 py-2 rounded-lg text-sm font-medium ${status.class}">
                        ${status.label}
                    </span>
                </div>
                <p class="text-center text-gray-500 text-sm">Updated ${this.getTimeAgo(new Date(latest.timestamp))}</p>
            </div>
        `;

        // Update active tab
        this.updateActiveTab(sensorType);
        
        // Store current sensor type
        this.currentSensorType = sensorType;
        
        // Show single sensor chart, hide all sensors charts
        if (allChartsSection) allChartsSection.style.display = 'none';
        if (singleChartsSection) {
            singleChartsSection.style.display = 'grid';
            
            // Setup time range selector
            this.setupSingleSensorTimeRangeSelector();
            
            // Update chart and table
            this.updateSingleSensorChart(sensorType);
            this.createRecentReadingsTable(sensorType);
        }
    }

    setupSingleSensorTimeRangeSelector() {
        const selector = document.getElementById('singleSensorTimeRange');
        if (!selector) return;
        
        // Remove existing listener by cloning
        const newSelector = selector.cloneNode(true);
        selector.parentNode.replaceChild(newSelector, selector);
        
        // Set current value
        newSelector.value = this.currentTimeRange;
        
        // Add new listener
        newSelector.addEventListener('change', (e) => {
            this.currentTimeRange = e.target.value;
            console.log(`⏱️ Single sensor time range changed to: ${this.currentTimeRange}`);
            if (this.currentSensorType) {
                this.updateSingleSensorChart(this.currentSensorType);
            }
        });
    }

    async updateSingleSensorChart(sensorType) {
        const canvas = document.getElementById('singleSensorChart');
        if (!canvas) {
            console.error('❌ Single sensor chart canvas not found');
            return;
        }

        // Destroy existing chart
        if (this.singleSensorChart) {
            this.singleSensorChart.destroy();
            this.singleSensorChart = null;
        }

        // Calculate time range
        const rangeMs = this.getTimeRangeInMs(this.currentTimeRange);
        
        // Build query
        let query = this.supabase
            .from('sensor_readings')
            .select('*')
            .eq('sensor_id', `${this.locationId}_${sensorType}`)
            .order('timestamp', { ascending: true });
        
        // Add time filter if not 'all'
        if (rangeMs !== null) {
            const startTime = new Date(Date.now() - rangeMs).toISOString();
            query = query.gte('timestamp', startTime);
        }

        const { data: readings, error } = await query;

        if (error) {
            console.error('❌ Error loading sensor data:', error);
            return;
        }

        console.log(`✅ Loaded ${readings.length} ${sensorType} readings for ${this.currentTimeRange}`);

        const ctx = canvas.getContext('2d');
        const color = this.getChartColor(sensorType);

        this.singleSensorChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: readings.map(r => new Date(r.timestamp)),
                datasets: [{
                    label: this.getSensorLabel(sensorType),
                    data: readings.map(r => r[sensorType] || r.value || 0),
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: readings.length > 100 ? 0 : 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.getTimeUnit(this.currentTimeRange),
                            displayFormats: {
                                hour: 'MMM d, HH:mm',
                                day: 'MMM d',
                                week: 'MMM d',
                                month: 'MMM yyyy'
                            }
                        },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: '#f3f4f6' },
                        ticks: {
                            callback: (value) => value.toFixed(2) + ' ' + this.getUnit(sensorType)
                        }
                    }
                },
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return context.dataset.label + ': ' + 
                                       context.parsed.y.toFixed(2) + ' ' + 
                                       this.getUnit(sensorType);
                            }
                        }
                    }
                }
            }
        });
    }

    getSensorIcon(type) {
        const icons = {
            ph: 'fa-flask',
            turbidity: 'fa-eye-dropper',
            temperature: 'fa-thermometer-half',
            tds: 'fa-tint'
        };
        return icons[type] || 'fa-chart-line';
    }

    getSensorName(type) {
        const names = {
            ph: 'pH Level',
            turbidity: 'Turbidity',
            temperature: 'Temperature',
            tds: 'TDS (Total Dissolved Solids)'
        };
        return names[type] || type;
    }

    getSensorLabel(type) {
        // Return a concise label for charts and legends
        const name = this.getSensorName(type);
        const unit = this.getUnit(type);
        return unit ? `${name} (${unit})` : name;
    }

    setupSingleSensorTimeRangeSelector() {
        const selector = document.getElementById('singleSensorTimeRange');
        if (!selector) return;
        
        // Remove existing listener
        const newSelector = selector.cloneNode(true);
        selector.parentNode.replaceChild(newSelector, selector);
        
        // Add new listener
        newSelector.addEventListener('change', (e) => {
            this.currentTimeRange = e.target.value;
            console.log(`⏱️ Single sensor time range changed to: ${this.currentTimeRange}`);
            if (this.currentSensorType) {
                this.updateSingleSensorChart(this.currentSensorType);
            }
        });
    }

    async updateSingleSensorChart(type) {
        const canvas = document.getElementById('singleSensorChart');
        if (!canvas) {
            console.error('❌ Single sensor chart canvas not found');
            return;
        }

        // Destroy existing chart
        if (this.singleSensorChart) {
            this.singleSensorChart.destroy();
            this.singleSensorChart = null;
        }

        // Calculate time range
        const rangeMs = this.getTimeRangeInMs(this.currentTimeRange);
        
        // Build query
        let query = this.supabase
            .from('sensor_readings')
            .select('*')
            .eq('sensor_id', `${this.locationId}_${type}`)
            .order('timestamp', { ascending: true });
        
        // Add time filter if not 'all'
        if (rangeMs !== null) {
            const startTime = new Date(Date.now() - rangeMs).toISOString();
            query = query.gte('timestamp', startTime);
        }

        const { data: readings, error } = await query;

        if (error) {
            console.error('❌ Error loading sensor data:', error);
            return;
        }

        console.log(`✅ Loaded ${readings.length} ${type} readings for ${this.currentTimeRange}`);

        const ctx = canvas.getContext('2d');
        const color = this.getChartColor(type);

        this.singleSensorChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: readings.map(r => new Date(r.timestamp)),
                datasets: [{
                    label: this.getSensorLabel(type),
                    data: readings.map(r => r[type] || r.value || 0),
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: readings.length > 100 ? 0 : 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: this.getTimeUnit(this.currentTimeRange),
                            displayFormats: {
                                hour: 'MMM d, HH:mm',
                                day: 'MMM d',
                                week: 'MMM d',
                                month: 'MMM yyyy'
                            }
                        },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: '#f3f4f6' },
                        ticks: {
                            callback: (value) => value.toFixed(2) + ' ' + this.getUnit(type)
                        }
                    }
                },
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return context.dataset.label + ': ' + 
                                       context.parsed.y.toFixed(2) + ' ' + 
                                       this.getUnit(type);
                            }
                        }
                    }
                }
            }
        });
    }

    async updateHistoricalChart() {
        const canvas = document.getElementById('historicalChart');
        if (!canvas) return;

        console.log('📊 Updating historical chart for:', this.currentTimeRange);

        // Destroy existing chart first
        if (this.historicalChart) {
            this.historicalChart.destroy();
            this.historicalChart = null;
        }

        // Calculate time range
        const now = new Date();
        const rangeMs = this.getTimeRangeInMs(this.currentTimeRange);
        
        // Build query
        let query = this.supabase
            .from('sensor_readings')
            .select('*')
            .ilike('sensor_id', `${this.locationId}_%`)
            .order('timestamp', { ascending: true });
        
        // Only add time filter if not 'all' time range
        if (rangeMs !== null) {
            const startTime = new Date(now.getTime() - rangeMs);
            query = query.gte('timestamp', startTime.toISOString());
            console.log(`📊 Fetching data for ${this.currentTimeRange} (since ${startTime.toISOString()})`);
        } else {
            console.log(`📊 Fetching all time data`);
        }

        // Fetch data for the time range
        const { data, error } = await query;

        if (error) {
            console.error('❌ Error loading historical data:', error);
            return;
        }

        console.log(`✅ Loaded ${data.length} historical readings for ${this.currentTimeRange}`);

        const ctx = canvas.getContext('2d');
        
        // Group data by sensor type
        const datasets = [];
        const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
        
        sensorTypes.forEach(type => {
            const typeData = data.filter(r => r.sensor_id && r.sensor_id.endsWith(`_${type}`));
            
            if (typeData.length > 0) {
                datasets.push({
                    label: this.getSensorName(type),
                    data: typeData.map(r => ({
                        x: new Date(r.timestamp),
                        y: r[type] || r.value || 0
                    })),
                    borderColor: this.getChartColor(type),
                    backgroundColor: this.getChartColor(type) + '20',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 1,
                    pointHoverRadius: 3
                });
            }
        });

        const timeUnit = this.getTimeUnit(this.currentTimeRange);

        this.historicalChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeUnit,
                            displayFormats: {
                                hour: 'MMM d, HH:mm',
                                day: 'MMM d',
                                week: 'MMM d',
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });
    }

    getTimeRangeInMs(range) {
        const ranges = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
            '180d': 180 * 24 * 60 * 60 * 1000,
            '365d': 365 * 24 * 60 * 60 * 1000,
            'all': null // null means all time data
        };
        return ranges[range] !== undefined ? ranges[range] : ranges['24h'];
    }

    getTimeUnit(range) {
        const units = {
            '24h': 'hour',
            '7d': 'day',
            '30d': 'day',
            '90d': 'week',
            '180d': 'week',
            '365d': 'month',
            'all': 'month'
        };
        return units[range] || 'hour';
    }

    getChartColor(type) {
        const colors = {
            ph: '#3b82f6',
            turbidity: '#8b5cf6',
            temperature: '#f59e0b',
            tds: '#10b981'
        };
        return colors[type] || '#6b7280';
    }

    createSensorCards() {
        const grid = document.getElementById('allSensorsGrid');
        if (!grid) return;

        const sensorTypes = [
            { type: 'ph', name: 'pH Level', icon: 'fa-flask', color: 'blue' },
            { type: 'turbidity', name: 'Turbidity', icon: 'fa-eye-dropper', color: 'purple' },
            { type: 'temperature', name: 'Temperature', icon: 'fa-thermometer-half', color: 'orange' },
            { type: 'tds', name: 'TDS', icon: 'fa-tint', color: 'green' }
        ];

        grid.innerHTML = sensorTypes.map(sensor => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-medium text-gray-600">${sensor.name}</h3>
                    <i class="fas ${sensor.icon} text-${sensor.color}-500"></i>
                </div>
                <p id="${sensor.type}Value" class="text-3xl font-bold text-gray-900">--</p>
                <p id="${sensor.type}Unit" class="text-sm text-gray-500 mt-1">Loading...</p>
                <div class="mt-4">
                    <span id="${sensor.type}Status" class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Waiting for data
                    </span>
                </div>
                <p id="${sensor.type}Time" class="text-xs text-gray-400 mt-2">--</p>
            </div>
        `).join('');
    }

    async loadSensorData() {
        if (!this.supabase) {
            console.error('❌ Cannot load data - no Supabase client');
            this.showError('Supabase not initialized');
            return;
        }

        try {
            console.log('🔄 Loading sensor data for', this.locationId);
            console.log('🔍 Query pattern:', `${this.locationId}_%`);
            
            // Query sensor_readings for this location
            const { data, error } = await this.supabase
                .from('sensor_readings')
                .select('*')
                .ilike('sensor_id', `${this.locationId}_%`)
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error) {
                console.error('❌ Supabase error:', error);
                this.showError(`Database error: ${error.message}`);
                return;
            }

            console.log(`✅ Loaded ${data ? data.length : 0} readings`);
            
            if (!data || data.length === 0) {
                console.warn('⚠️ No readings found for location:', this.locationId);
                this.showNoData();
                return;
            }
            
            console.log('📊 Sample reading:', data[0]);
            this.sensorData = data;
            
            // Hide loading, show dashboard
            this.hideLoading();
            
            // Render all sensor cards only if not viewing a single sensor
            if (!this.currentSensorType) {
                this.renderAllSensorCards();
            }
            
            // Update charts and table based on current view
            this.updateHistoricalChart();
            
            // If in single sensor view, maintain that filter; otherwise show all
            if (this.currentSensorType) {
                await this.createRecentReadingsTable(this.currentSensorType);
                this.updateSingleSensorChart(this.currentSensorType);
            } else {
                await this.createRecentReadingsTable();
            }
            
        } catch (err) {
            console.error('❌ Exception loading data:', err);
            this.showError(`Error: ${err.message}`);
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        const mainDashboard = document.getElementById('mainDashboard');
        
        if (loadingState) {
            loadingState.classList.add('hidden');
            console.log('✅ Loading spinner hidden');
        }
        
        if (mainDashboard) {
            mainDashboard.classList.remove('hidden');
            console.log('✅ Dashboard shown');
        }
    }

    getUnit(type) {
        const units = {
            ph: 'pH',
            turbidity: 'NTU',
            temperature: '°C',
            tds: 'ppm'
        };
        return units[type] || '';
    }

    getStatus(type, value) {
        if (type === 'ph') {
            if (value >= 6.5 && value <= 8.5) return { label: 'Good', class: 'bg-green-100 text-green-800' };
            if (value >= 6.0 && value <= 9.0) return { label: 'Fair', class: 'bg-yellow-100 text-yellow-800' };
            return { label: 'Poor', class: 'bg-red-100 text-red-800' };
        }
        if (type === 'turbidity') {
            if (value < 1) return { label: 'Excellent', class: 'bg-green-100 text-green-800' };
            if (value < 5) return { label: 'Good', class: 'bg-yellow-100 text-yellow-800' };
            return { label: 'Poor', class: 'bg-red-100 text-red-800' };
        }
        if (type === 'temperature') {
            if (value >= 20 && value <= 30) return { label: 'Normal', class: 'bg-green-100 text-green-800' };
            return { label: 'Unusual', class: 'bg-yellow-100 text-yellow-800' };
        }
        if (type === 'tds') {
            if (value < 300) return { label: 'Excellent', class: 'bg-green-100 text-green-800' };
            if (value < 600) return { label: 'Good', class: 'bg-yellow-100 text-yellow-800' };
            return { label: 'Poor', class: 'bg-red-100 text-red-800' };
        }
        return { label: 'Unknown', class: 'bg-gray-100 text-gray-600' };
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    showError(message) {
        console.error('❌', message);
        const grid = document.getElementById('allSensorsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-2"></i>
                    <p class="text-red-800 font-medium">${message}</p>
                    <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    showNoData() {
        console.warn('⚠️ No sensor data available for', this.locationId);
        const grid = document.getElementById('allSensorsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <i class="fas fa-info-circle text-yellow-500 text-3xl mb-2"></i>
                    <p class="text-yellow-800 font-medium">No sensor data found for this location</p>
                    <p class="text-yellow-600 text-sm mt-2">Location: ${this.locationId}</p>
                    <button onclick="window.location.href='index.html'" class="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                        Back to Map
                    </button>
                </div>
            `;
        }
    }

    async createRecentReadingsTable(filterSensorType = null) {
        // Determine effective filter: explicit param > currentSensorType > null
        const effectiveFilter = filterSensorType !== null ? filterSensorType : (this.currentSensorType || null);
        // Persist current sensor selection so accidental calls without param keep the view
        this.currentSensorType = effectiveFilter;
        // Choose container: single-sensor view has its own table area
        const tableContainer = effectiveFilter
            ? document.getElementById('singleRecentReadingsTable')
            : document.getElementById('recentReadingsTable');
        if (!tableContainer) return;

        // Filter readings by sensor type if specified
        let recentReadings;
        let tableTitle;
        
        if (effectiveFilter) {
            // Single sensor view - fetch full readings from Supabase newest->oldest
            try {
                const { data, error } = await this.supabase
                    .from('sensor_readings')
                    .select('*')
                    .eq('sensor_id', `${this.locationId}_${effectiveFilter}`)
                    .order('timestamp', { ascending: false });

                if (error) {
                    console.warn('⚠️ Recent readings fetch error, falling back to client data', error);
                    // Fallback to client-side filtering
                    recentReadings = (this.sensorData || [])
                        .filter(r => r.sensor_id && r.sensor_id.endsWith(`_${effectiveFilter}`))
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                } else {
                    recentReadings = data || [];
                }
            } catch (err) {
                console.warn('⚠️ Exception fetching recent readings:', err);
                recentReadings = (this.sensorData || [])
                    .filter(r => r.sensor_id && r.sensor_id.endsWith(`_${effectiveFilter}`))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            }

            tableTitle = `Recent Readings (${this.getSensorName(effectiveFilter)})`;
        } else {
            // All sensors view - show recent 50 from client data
            recentReadings = (this.sensorData || []).slice(0, 50);
            tableTitle = 'Recent Readings (All Sensors)';
        }

        const html = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">${tableTitle}</h3>
                    <button onclick="window.locationDashboard.exportCSV(${effectiveFilter ? `'${effectiveFilter}'` : 'null'})" 
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                        <i class="fas fa-download"></i>
                        Export CSV
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                ${!effectiveFilter ? '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sensor</th>' : ''}
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${recentReadings.map(reading => {
                                // Extract sensor type from sensor_id
                                const sensorType = reading.sensor_id ? reading.sensor_id.split('_').pop() : 'unknown';
                                const value = reading[sensorType] || reading.value || 0;
                                const unit = this.getUnit(sensorType);
                                const status = this.getStatus(sensorType, value);
                                const time = new Date(reading.timestamp);
                                const sensorName = this.getSensorName(sensorType);
                                
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-3 text-sm text-gray-900">${time.toLocaleString()}</td>
                                        ${!effectiveFilter ? `<td class="px-4 py-3 text-sm font-medium text-gray-900">${sensorName}</td>` : ''}
                                        <td class="px-4 py-3 text-sm text-gray-900">${value.toFixed(2)} ${unit}</td>
                                        <td class="px-4 py-3">
                                            <span class="px-2 py-1 rounded text-xs font-medium ${status.class}">
                                                ${status.label}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 text-sm text-gray-600">
                    Showing ${recentReadings.length} most recent readings
                </div>
            </div>
        `;

        tableContainer.innerHTML = html;

        // Ensure the correct charts section is visible for single-sensor tables
        const allChartsSection = document.getElementById('allSensorsChartsSection');
        const singleChartsSection = document.getElementById('singleSensorChartsSection');
        if (effectiveFilter) {
            if (allChartsSection) allChartsSection.style.display = 'none';
            if (singleChartsSection) singleChartsSection.style.display = 'grid';
        }
    }

    async exportCSV(filterSensorType = null) {
        console.log('📥 Exporting CSV...', filterSensorType ? `(${filterSensorType} only)` : '(all sensors)');

        // Filter data if sensor type specified (prefer server fetch for full data)
        let dataToExport;
        if (filterSensorType) {
            try {
                const { data, error } = await this.supabase
                    .from('sensor_readings')
                    .select('*')
                    .eq('sensor_id', `${this.locationId}_${filterSensorType}`)
                    .order('timestamp', { ascending: false });
                if (error) {
                    console.warn('⚠️ CSV fetch error, falling back to client data', error);
                    dataToExport = (this.sensorData || []).filter(r => r.sensor_id && r.sensor_id.endsWith(`_${filterSensorType}`));
                } else {
                    dataToExport = data || [];
                }
            } catch (err) {
                console.warn('⚠️ Exception fetching CSV data:', err);
                dataToExport = (this.sensorData || []).filter(r => r.sensor_id && r.sensor_id.endsWith(`_${filterSensorType}`));
            }
        } else {
            dataToExport = this.sensorData || [];
        }

        // Prepare CSV data
        const headers = ['Timestamp', 'Sensor Type', 'Sensor ID', 'Value', 'Unit', 'Status', 'Latitude', 'Longitude'];
        const rows = [headers];

        dataToExport.forEach(reading => {
            const sensorType = reading.sensor_id ? reading.sensor_id.split('_').pop() : 'unknown';
            const value = reading[sensorType] || reading.value || 0;
            const unit = this.getUnit(sensorType);
            const status = this.getStatus(sensorType, value).label;
            const time = new Date(reading.timestamp).toISOString();

            rows.push([
                time,
                this.getSensorName(sensorType),
                reading.sensor_id || '',
                value.toFixed(2),
                unit,
                status,
                reading.latitude || '',
                reading.longitude || ''
            ]);
        });

        // Convert to CSV string
        const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        // Generate filename with sensor type if filtered
        const filename = filterSensorType 
            ? `${this.locationId}_${filterSensorType}_data_${new Date().toISOString().split('T')[0]}.csv`
            : `${this.locationId}_sensor_data_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ CSV exported successfully: ${filename}`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Location Dashboard');
    window.locationDashboard = new LocationDashboard();
});
