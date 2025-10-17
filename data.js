// Data management module for Water Dashboard
class DataManager {
    constructor() {
        this.supabase = null;
        this.sensors = [];
        this.realtimeChannel = null;
        this.refreshInterval = null;
        this.isConnected = false;
        
        this.init();
    }

    async init() {
        try {
            // Get Supabase client from auth manager
            if (window.authManager) {
                this.supabase = window.authManager.getSupabaseClient();
            }

            if (!this.supabase) {
                throw new Error('Supabase client not available');
            }

            await this.setupDatabase();
            await this.loadInitialData();
            this.setupRealtimeSubscription();
            this.startPeriodicRefresh();
            this.updateConnectionStatus(true);

        } catch (error) {
            console.error('Failed to initialize data manager:', error);
            this.updateConnectionStatus(false);
        }
    }

    async setupDatabase() {
        // This would typically be done via Supabase dashboard or migration scripts
        // Here we'll just verify the tables exist and create sample data if needed
        
        try {
            // Check if sensor_data table exists by trying to query it
            const { data, error } = await this.supabase
                .from('sensor_data')
                .select('*')
                .limit(1);

            if (error && error.code === '42P01') {
                // Table doesn't exist, show instructions
                console.warn('sensor_data table not found. Please create it in Supabase dashboard.');
                this.showDatabaseSetupInstructions();
            }

        } catch (error) {
            console.error('Database setup error:', error);
        }
    }

    showDatabaseSetupInstructions() {
        const instructions = `
        Please create the following table in your Supabase dashboard:

        CREATE TABLE sensor_data (
            id SERIAL PRIMARY KEY,
            sensor_id VARCHAR(50) NOT NULL,
            name VARCHAR(100),
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            value DECIMAL(10, 4) NOT NULL,
            unit VARCHAR(20) DEFAULT 'units',
            status VARCHAR(20) DEFAULT 'active',
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Enable Row Level Security
        ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

        -- Create policy for authenticated users
        CREATE POLICY "Users can view sensor data" ON sensor_data
            FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Users can insert sensor data" ON sensor_data
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        -- Enable realtime
        ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
        `;

        console.log(instructions);
        this.createSampleData();
    }

    createSampleData() {
        // Create sample sensor data for demonstration
        this.sensors = [
            {
                id: 'sensor_001',
                name: 'Downtown Water Station',
                latitude: 40.7128,
                longitude: -74.0060,
                value: 75.2,
                unit: 'ppm',
                status: 'active',
                timestamp: new Date().toISOString()
            },
            {
                id: 'sensor_002',
                name: 'Central Park Monitor',
                latitude: 40.7829,
                longitude: -73.9654,
                value: 68.5,
                unit: 'ppm',
                status: 'active',
                timestamp: new Date().toISOString()
            },
            {
                id: 'sensor_003',
                name: 'Brooklyn Bridge Sensor',
                latitude: 40.7061,
                longitude: -73.9969,
                value: 82.1,
                unit: 'ppm',
                status: 'warning',
                timestamp: new Date().toISOString()
            },
            {
                id: 'sensor_004',
                name: 'Queens Monitoring Point',
                latitude: 40.7282,
                longitude: -73.7949,
                value: 45.8,
                unit: 'ppm',
                status: 'offline',
                timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
            },
            {
                id: 'sensor_005',
                name: 'Staten Island Station',
                latitude: 40.5795,
                longitude: -74.1502,
                value: 91.3,
                unit: 'ppm',
                status: 'active',
                timestamp: new Date().toISOString()
            }
        ];

        // Update map with sample data
        if (window.mapManager) {
            window.mapManager.addSensorMarkers(this.sensors);
        }

        this.updateStatistics();
        this.updateRecentReadings();
    }

    async loadInitialData() {
        try {
            const { data, error } = await this.supabase
                .from('sensor_data')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) {
                console.warn('Could not load data from database:', error.message);
                this.createSampleData();
                return;
            }

            if (data && data.length > 0) {
                // Process real data from database
                this.sensors = this.processRawSensorData(data);
                
                if (window.mapManager) {
                    window.mapManager.addSensorMarkers(this.sensors);
                }

                this.updateStatistics();
                this.updateRecentReadings();
            } else {
                // No data in database, use sample data
                this.createSampleData();
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.createSampleData();
        }
    }

    processRawSensorData(rawData) {
        // Group by sensor_id and get latest reading for each sensor
        const sensorMap = new Map();
        
        rawData.forEach(record => {
            const sensorId = record.sensor_id;
            if (!sensorMap.has(sensorId) || 
                new Date(record.timestamp) > new Date(sensorMap.get(sensorId).timestamp)) {
                sensorMap.set(sensorId, {
                    id: record.sensor_id,
                    name: record.name || `Sensor ${record.sensor_id}`,
                    latitude: parseFloat(record.latitude),
                    longitude: parseFloat(record.longitude),
                    value: parseFloat(record.value),
                    unit: record.unit || 'units',
                    status: this.determineStatus(record),
                    timestamp: record.timestamp
                });
            }
        });

        return Array.from(sensorMap.values());
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

    setupRealtimeSubscription() {
        if (!this.supabase) return;

        try {
            this.realtimeChannel = this.supabase
                .channel('sensor_data_changes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'sensor_data' 
                    }, 
                    (payload) => {
                        this.handleRealtimeUpdate(payload);
                    }
                )
                .subscribe((status) => {
                    console.log('Realtime subscription status:', status);
                    this.updateConnectionStatus(status === 'SUBSCRIBED');
                });

        } catch (error) {
            console.error('Failed to setup realtime subscription:', error);
            this.updateConnectionStatus(false);
        }
    }

