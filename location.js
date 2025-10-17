// Location dashboard module for Water Dashboard
class LocationDashboard {
    constructor() {
        this.supabase = null;
        this.sensorId = null;
        this.sensorData = null;
        this.historicalData = [];
        this.realtimeChart = null;
        this.historicalChart = null;
        this.realtimeChannel = null;
        this.currentPage = 1;
        this.pageSize = 20;
        
        this.init();
    }

    async init() {
        try {
            // Get sensor ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.sensorId = urlParams.get('id');

            if (!this.sensorId) {
                this.showError();
                return;
            }

            // Get Supabase client from auth manager
            if (window.authManager) {
                this.supabase = window.authManager.getSupabaseClient();
            }

            if (!this.supabase) {
                throw new Error('Supabase client not available');
            }

            await this.loadSensorData();
            await this.loadHistoricalData();
            this.initializeCharts();
            this.setupRealtimeSubscription();
            this.setupEventListeners();
            this.showDashboard();

        } catch (error) {
            console.error('Failed to initialize location dashboard:', error);
            this.showError();
        }
    }

    async loadSensorData() {
        try {
            // First try to get data from database
            const { data, error } = await this.supabase
                .from('sensor_data')
                .select('*')
                .eq('sensor_id', this.sensorId)
                .order('timestamp', { ascending: false })
                .limit(1);

            if (error && error.code !== '42P01') {
                throw error;
            }

            if (data && data.length > 0) {
                const record = data[0];
                this.sensorData = {
                    id: record.sensor_id,
                    name: record.name || `Sensor ${record.sensor_id}`,
                    latitude: parseFloat(record.latitude),
                    longitude: parseFloat(record.longitude),
                    value: parseFloat(record.value),
                    unit: record.unit || 'ppm',
                    status: this.determineStatus(record),
                    timestamp: record.timestamp
                };
            } else {
                // Use sample data if no database data
                this.createSampleSensorData();
            }

            this.updateSensorInfo();

        } catch (error) {
            console.error('Error loading sensor data:', error);
            this.createSampleSensorData();
        }
    }

    createSampleSensorData() {
        // Create sample data for the requested sensor
        const sampleSensors = {
            'sensor_001': {
                id: 'sensor_001',
                name: 'Downtown Water Station',
                latitude: 40.7128,
                longitude: -74.0060,
                value: 75.2,
                unit: 'ppm',
                status: 'active',
                timestamp: new Date().toISOString()
            },
            'sensor_002': {
                id: 'sensor_002',
                name: 'Central Park Monitor',
                latitude: 40.7829,
                longitude: -73.9654,
                value: 68.5,
                unit: 'ppm',
                status: 'active',
                timestamp: new Date().toISOString()
            },
            'sensor_003': {
                id: 'sensor_003',
                name: 'Brooklyn Bridge Sensor',
                latitude: 40.7061,
                longitude: -73.9969,
                value: 82.1,
                unit: 'ppm',
                status: 'warning',
                timestamp: new Date().toISOString()
            }
        };

        this.sensorData = sampleSensors[this.sensorId] || {
            id: this.sensorId,
            name: `Sensor ${this.sensorId}`,
            latitude: 40.7128,
            longitude: -74.0060,
            value: Math.random() * 100,
            unit: 'ppm',
            status: 'active',
            timestamp: new Date().toISOString()
        };

        this.updateSensorInfo();
    }

    async loadHistoricalData() {
        try {
            const { data, error } = await this.supabase
                .from('sensor_data')
                .select('*')
                .eq('sensor_id', this.sensorId)
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error && error.code !== '42P01') {
                throw error;
            }

            if (data && data.length > 0) {
                this.historicalData = data.map(record => ({
                    timestamp: record.timestamp,
                    value: parseFloat(record.value),
                    status: this.determineStatus(record)
                }));
            } else {
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
        if (value > 80 || value < 20) {
            return 'warning';
        } else {
            return 'active';
        }
    }

    updateSensorInfo() {
        if (!this.sensorData) return;

        // Update header
        document.getElementById('locationTitle').textContent = this.sensorData.name;

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
            this.realtimeChannel = this.supabase
                .channel(`sensor_${this.sensorId}_changes`)
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'sensor_data',
                        filter: `sensor_id=eq.${this.sensorId}`
                    }, 
                    (payload) => {
                        this.handleRealtimeUpdate(payload.new);
                    }
                )
                .subscribe();

        } catch (error) {
            console.error('Failed to setup realtime subscription:', error);
        }
    }

    handleRealtimeUpdate(newRecord) {
        // Update current sensor data
        this.sensorData = {
            id: newRecord.sensor_id,
            name: newRecord.name || this.sensorData.name,
            latitude: parseFloat(newRecord.latitude),
            longitude: parseFloat(newRecord.longitude),
            value: parseFloat(newRecord.value),
            unit: newRecord.unit || this.sensorData.unit,
            status: this.determineStatus(newRecord),
            timestamp: newRecord.timestamp
        };

        // Add to historical data
        this.historicalData.push({
            timestamp: newRecord.timestamp,
            value: parseFloat(newRecord.value),
            status: this.determineStatus(newRecord)
        });

        // Keep only last 1000 records
        if (this.historicalData.length > 1000) {
            this.historicalData = this.historicalData.slice(-1000);
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
