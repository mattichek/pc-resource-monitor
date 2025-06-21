// static/js/history-charts-script.js
const HISTORY_API_URL = '/api/history';

let historyCharts = {}; // Stores chart instances
let allHistoryData = []; // Stores all fetched history data (including grouped ones)
let currentDisplayMode = 'all'; // 'all' or 'single'

// Helper function to destroy all charts
function clearCharts() {
    for (const key in historyCharts) {
        if (historyCharts[key]) {
            historyCharts[key].destroy();
        }
    }
    historyCharts = {};
    // Clear the chart grid content
    document.getElementById('history-chart-grid').innerHTML = '';
}

// Function to create or update a chart
function createChart(ctx, label, dataPoints, borderColor, unit, decimals, chartType = 'line') {
    // dataPoints should be an array of { x: label/id, y: value }
    // Destroy existing chart if it exists
    if (historyCharts[ctx.canvas.id]) {
        historyCharts[ctx.canvas.id].destroy();
    }

    let xAxesType = 'linear'; // Default for multiple points (e.g., ID)
    let pointRadius = 2; // Default for line chart
    let backgroundColor = 'transparent';

    if (chartType === 'bar') {
        xAxesType = 'category'; // For single point bar chart
        pointRadius = 5; // More visible point
        backgroundColor = borderColor + '80'; // Add transparency to bar fill
    }
    
    const newChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: dataPoints.map(d => d.x),
            datasets: [{
                label: label,
                data: dataPoints.map(d => d.y),
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                tension: 0.1,
                fill: false,
                pointRadius: pointRadius,
                pointHoverRadius: pointRadius * 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: xAxesType, // Dynamic type
                    title: {
                        display: true,
                        text: xAxesType === 'linear' ? 'ID Odczytu' : 'Odczyt'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: xAxesType === 'linear' ? 10 : 5 // Limit for linear, less strict for category
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: unit
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(decimals) + unit;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(decimals) + unit;
                        }
                    }
                }
            },
            animation: false
        }
    });
    historyCharts[ctx.canvas.id] = newChart; // Store the chart instance
    return newChart;
}