    handleRealtimeUpdate(payload) {
        console.log('Realtime update received:', payload);

        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                this.handleNewSensorReading(newRecord);
                break;
            case 'UPDATE':
                this.handleUpdatedSensorReading(newRecord);
                break;
            case 'DELETE':
                this.handleDeletedSensorReading(oldRecord);
                break;
        }

        // Update UI
        this.updateStatistics();
        this.updateRecentReadings();
        
        // Update map
        if (window.mapManager) {
            window.mapManager.addSensorMarkers(this.sensors);
        }
    }

    handleNewSensorReading(record) {
        const processedSensor = {
            id: record.sensor_id,
            name: record.name || `Sensor ${record.sensor_id}`,
            latitude: parseFloat(record.latitude),
            longitude: parseFloat(record.longitude),
            value: parseFloat(record.value),
            unit: record.unit || 'units',
            status: this.determineStatus(record),
            timestamp: record.timestamp
        };

        // Update existing sensor or add new one
        const existingIndex = this.sensors.findIndex(s => s.id === processedSensor.id);
        if (existingIndex >= 0) {
            this.sensors[existingIndex] = processedSensor;
        } else {
            this.sensors.push(processedSensor);
        }
    }

    handleUpdatedSensorReading(record) {
        this.handleNewSensorReading(record); // Same logic for updates
    }

    handleDeletedSensorReading(record) {
        this.sensors = this.sensors.filter(s => s.id !== record.sensor_id);
    }

    async insertSensorReading(sensorId, value, latitude, longitude, name = null) {
        if (!this.supabase) {
            console.error('Supabase client not available');
            return false;
        }

        try {
            const { data, error } = await this.supabase
                .from('sensor_data')
                .insert([
                    {
                        sensor_id: sensorId,
                        name: name,
                        latitude: latitude,
                        longitude: longitude,
                        value: value,
                        timestamp: new Date().toISOString()
                    }
                ]);

            if (error) {
                console.error('Error inserting sensor reading:', error);
                return false;
            }

            console.log('Sensor reading inserted successfully:', data);
            return true;

        } catch (error) {
            console.error('Error inserting sensor reading:', error);
            return false;
        }
    }

    async getSensorHistory(sensorId, limit = 100) {
        if (!this.supabase) {
            console.error('Supabase client not available');
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from('sensor_data')
                .select('*')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching sensor history:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('Error fetching sensor history:', error);
            return [];
        }
    }

    startPeriodicRefresh() {
        // Refresh data every 30 seconds as fallback to realtime
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, window.config.app.refreshInterval);
    }

    async refreshData() {
        try {
            await this.loadInitialData();
            console.log('Data refreshed');
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    updateStatistics() {
        const activeSensors = this.sensors.filter(s => s.status === 'active').length;
        const totalReadings = this.sensors.length;
        const avgReading = totalReadings > 0 ? 
            (this.sensors.reduce((sum, s) => sum + s.value, 0) / totalReadings).toFixed(1) : 0;

        document.getElementById('activeSensors').textContent = `${activeSensors}/${totalReadings}`;
        document.getElementById('avgReading').textContent = `${avgReading} ppm`;

        // Update last update time
        const latestTimestamp = this.sensors.reduce((latest, sensor) => {
            const sensorTime = new Date(sensor.timestamp);
            return sensorTime > latest ? sensorTime : latest;
        }, new Date(0));

        document.getElementById('lastUpdate').textContent = this.formatRelativeTime(latestTimestamp);
    }

    updateRecentReadings() {
        const container = document.getElementById('recentReadings');
        if (!container) return;

        // Get 5 most recent readings
        const recentSensors = [...this.sensors]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        container.innerHTML = recentSensors.map(sensor => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 rounded-full ${this.getStatusDotColor(sensor.status)}"></div>
                    <span class="text-xs font-medium text-gray-700">${sensor.name}</span>
                </div>
                <div class="text-right">
                    <div class="text-xs font-bold text-gray-900">${sensor.value} ${sensor.unit}</div>
                    <div class="text-xs text-gray-500">${this.formatRelativeTime(new Date(sensor.timestamp))}</div>
                </div>
            </div>
        `).join('');
    }

    getStatusDotColor(status) {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'offline': return 'bg-red-500';
            default: return 'bg-gray-500';
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

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connectionStatus');
        
        if (statusElement) {
            const dot = statusElement.querySelector('div');
            const text = statusElement.querySelector('span');
            
            if (connected) {
                dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
                text.textContent = 'Connected';
            } else {
                dot.className = 'w-2 h-2 bg-red-500 rounded-full';
                text.textContent = 'Disconnected';
            }
        }
    }

    // Method for ESP32 to call via HTTP endpoint
    async receiveESP32Data(sensorId, value, latitude, longitude, name = null) {
        return await this.insertSensorReading(sensorId, value, latitude, longitude, name);
    }

    // Cleanup method
    cleanup() {
        if (this.realtimeChannel) {
            this.supabase.removeChannel(this.realtimeChannel);
        }
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    // Get sensor by ID
    getSensorById(sensorId) {
        return this.sensors.find(s => s.id === sensorId);
    }

    // Get all sensors
    getAllSensors() {
        return this.sensors;
    }
}

// Initialize data manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth manager to be ready
    const initDataManager = () => {
        if (window.authManager && window.authManager.isAuthenticated()) {
            window.dataManager = new DataManager();
        } else {
            // Retry after a short delay
            setTimeout(initDataManager, 500);
        }
    };
    
    initDataManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dataManager) {
        window.dataManager.cleanup();
    }
});
