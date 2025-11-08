// Location dashboard module for Water Dashboard
class LocationDashboard {
    constructor() {
        this.supabase = null;
        this.sensorId = null;
        this.locationId = null;
        this.sensorData = null;
        this.allSensorsData = {}; // Store data for all 4 sensors
        this.historicalData = [];
        this.realtimeChart = null;
        this.historicalChart = null;
        this.realtimeChannel = null;
        this.currentPage = 1;
        this.pageSize = 20;
        this.activeSensorType = null; // Default to All Sensors view
        
        this.init();
    }

    async init() {
        try {
            // Get sensor ID or location from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.sensorId = urlParams.get('id');
            const locationParam = urlParams.get('location');

            console.log('URL Parameters:', { id: this.sensorId, location: locationParam });

            // If location is provided, extract it
            if (locationParam) {
                this.locationId = locationParam;
                this.sensorId = `${locationParam}_ph`; // Default sensor ID
                this.activeSensorType = null; // Default to All Sensors view
                console.log('✅ Location parameter provided:', this.locationId);
            } else if (this.sensorId) {
                // Extract location from sensor_id
                this.locationId = this.sensorId.split('_')[0];
                this.activeSensorType = this.sensorId.split('_')[1];
            }

            if (!this.locationId) {
                console.error('❌ No sensor ID or location found in URL');
                this.showError();
                return;
            }

            // Initialize Supabase
            if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
                this.supabase = window.supabase.createClient(
                    window.ENV.SUPABASE_URL,
                    window.ENV.SUPABASE_ANON_KEY
                );
                console.log('✅ Supabase client initialized');
            } else if (window.authManager) {
                this.supabase = window.authManager.getSupabaseClient();
                console.log('✅ Using auth manager Supabase client');
            }

            if (!this.supabase) {
                console.error('❌ Supabase client not available');
                // Continue anyway with sample data
            }

            await this.loadAllSensorsData();
            this.createSensorTabs();
            this.renderAllSensorsGrid();
            await this.loadSensorData();
            await this.loadHistoricalData();
            this.initializeCharts();
            this.setupRealtimeSubscription();
            this.setupEventListeners();
            this.showDashboard();

        } catch (error) {
            console.error('❌ Failed to initialize location dashboard:', error);
            this.showError();
        }
    }

    async loadAllSensorsData() {
        try {
            console.log('📡 Loading data for all sensors at location:', this.locationId);
            
            if (!this.supabase) {
                console.warn('⚠️ No Supabase client, using sample data');
                this.createAllSampleData();
                return;
            }
            
            // First, fetch location details from database
            await this.fetchLocationDetailsFromDB();
            
            const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
            
            for (const sensorType of sensorTypes) {
                const sensorId = `${this.locationId}_${sensorType}`;
                
                const { data, error } = await this.supabase
                    .from('sensor_readings')
                    .select('*')
                    .eq('sensor_id', sensorId)
                    .order('timestamp', { ascending: false })
                    .limit(1);
                
                if (data && data.length > 0) {
                    const record = data[0];
                    const locationDetails = this.locationDetails || this.getLocationDetails(this.locationId);
                    const sensorTypeInfo = this.getSensorTypeInfo(sensorType);
                    
                    this.allSensorsData[sensorType] = {
                        id: sensorId,
                        name: `${locationDetails.name} - ${sensorTypeInfo.name}`,
                        value: parseFloat(record.value),
                        unit: sensorTypeInfo.unit,
                        status: this.determineStatusFromValue(record.value),
                        timestamp: record.timestamp,
                        sensorType: sensorTypeInfo.name
                    };
                } else {
                    // Create sample data for this sensor
                    this.allSensorsData[sensorType] = this.createSampleForType(sensorType);
                }
            }
            
            console.log('✅ Loaded all sensors data:', this.allSensorsData);
            
        } catch (error) {
            console.error('❌ Error loading all sensors:', error);
            this.createAllSampleData();
        }
    }
    
    async fetchLocationDetailsFromDB() {
        try {
            if (!this.supabase) return;
            
            const { data: locationData, error } = await this.supabase
                .from('locations')
                .select('*')
                .eq('location_id', this.locationId)
                .single();
            
            if (error || !locationData) {
                console.warn('⚠️ Location not found in database, using fallback');
                return;
            }
            
            console.log('✅ Found location in database:', locationData);
            
            // Store location details
            this.locationDetails = {
                name: locationData.name,
                coordinates: [locationData.longitude || 0, locationData.latitude || 0],
                description: `Water quality monitoring station - ${locationData.name}`,
                latitude: locationData.latitude,
                longitude: locationData.longitude
            };
            
            // Update page title
            const titleElement = document.getElementById('locationTitle');
            if (titleElement) {
                titleElement.textContent = locationData.name;
            }
            
        } catch (error) {
            console.error('❌ Error fetching location details:', error);
        }
    }
    
    createAllSampleData() {
        const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
        sensorTypes.forEach(type => {
            this.allSensorsData[type] = this.createSampleForType(type);
        });
    }
    
    createSampleForType(sensorType) {
        const locationDetails = this.locationDetails || this.getLocationDetails(this.locationId);
        const sensorTypeInfo = this.getSensorTypeInfo(sensorType);
        
        let sampleValue;
        switch(sensorType) {
            case 'ph':
                sampleValue = 7.0 + (Math.random() * 1.5 - 0.75);
                break;
            case 'turbidity':
                sampleValue = Math.random() * 10;
                break;
            case 'temperature':
                sampleValue = 20 + (Math.random() * 10);
                break;
            case 'tds':
                sampleValue = 200 + (Math.random() * 200);
                break;
            default:
                sampleValue = Math.random() * 100;
        }
        
        return {
            id: `${this.locationId}_${sensorType}`,
            name: `${locationDetails.name} - ${sensorTypeInfo.name}`,
            value: parseFloat(sampleValue.toFixed(1)),
            unit: sensorTypeInfo.unit,
            status: 'active',
            timestamp: new Date().toISOString(),
            sensorType: sensorTypeInfo.name
        };
    }
    
    createSensorTabs() {
        const tabsContainer = document.getElementById('sensorTabs');
        if (!tabsContainer) return;
        
        const sensorTypes = [
            { id: 'all', name: 'All Sensors', icon: 'fa-th-large' },
            { id: 'ph', name: 'pH Level', icon: 'fa-flask' },
            { id: 'turbidity', name: 'Turbidity', icon: 'fa-eye' },
            { id: 'temperature', name: 'Temperature', icon: 'fa-thermometer-half' },
            { id: 'tds', name: 'TDS', icon: 'fa-water' }
        ];
        
        tabsContainer.innerHTML = sensorTypes.map(type => {
            const isActive = (type.id === 'all' && !this.activeSensorType) || type.id === this.activeSensorType;
            return `
                <button 
                    data-sensor="${type.id}" 
                    class="sensor-tab px-4 py-2 rounded-lg font-medium transition-colors ${
                        isActive 
                            ? 'bg-water-blue text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }"
                >
                    <i class="fas ${type.icon} mr-2"></i>${type.name}
                </button>
            `;
        }).join('');
        
        // Add click handlers
        document.querySelectorAll('.sensor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sensorType = e.currentTarget.getAttribute('data-sensor');
                this.switchSensor(sensorType);
            });
        });
    }
    
    renderAllSensorsGrid() {
        const gridContainer = document.getElementById('allSensorsGrid');
        if (!gridContainer) return;
        
        const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
        
        gridContainer.innerHTML = sensorTypes.map(type => {
            const sensor = this.allSensorsData[type];
            if (!sensor) return '';
            
            const statusConfig = this.getStatusConfig(sensor.status);
            const sensorTypeInfo = this.getSensorTypeInfo(type);
            
            return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" data-sensor="${type}">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-sm font-medium text-gray-600">${sensorTypeInfo.name}</p>
                            <p class="text-3xl font-bold text-gray-900 mt-1">${sensor.value.toFixed(1)}</p>
                            <p class="text-sm text-gray-500">${sensor.unit}</p>
                        </div>
                        <div class="w-12 h-12 bg-gradient-to-r ${this.getSensorGradient(type)} rounded-lg flex items-center justify-center">
                            <i class="fas ${this.getSensorIcon(type)} text-white text-xl"></i>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}">
                            <i class="fas fa-circle mr-1"></i>${statusConfig.text}
                        </span>
                        <span class="text-xs text-gray-500">${this.formatRelativeTime(new Date(sensor.timestamp))}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers to sensor cards
        document.querySelectorAll('#allSensorsGrid > div').forEach(card => {
            card.addEventListener('click', (e) => {
                const sensorType = e.currentTarget.getAttribute('data-sensor');
                this.switchSensor(sensorType);
            });
        });
    }
    
    switchSensor(sensorType) {
        if (sensorType === 'all') {
            this.activeSensorType = null;
            this.sensorId = `${this.locationId}_ph`;
            document.getElementById('allSensorsGrid').classList.remove('hidden');
        } else {
            this.activeSensorType = sensorType;
            this.sensorId = `${this.locationId}_${sensorType}`;
            document.getElementById('allSensorsGrid').classList.add('hidden');
        }
        
        // Update tab active states
        document.querySelectorAll('.sensor-tab').forEach(tab => {
            const tabSensor = tab.getAttribute('data-sensor');
            if ((tabSensor === 'all' && !this.activeSensorType) || tabSensor === this.activeSensorType) {
                tab.className = 'sensor-tab px-4 py-2 rounded-lg font-medium transition-colors bg-water-blue text-white';
            } else {
                tab.className = 'sensor-tab px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
            }
        });
        
        // Reload data for selected sensor
        this.loadSensorData();
        this.loadHistoricalData();
    }
    
    getSensorIcon(type) {
        const icons = {
            'ph': 'fa-flask',
            'turbidity': 'fa-eye',
            'temperature': 'fa-thermometer-half',
            'tds': 'fa-water'
        };
        return icons[type] || 'fa-tachometer-alt';
    }
    
    getSensorGradient(type) {
        const gradients = {
            'ph': 'from-blue-500 to-cyan-500',
            'turbidity': 'from-amber-500 to-yellow-500',
            'temperature': 'from-red-500 to-orange-500',
            'tds': 'from-teal-500 to-green-500'
        };
        return gradients[type] || 'from-water-blue to-water-cyan';
    }

    async loadSensorData() {
        try {
            console.log('📡 Loading data for sensor:', this.sensorId);
            
            if (!this.supabase) {
                console.warn('⚠️ No Supabase client, using sample data');
                this.createSampleSensorData();
                return;
            }
            
            // Fetch the latest reading for this sensor from sensor_readings table
            const { data, error } = await this.supabase
                .from('sensor_readings')
                .select('*')
                .eq('sensor_id', this.sensorId)
                .order('timestamp', { ascending: false })
                .limit(1);

            if (error) {
                console.error('❌ Database error:', error);
                // Continue with sample data instead of failing
                this.createSampleSensorData();
                return;
            }

            console.log('📊 Database response:', { count: data?.length, data });

            if (data && data.length > 0) {
                const record = data[0];
                
                // Extract location from sensor_id (e.g., "ukkadam_ph" -> "ukkadam")
                const locationId = this.sensorId.split('_')[0];
                const sensorType = this.sensorId.split('_')[1];
                
                // Get location details
                const locationDetails = this.getLocationDetails(locationId);
                const sensorTypeInfo = this.getSensorTypeInfo(sensorType);
                
                this.sensorData = {
                    id: record.sensor_id,
                    name: `${locationDetails.name} - ${sensorTypeInfo.name}`,
                    latitude: locationDetails.coordinates[1],
                    longitude: locationDetails.coordinates[0],
                    value: parseFloat(record.value),
                    unit: sensorTypeInfo.unit,
                    status: this.determineStatus(record),
                    timestamp: record.timestamp,
                    location: locationDetails.name,
                    sensorType: sensorTypeInfo.name
                };
                
                console.log('✅ Loaded sensor data:', this.sensorData);
            } else {
                console.warn('⚠️ No data found for sensor:', this.sensorId, '- using sample data');
                // Use sample data if no database data
                this.createSampleSensorData();
            }

            this.updateSensorInfo();

        } catch (error) {
            console.error('❌ Error loading sensor data:', error);
            this.createSampleSensorData();
        }
    }
    
    getLocationDetails(locationId) {
        // Return simple fallback - database will provide actual details
        return {
            name: locationId.charAt(0).toUpperCase() + locationId.slice(1),
            coordinates: [0, 0],
            description: `Water quality monitoring station - ${locationId.charAt(0).toUpperCase() + locationId.slice(1)}`
        };
    }
    
    getSensorTypeInfo(sensorType) {
        const types = {
            'ph': { name: 'pH Level', unit: 'pH' },
            'turbidity': { name: 'Turbidity', unit: 'NTU' },
            'temperature': { name: 'Temperature', unit: '°C' },
            'tds': { name: 'TDS', unit: 'ppm' }
        };
        
        return types[sensorType] || { name: sensorType, unit: 'units' };
    }

    createSampleSensorData() {
        console.log('📝 Creating sample data for sensor:', this.sensorId);
        
        // Extract location and sensor type from sensor_id
        const parts = this.sensorId.split('_');
        const locationId = parts[0];
        const sensorType = parts[1] || 'ph';
        
        const locationDetails = this.getLocationDetails(locationId);
        const sensorTypeInfo = this.getSensorTypeInfo(sensorType);
        
        // Generate appropriate sample value based on sensor type
        let sampleValue;
        switch(sensorType) {
            case 'ph':
                sampleValue = 7.0 + (Math.random() * 1.5 - 0.75); // 6.25 to 7.75
                break;
            case 'turbidity':
                sampleValue = Math.random() * 10; // 0 to 10 NTU
                break;
            case 'temperature':
                sampleValue = 20 + (Math.random() * 10); // 20 to 30°C
                break;
            case 'tds':
                sampleValue = 200 + (Math.random() * 200); // 200 to 400 ppm
                break;
            default:
                sampleValue = Math.random() * 100;
        }

        this.sensorData = {
            id: this.sensorId,
            name: `${locationDetails.name} - ${sensorTypeInfo.name}`,
            latitude: locationDetails.coordinates[1],
            longitude: locationDetails.coordinates[0],
            value: parseFloat(sampleValue.toFixed(1)),
            unit: sensorTypeInfo.unit,
            status: 'active',
            timestamp: new Date().toISOString(),
            location: locationDetails.name,
            sensorType: sensorTypeInfo.name
        };
        
        console.log('✅ Sample sensor data created:', this.sensorData);

        this.updateSensorInfo();
    }

    async loadHistoricalData() {
        try {
            console.log('Loading historical data for:', this.sensorId);
            
            // Fetch historical readings from sensor_readings table
            const { data, error } = await this.supabase
                .from('sensor_readings')
                .select('*')
                .eq('sensor_id', this.sensorId)
                .order('timestamp', { ascending: false })
                .limit(200);

            if (error) {
                console.error('Database error:', error);
                throw error;
            }

            if (data && data.length > 0) {
                this.historicalData = data.map(record => ({
                    timestamp: record.timestamp,
                    value: parseFloat(record.value),
                    rssi: record.rssi,
                    status: this.determineStatusFromValue(record.value)
                }));
                
                console.log(`Loaded ${this.historicalData.length} historical readings`);
            } else {
                console.warn('No historical data found, generating sample data');
                // Generate sample historical data
                this.generateSampleHistoricalData();
            }

            this.updateStatistics();
            this.updateDataTable();

        } catch (error) {
            console.error('Error loading historical data:', error);
            this.generateSampleHistoricalData();
        }
    }

    generateSampleHistoricalData() {
        const now = new Date();
        const baseValue = this.sensorData.value;
        this.historicalData = [];

        // Generate 48 hours of sample data (every 30 minutes)
        for (let i = 0; i < 96; i++) {
            const timestamp = new Date(now.getTime() - (i * 30 * 60 * 1000));
            const variation = (Math.random() - 0.5) * 20; // ±10 variation
            const value = Math.max(0, Math.min(100, baseValue + variation));
            
            this.historicalData.push({
                timestamp: timestamp.toISOString(),
                value: parseFloat(value.toFixed(1)),
                status: this.determineStatusFromValue(value)
            });
        }

        this.historicalData.reverse(); // Oldest first
        this.updateStatistics();
        this.updateDataTable();
    }

    determineStatus(record) {
        const now = new Date();
        const recordTime = new Date(record.timestamp);
        const minutesOld = (now - recordTime) / (1000 * 60);

        if (minutesOld > 60) {
            return 'offline';
        } else if (record.value > 80 || record.value < 20) {
            return 'warning';
        } else {
            return 'active';
        }
    }

    determineStatusFromValue(value) {
        // Get sensor type to determine appropriate thresholds
        if (!this.sensorData) return 'active';
        
        const sensorType = this.sensorId.split('_')[1];
        
        switch(sensorType) {
            case 'ph':
                // pH should be between 6.5 and 8.5 for safe drinking water
                if (value < 6.5 || value > 8.5) return 'warning';
                return 'active';
            case 'turbidity':
                // Turbidity should be below 5 NTU for safe water
                if (value > 5) return 'warning';
                return 'active';
            case 'temperature':
                // Temperature between 10-25°C is normal
                if (value < 10 || value > 30) return 'warning';
                return 'active';
            case 'tds':
                // TDS should be below 500 ppm for safe water
                if (value > 500) return 'warning';
                return 'active';
            default:
                // Generic threshold
                if (value > 80 || value < 20) return 'warning';
                return 'active';
        }
    }

    updateSensorInfo() {
        if (!this.sensorData) return;

        // Update header - use database location name if available
        const locationName = this.locationDetails?.name || this.sensorData.name;
        document.getElementById('locationTitle').textContent = locationName;

        // Update current value card
        document.getElementById('currentValue').textContent = this.sensorData.value.toFixed(1);
        document.getElementById('currentUnit').textContent = this.sensorData.unit;

        // Update status
        const statusElement = document.getElementById('valueStatus');
        const statusConfig = this.getStatusConfig(this.sensorData.status);
        statusElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}`;
        statusElement.innerHTML = `<i class="fas fa-circle mr-1"></i>${statusConfig.text}`;

        // Update last update time
        const lastUpdate = new Date(this.sensorData.timestamp);
        document.getElementById('lastUpdateTime').textContent = lastUpdate.toLocaleTimeString();
        document.getElementById('lastUpdateRelative').textContent = this.formatRelativeTime(lastUpdate);

        // Update sensor information section
        document.getElementById('sensorId').textContent = this.sensorData.id;
        document.getElementById('sensorLocation').textContent = this.sensorData.name;
        document.getElementById('sensorCoordinates').textContent = 
            `${this.sensorData.latitude.toFixed(6)}, ${this.sensorData.longitude.toFixed(6)}`;

        const sensorStatusElement = document.getElementById('sensorStatus');
        sensorStatusElement.innerHTML = `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}">
                <i class="fas fa-circle mr-1"></i>${statusConfig.text}
            </span>
        `;
    }

    updateStatistics() {
        if (this.historicalData.length === 0) return;

        // Calculate 24h average
        const last24h = this.historicalData.filter(d => {
            const dataTime = new Date(d.timestamp);
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return dataTime > cutoff;
        });

        if (last24h.length > 0) {
            const average = last24h.reduce((sum, d) => sum + d.value, 0) / last24h.length;
            document.getElementById('averageValue').textContent = average.toFixed(1);

            // Calculate trend
            const firstHalf = last24h.slice(0, Math.floor(last24h.length / 2));
            const secondHalf = last24h.slice(Math.floor(last24h.length / 2));
            
            if (firstHalf.length > 0 && secondHalf.length > 0) {
                const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
                const trend = secondAvg - firstAvg;

                const trendElement = document.getElementById('averageTrend');
                if (trend > 1) {
                    trendElement.innerHTML = '<i class="fas fa-arrow-up text-red-500 mr-1"></i><span class="text-red-500">Increasing</span>';
                } else if (trend < -1) {
                    trendElement.innerHTML = '<i class="fas fa-arrow-down text-green-500 mr-1"></i><span class="text-green-500">Decreasing</span>';
                } else {
                    trendElement.innerHTML = '<i class="fas fa-minus text-gray-500 mr-1"></i><span class="text-gray-500">Stable</span>';
                }
            }
        }

        // Update data points count
        document.getElementById('dataPointsCount').textContent = last24h.length;

        // Update data range
        if (this.historicalData.length > 0) {
            const values = this.historicalData.map(d => d.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            document.getElementById('dataRange').textContent = `${min.toFixed(1)} - ${max.toFixed(1)} ${this.sensorData.unit}`;
        }
    }

    initializeCharts() {
        this.initRealtimeChart();
        this.initHistoricalChart();
    }

    initRealtimeChart() {
        const ctx = document.getElementById('realtimeChart').getContext('2d');
        
        // Get last 20 data points for real-time view
        const realtimeData = this.historicalData.slice(-20);
        
        this.realtimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: realtimeData.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: `Reading (${this.sensorData.unit})`,
                    data: realtimeData.map(d => d.value),
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#0ea5e9',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                animation: {
                    duration: 750
                }
            }
        });
    }

    initHistoricalChart() {
        const ctx = document.getElementById('historicalChart').getContext('2d');
        
        this.historicalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.historicalData.map(d => new Date(d.timestamp).toLocaleDateString()),
                datasets: [{
                    label: `Reading (${this.sensorData.unit})`,
                    data: this.historicalData.map(d => d.value),
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    updateDataTable() {
        const tbody = document.getElementById('dataTableBody');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.historicalData.slice().reverse().slice(startIndex, endIndex);

        tbody.innerHTML = pageData.map((record, index) => {
            const timestamp = new Date(record.timestamp);
            const statusConfig = this.getStatusConfig(record.status);
            
            // Calculate change from previous reading
            const prevIndex = startIndex + index + 1;
            const prevRecord = this.historicalData.slice().reverse()[prevIndex];
            let changeHtml = '<span class="text-gray-400">--</span>';
            
            if (prevRecord) {
                const change = record.value - prevRecord.value;
                const changeClass = change > 0 ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-gray-500';
                const changeIcon = change > 0 ? 'fa-arrow-up' : change < 0 ? 'fa-arrow-down' : 'fa-minus';
                changeHtml = `<span class="${changeClass}"><i class="fas ${changeIcon} mr-1"></i>${Math.abs(change).toFixed(1)}</span>`;
            }

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${timestamp.toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${record.value.toFixed(1)} ${this.sensorData.unit}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}">
                            ${statusConfig.text}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        ${changeHtml}
                    </td>
                </tr>
            `;
        }).join('');

        // Update pagination info
        document.getElementById('showingCount').textContent = Math.min(endIndex, this.historicalData.length);
        document.getElementById('totalCount').textContent = this.historicalData.length;

        // Update pagination buttons
        document.getElementById('prevBtn').disabled = this.currentPage === 1;
        document.getElementById('nextBtn').disabled = endIndex >= this.historicalData.length;
    }

    setupRealtimeSubscription() {
        if (!this.supabase) return;

        try {
            console.log('Setting up real-time subscription for:', this.sensorId);
            
            this.realtimeChannel = this.supabase
                .channel(`sensor_${this.sensorId}_changes`)
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'sensor_readings',
                        filter: `sensor_id=eq.${this.sensorId}`
                    }, 
                    (payload) => {
                        console.log('Received real-time update:', payload.new);
                        this.handleRealtimeUpdate(payload.new);
                    }
                )
                .subscribe((status) => {
                    console.log('Subscription status:', status);
                });

        } catch (error) {
            console.error('Failed to setup realtime subscription:', error);
        }
    }

    handleRealtimeUpdate(newRecord) {
        // Extract location from sensor_id
        const locationId = this.sensorId.split('_')[0];
        const sensorType = this.sensorId.split('_')[1];
        const locationDetails = this.getLocationDetails(locationId);
        const sensorTypeInfo = this.getSensorTypeInfo(sensorType);
        
        // Update current sensor data
        this.sensorData = {
            id: newRecord.sensor_id,
            name: `${locationDetails.name} - ${sensorTypeInfo.name}`,
            latitude: locationDetails.coordinates[1],
            longitude: locationDetails.coordinates[0],
            value: parseFloat(newRecord.value),
            unit: sensorTypeInfo.unit,
            status: this.determineStatusFromValue(newRecord.value),
            timestamp: newRecord.timestamp,
            location: locationDetails.name,
            sensorType: sensorTypeInfo.name
        };

        // Add to historical data
        this.historicalData.unshift({
            timestamp: newRecord.timestamp,
            value: parseFloat(newRecord.value),
            rssi: newRecord.rssi,
            status: this.determineStatusFromValue(newRecord.value)
        });

        // Keep only last 1000 records
        if (this.historicalData.length > 1000) {
            this.historicalData = this.historicalData.slice(0, 1000);
        }

        // Update UI
        this.updateSensorInfo();
        this.updateStatistics();
        this.updateCharts();
        this.updateDataTable();
    }

    updateCharts() {
        // Update real-time chart
        if (this.realtimeChart) {
            const realtimeData = this.historicalData.slice(-20);
            this.realtimeChart.data.labels = realtimeData.map(d => new Date(d.timestamp).toLocaleTimeString());
            this.realtimeChart.data.datasets[0].data = realtimeData.map(d => d.value);
            this.realtimeChart.update('none');
        }

        // Update historical chart based on selected time range
        this.updateHistoricalChart();
    }

    updateHistoricalChart() {
        if (!this.historicalChart) return;

        const timeRange = document.getElementById('timeRangeSelect').value;
        const filteredData = this.getFilteredData(timeRange);

        this.historicalChart.data.labels = filteredData.map(d => {
            const date = new Date(d.timestamp);
            return timeRange === '1h' || timeRange === '6h' ? 
                date.toLocaleTimeString() : 
                date.toLocaleDateString();
        });
        this.historicalChart.data.datasets[0].data = filteredData.map(d => d.value);
        this.historicalChart.update();
    }

    getFilteredData(timeRange) {
        const now = new Date();
        let cutoffTime;

        switch (timeRange) {
            case '1h':
                cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '6h':
                cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                break;
            case '24h':
                cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return this.historicalData;
        }

        return this.historicalData.filter(d => new Date(d.timestamp) > cutoffTime);
    }

    setupEventListeners() {
        // Back to map button
        const backBtn = document.getElementById('backToMapBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Get saved map state
                const mapState = sessionStorage.getItem('mapState');
                if (mapState) {
                    const state = JSON.parse(mapState);
                    // Redirect with map state parameters
                    window.location.href = `index.html?lat=${state.lat}&lng=${state.lng}&zoom=${state.zoom}`;
                } else {
                    window.location.href = 'index.html';
                }
            });
        }
        
        // Time range selector
        document.getElementById('timeRangeSelect').addEventListener('change', () => {
            this.updateHistoricalChart();
        });

        // Pagination buttons
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateDataTable();
            }
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            const maxPage = Math.ceil(this.historicalData.length / this.pageSize);
            if (this.currentPage < maxPage) {
                this.currentPage++;
                this.updateDataTable();
            }
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });
    }

    exportToCSV() {
        const headers = ['Timestamp', 'Value', 'Unit', 'Status'];
        const csvContent = [
            headers.join(','),
            ...this.historicalData.map(record => [
                new Date(record.timestamp).toISOString(),
                record.value,
                this.sensorData.unit,
                record.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor_${this.sensorId}_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    getStatusConfig(status) {
        switch (status) {
            case 'active':
                return {
                    class: 'bg-green-100 text-green-800',
                    text: 'Normal'
                };
            case 'warning':
                return {
                    class: 'bg-yellow-100 text-yellow-800',
                    text: 'Warning'
                };
            case 'offline':
                return {
                    class: 'bg-red-100 text-red-800',
                    text: 'Offline'
                };
            default:
                return {
                    class: 'bg-gray-100 text-gray-800',
                    text: 'Unknown'
                };
        }
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    showDashboard() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('mainDashboard').classList.remove('hidden');
    }

    showError() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mainDashboard').classList.add('hidden');
        document.getElementById('errorState').classList.remove('hidden');
    }

    cleanup() {
        if (this.realtimeChannel) {
            this.supabase.removeChannel(this.realtimeChannel);
        }
    }
}

// Initialize location dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.locationDashboard = new LocationDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.locationDashboard) {
        window.locationDashboard.cleanup();
    }
});