async function fetchAndRenderHistoryData(mode = 'all', selectedId = null) {
    try {
        const response = await fetch(HISTORY_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allHistoryData = await response.json(); // Store all data (including grouped ones)

        let dataPointsForCharts = [];
        let chartRenderType = 'line'; // Default for 'all' mode

        // Determine which data to render based on mode and selection
        if (mode === 'all') {
            // Filter out grouped entries for 'all' view, or process them differently
            dataPointsForCharts = allHistoryData.filter(entry => !entry.wartosci.grouped_history_data);
            chartRenderType = 'line';
        } else if (mode === 'single' && selectedId) {
            const selectedEntry = allHistoryData.find(e => String(e.id_odczytu) === String(selectedId));

            if (!selectedEntry) {
                console.warn(`Nie znaleziono wpisu dla ID: ${selectedId}`);
                clearCharts();
                document.getElementById('history-chart-grid').innerHTML = '<p class="no-gpu-message">Nie znaleziono danych dla wybranego odczytu.</p>';
                return;
            }

            if (selectedEntry.wartosci.grouped_history_data) {
                // Handle grouped data entry: display its sub-entries as a line chart
                dataPointsForCharts = selectedEntry.wartosci.grouped_history_data.map(subEntry => ({
                    id_odczytu: subEntry.id_odczytu_orig,
                    timestamp: subEntry.timestamp_orig,
                    wartosci: subEntry.data // This is the actual stats data for this sub-entry
                }));
                chartRenderType = 'line'; // A group of data points makes a line
            } else {
                // Handle single data entry: display as a bar chart
                dataPointsForCharts = [selectedEntry];
                chartRenderType = 'bar';
            }
        } else {
            clearCharts();
            document.getElementById('history-chart-grid').innerHTML = '<p class="no-gpu-message">Wybierz odczyt lub przełącz tryb wyświetlania.</p>';
            return;
        }

        // --- Start rendering ---
        clearCharts(); // Clear existing charts before rendering new ones
        const historyChartGrid = document.getElementById('history-chart-grid');
        // Ensure grid has the correct initial structure for charts
        historyChartGrid.innerHTML = `
            <div class="chart-card">
                <h2>Historia Użycia CPU (%)</h2>
                <div class="chart-container-large">
                    <canvas id="historyCpuUsageChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h2>Historia Użycia RAM (%)</h2>
                <div class="chart-container-large">
                    <canvas id="historyRamUsageChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h2>Historia Użycia Dysku (%)</h2>
                <div class="chart-container-large">
                    <canvas id="historyDiskUsageChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h2>Historia Pobierania Sieci (KB/s)</h2>
                <div class="chart-container-large">
                    <canvas id="historyNetDownloadChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h2>Historia Wysyłania Sieci (KB/s)</h2>
                <div class="chart-container-large">
                    <canvas id="historyNetUploadChart"></canvas>
                </div>
            </div>
            <div class="chart-card" id="historyGpuLoadCard" style="display: none;">
                <h2>Historia Zużycia GPU (%)</h2>
                <div class="chart-container-large">
                    <canvas id="historyGpuLoadChart"></canvas>
                </div>
            </div>
            <div class="chart-card" id="historyGpuMemoryUsedCard" style="display: none;">
                <h2>Historia Wykorzystanej Pamięci GPU (GB)</h2>
                <div class="chart-container-large">
                    <canvas id="historyGpuMemoryUsedChart"></canvas>
                </div>
            </div>
            <div class="chart-card" id="historyGpuTemperatureCard" style="display: none;">
                <h2>Historia Temperatury GPU (°C)</h2>
                <div class="chart-container-large">
                    <canvas id="historyGpuTemperatureChart"></canvas>
                </div>
            </div>
        `;


        // Hide/Show GPU cards based on data presence (recheck after parsing grouped data)
        const gpuLoadCard = document.getElementById('historyGpuLoadCard');
        const gpuMemoryUsedCard = document.getElementById('historyGpuMemoryUsedCard');
        const gpuTemperatureCard = document.getElementById('historyGpuTemperatureCard');

        const hasGpuData = dataPointsForCharts.some(entry => {
            const stats = entry.wartosci;
            const sourceStats = stats.charts_view_stats || stats.main_view_stats;
            return sourceStats && sourceStats.gpu_stats && sourceStats.gpu_stats.length > 0;
        });

        if (gpuLoadCard) gpuLoadCard.style.display = hasGpuData ? 'block' : 'none';
        if (gpuMemoryUsedCard) gpuMemoryUsedCard.style.display = hasGpuData ? 'block' : 'none';
        if (gpuTemperatureCard) gpuTemperatureCard.style.display = hasGpuData ? 'block' : 'none';

        // Helper to extract data for a specific key
        const extractData = (key, gpuKey = null, decimalPlaces = 0) => {
            return dataPointsForCharts.map(entry => {
                const stats = entry.wartosci;
                const sourceStats = stats.charts_view_stats || stats.main_view_stats;
                let value = null;
                if (sourceStats) {
                    if (gpuKey && sourceStats.gpu_stats && sourceStats.gpu_stats.length > 0) {
                        value = sourceStats.gpu_stats[0][gpuKey];
                    } else if (sourceStats.hasOwnProperty(key)) {
                        value = sourceStats[key];
                    }
                }
                const label = dataPointsForCharts.length === 1 // If only one point
                              ? `ID: ${entry.id_odczytu} (${new Date(entry.timestamp).toLocaleTimeString()})`
                              : entry.id_odczytu; // Use ID for multiple points, looks cleaner
                return { x: label, y: typeof value === 'number' ? parseFloat(value.toFixed(decimalPlaces)) : 0 };
            });
        };
        
        // Render charts
        createChart(document.getElementById('historyCpuUsageChart').getContext('2d'), 'Użycie CPU', extractData('cpu_usage'), '#4A90E2', '%', 0, chartRenderType);
        createChart(document.getElementById('historyRamUsageChart').getContext('2d'), 'Użycie RAM', extractData('ram_usage'), '#f0ad4e', '%', 0, chartRenderType);
        createChart(document.getElementById('historyDiskUsageChart').getContext('2d'), 'Użycie Dysku', extractData('disk_usage'), '#d9534f', '%', 0, chartRenderType);
        createChart(document.getElementById('historyNetDownloadChart').getContext('2d'), 'Pobieranie Sieci', extractData('net_download'), '#673ab7', ' KB/s', 0, chartRenderType);
        createChart(document.getElementById('historyNetUploadChart').getContext('2d'), 'Wysyłanie Sieci', extractData('net_upload'), '#ff9800', ' KB/s', 0, chartRenderType);
        
        if (hasGpuData) {
            createChart(document.getElementById('historyGpuLoadChart').getContext('2d'), 'Zużycie GPU', extractData('gpu_stats', 'load'), '#FF5722', '%', 0, chartRenderType);
            createChart(document.getElementById('historyGpuMemoryUsedChart').getContext('2d'), 'Pamięć Używana GPU', extractData('gpu_stats', 'memoryUsed', 2), '#009688', ' GB', 2, chartRenderType);
            createChart(document.getElementById('historyGpuTemperatureChart').getContext('2d'), 'Temperatura GPU', extractData('gpu_stats', 'temperature'), '#e91e63', ' °C', 0, chartRenderType);
        }

    } catch (error) {
        console.error('Błąd podczas pobierania lub renderowania danych historycznych:', error);
        clearCharts(); // Clear any existing charts
        const historyChartGrid = document.getElementById('history-chart-grid');
        if (historyChartGrid) {
            historyChartGrid.innerHTML = '<p class="no-gpu-message">Błąd podczas ładowania danych historycznych. Spróbuj odświeżyć stronę lub upewnij się, że serwer działa.</p>';
        }
    }
}

// Function to populate the select dropdown for single entry mode
function populateHistorySelect() {
    const selectElement = document.getElementById('historyEntrySelect');
    selectElement.innerHTML = ''; // Clear previous options

    // Add a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Wybierz odczyt...';
    selectElement.appendChild(defaultOption);

    // Populate the select dropdown with available entries
    allHistoryData.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id_odczytu;
        const date = new Date(entry.timestamp);
        // Add a special label for grouped entries
        const entryLabel = entry.wartosci.grouped_history_data 
            ? `GRUPA: ID ${entry.id_odczytu} (${new Date(entry.timestamp).toLocaleString()}) - ${entry.wartosci.grouped_history_data.length} odczytów`
            : `ID: ${entry.id_odczytu} - ${date.toLocaleString()}`;
        option.textContent = entryLabel;
        selectElement.appendChild(option);
    });

    // Optionally, select the latest entry by default
    if (allHistoryData.length > 0) {
        selectElement.value = allHistoryData[allHistoryData.length - 1].id_odczytu;
    }
}


function setDisplayMode(mode) {
    currentDisplayMode = mode;
    const showAllBtn = document.getElementById('showAllHistoryBtn');
    const showSingleBtn = document.getElementById('showSingleEntryBtn');
    const singleEntrySelector = document.getElementById('singleEntrySelector');

    if (mode === 'all') {
        showAllBtn.classList.add('active');
        showSingleBtn.classList.remove('active');
        singleEntrySelector.style.display = 'none';
        fetchAndRenderHistoryData('all'); // Render all data
    } else { // mode === 'single'
        showAllBtn.classList.remove('active');
        showSingleBtn.classList.add('active');
        singleEntrySelector.style.display = 'flex'; // Use flex for selector layout
        populateHistorySelect(); // Populate dropdown when switching to single mode
        // Do not render immediately, wait for user to select and click "Wyświetl"
        clearCharts(); // Clear charts when switching to single mode, before selection
        document.getElementById('history-chart-grid').innerHTML = '<p class="no-gpu-message">Wybierz odczyt z listy, aby wyświetlić dane.</p>';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Initial load: show all history
    setDisplayMode('all');

    // Event listeners for mode switching buttons
    document.getElementById('showAllHistoryBtn').addEventListener('click', () => setDisplayMode('all'));
    document.getElementById('showSingleEntryBtn').addEventListener('click', () => setDisplayMode('single'));

    // Event listener for the "Wyświetl wybrany odczyt" button in single mode
    document.getElementById('renderSelectedEntryBtn').addEventListener('click', () => {
        const selectElement = document.getElementById('historyEntrySelect');
        const selectedId = selectElement.value;
        if (selectedId) {
            fetchAndRenderHistoryData('single', selectedId);
        } else {
            alert('Proszę wybrać odczyt z listy.');
        }
    });

    // Refresh all history data periodically (e.g., every 10 seconds), regardless of display mode
    // This ensures that the dropdown for single selection has the latest data.
    setInterval(() => {
        fetch(HISTORY_API_URL)
            .then(response => response.json())
            .then(data => {
                allHistoryData = data; // Update all history data
                if (currentDisplayMode === 'single') {
                    populateHistorySelect(); // Re-populate dropdown only if in single mode
                    // If a grouped entry was selected and now updated, re-render it
                    const selectedId = document.getElementById('historyEntrySelect').value;
                    if (selectedId && allHistoryData.find(e => String(e.id_odczytu) === String(selectedId) && e.wartosci.grouped_history_data)) {
                         fetchAndRenderHistoryData('single', selectedId);
                    }
                } else {
                    // If in 'all' mode, re-render all charts with new data, filtering grouped entries
                    fetchAndRenderHistoryData('all');
                }
            })
            .catch(error => console.error('Błąd podczas odświeżania danych historycznych w tle:', error));
    }, 10000); // Odświeżanie danych co 10 sekund
});