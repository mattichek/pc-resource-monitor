// history-charts-script.js
const HISTORY_READOUTS_API_URL = '/api/get_historical_readouts';
const HISTORY_DATA_API_URL = '/api/get_historical_data/'; // Dodamy ID odczytu na końcu
const DELETE_READOUT_API_URL = '/api/delete_historical_readout/'; // Nowy endpoint do usunięcia odczytu

let monitorStats = {
    'cpu_usage': { label: 'Zużycie CPU', unit: '%', borderColor: '#4A90E2', history: [], chart: null, decimals: 0, chartType: 'line' },
    'ram_usage': { label: 'Zużycie RAM', unit: '%', borderColor: '#f0ad4e', history: [], chart: null, decimals: 0, chartType: 'line' },
    'ram_free': { label: 'Wolna pamięć RAM', unit: ' GB', borderColor: '#5bc0de', history: [], chart: null, decimals: 2, chartType: 'line' },
    'disk_usage': { label: 'Zużycie Dysku', unit: '%', borderColor: '#DAF7A6', history: [], chart: null, decimals: 0, chartType: 'line' },
    'net_download': { label: 'Pobieranie Sieci', unit: ' KB/s', borderColor: '#673ab7', history: [], chart: null, decimals: 0, chartType: 'line' },
    'net_upload': { label: 'Wysyłanie Sieci', unit: ' KB/s', borderColor: '#ff9800', history: [], chart: null, decimals: 0, chartType: 'line' },
    'net_connections': { label: 'Aktywne Połączenia', unit: ' połączeń', borderColor: '#8bc34a', history: [], chart: null, decimals: 0, chartType: 'line' },
    // GPU stats będą dodawane dynamicznie
};

let chartsInitialized = false;

// Funkcja do pobierania i wypełniania listy rozwijanej
async function populateReadoutSelect() {
    try {
        const response = await fetch(HISTORY_READOUTS_API_URL);
        const readouts = await response.json();

        const selectElement = document.getElementById('readout-select');
        selectElement.innerHTML = ''; // Wyczyść istniejące opcje

        if (readouts.status === 'error') {
            console.error('Błąd podczas pobierania odczytów historycznych:', readouts.message);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Błąd ładowania historii';
            selectElement.appendChild(option);
            return;
        }

        if (readouts.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Brak zapisanych odczytów';
            selectElement.appendChild(option);
            document.getElementById('load-readout-button').disabled = true;
            document.getElementById('delete-readout-button').disabled = true;
            return;
        }

        readouts.forEach(readout => {
            const option = document.createElement('option');
            option.value = readout.id;
            // Formatowanie daty dla lepszej czytelności
            const date = new Date(readout.timestamp);
            option.textContent = `${readout.id} - ${date.toLocaleString()}`;
            selectElement.appendChild(option);
        });

        document.getElementById('load-readout-button').disabled = false;
        document.getElementById('delete-readout-button').disabled = false;

    } catch (error) {
        console.error('Błąd podczas pobierania listy odczytów:', error);
        const selectElement = document.getElementById('readout-select');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Błąd sieci';
        selectElement.appendChild(option);
    }
}

// Funkcja do dynamicznego tworzenia wykresów
function createOrUpdateChart(chartId, label, unit, borderColor, dataPoints, chartType = 'line') {
    const ctx = document.getElementById(chartId);
    if (!ctx) return null;

    if (monitorStats[chartId] && monitorStats[chartId].chart) {
        // Jeśli wykres już istnieje, zaktualizuj dane
        monitorStats[chartId].chart.data.datasets[0].data = dataPoints;
        monitorStats[chartId].chart.update();
        return monitorStats[chartId].chart;
    } else {
        // Stwórz nowy wykres
        const newChart = new Chart(ctx, {
            type: chartType,
            data: {
                datasets: [{
                    label: label,
                    data: dataPoints,
                    borderColor: borderColor,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0 // Ukryj punkty na wykresie
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Wyłącz animacje dla szybszego renderowania
                },
                scales: {
                    x: {
                        type: 'linear', // Użyj skali liniowej dla indexu danych
                        title: {
                            display: true,
                            text: 'Punkt Czasowy'
                        },
                        min: 0, // Zawsze zaczynaj od 0
                        max: dataPoints.length > 0 ? dataPoints.length - 1 : 1, // Ustaw max na podstawie ilości danych
                        ticks: {
                            callback: function(value, index, values) {
                                return value; // Wyświetlaj numery punktów czasowych
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: unit
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
        return newChart;
    }
}

// Funkcja do renderowania wykresów
function renderCharts(historyData) {
    // Resetuj historie dla wszystkich statystyk
    for (const key in monitorStats) {
        monitorStats[key].history = [];
        // Zniszcz istniejące wykresy przed ponownym renderowaniem
        if (monitorStats[key].chart) {
            monitorStats[key].chart.destroy();
            monitorStats[key].chart = null;
        }
    }

    // Usuń dynamicznie dodane wykresy GPU
    // Zmieniono 'const' na 'let'
    let gpuChartContainer = document.getElementById('gpu-chart-container');
    if (gpuChartContainer) {
        gpuChartContainer.innerHTML = '';
    }
    
    // Zbuduj dane dla wykresów na podstawie historyData
    historyData.forEach((record, index) => {
        // Dodaj dane do historii dla istniejących statystyk
        for (const key in monitorStats) {
            if (record.hasOwnProperty(key)) {
                monitorStats[key].history.push({ x: index, y: record[key] });
            }
        }

        // Obsługa GPU - dodawanie dynamicznych statystyk i ich historii
        if (record.gpu_stats && record.gpu_stats.length > 0) {
            record.gpu_stats.forEach((gpu, gpuIndex) => {
                // Dodaj nowe statystyki GPU do monitorStats jeśli ich jeszcze nie ma
                const gpuLoadKey = `gpu-${gpuIndex}-load`;
                const gpuMemoryUsedKey = `gpu-${gpuIndex}-memoryUsed`;
                const gpuTemperatureKey = `gpu-${gpuIndex}-temperature`;

                if (!monitorStats[gpuLoadKey]) {
                    monitorStats[gpuLoadKey] = { label: `GPU ${gpuIndex} - Zużycie`, unit: '%', borderColor: getRandomColor(), history: [], chart: null, decimals: 0, chartType: 'line' };
                }
                if (!monitorStats[gpuMemoryUsedKey]) {
                    monitorStats[gpuMemoryUsedKey] = { label: `GPU ${gpuIndex} - Pamięć Używana`, unit: ' GB', borderColor: getRandomColor(), history: [], chart: null, decimals: 2, chartType: 'line' };
                }
                if (!monitorStats[gpuTemperatureKey]) {
                    monitorStats[gpuTemperatureKey] = { label: `GPU ${gpuIndex} - Temperatura`, unit: ' °C', borderColor: getRandomColor(), history: [], chart: null, decimals: 0, chartType: 'line' };
                }

                // Dodaj dane do historii GPU
                monitorStats[gpuLoadKey].history.push({ x: index, y: gpu.load });
                monitorStats[gpuMemoryUsedKey].history.push({ x: index, y: gpu.memoryUsed });
                monitorStats[gpuTemperatureKey].history.push({ x: index, y: gpu.temperature });
            });
        }
    });

    // Renderuj wykresy
    const chartGrid = document.getElementById('main-chart-grid');
    if (!chartGrid) {
        console.error("Element o ID 'main-chart-grid' nie został znaleziony.");
        return;
    }

    // Wykresy CPU, RAM, Disk, Net
    monitorStats.cpu_usage.chart = createOrUpdateChart(
        'perfCombinedChart',
        'Zużycie CPU',
        '%',
        monitorStats.cpu_usage.borderColor,
        monitorStats.cpu_usage.history
    );
    // Możesz tutaj dodać inne linie do tego samego wykresu, jeśli chcesz
    if (monitorStats.cpu_usage.chart) {
        // Dodaj zużycie RAM do tego samego wykresu
        const ramDataset = {
            label: monitorStats.ram_usage.label,
            data: monitorStats.ram_usage.history,
            borderColor: monitorStats.ram_usage.borderColor,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            id: 'ram_usage'
        };
        const diskDataset = {
            label: monitorStats.disk_usage.label,
            data: monitorStats.disk_usage.history,
            borderColor: monitorStats.disk_usage.borderColor,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            id: 'disk_usage'
        };
        // Dodaj dataset, tylko jeśli jeszcze go nie ma
        const existingRamDataset = monitorStats.cpu_usage.chart.data.datasets.find(ds => ds.id === 'ram_usage');
        if (!existingRamDataset) {
            monitorStats.cpu_usage.chart.data.datasets.push(ramDataset);
        } else {
            existingRamDataset.data = ramDataset.data;
        }
        const existingDiskDataset = monitorStats.cpu_usage.chart.data.datasets.find(ds => ds.id === 'disk_usage');
        if (!existingDiskDataset) {
            monitorStats.cpu_usage.chart.data.datasets.push(diskDataset);
        } else {
            existingDiskDataset.data = diskDataset.data;
        }
        monitorStats.cpu_usage.chart.update();
    }


    monitorStats.ram_free.chart = createOrUpdateChart(
        'ramFreeChart',
        monitorStats.ram_free.label,
        monitorStats.ram_free.unit,
        monitorStats.ram_free.borderColor,
        monitorStats.ram_free.history
    );

    monitorStats.net_download.chart = createOrUpdateChart(
        'netCombinedChart',
        monitorStats.net_download.label,
        monitorStats.net_download.unit,
        monitorStats.net_download.borderColor,
        monitorStats.net_download.history
    );
    if (monitorStats.net_download.chart) {
        const netUploadDataset = {
            label: monitorStats.net_upload.label,
            data: monitorStats.net_upload.history,
            borderColor: monitorStats.net_upload.borderColor,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            id: 'net_upload'
        };
        const existingNetUploadDataset = monitorStats.net_download.chart.data.datasets.find(ds => ds.id === 'net_upload');
        if (!existingNetUploadDataset) {
            monitorStats.net_download.chart.data.datasets.push(netUploadDataset);
        } else {
            existingNetUploadDataset.data = netUploadDataset.data;
        }
        monitorStats.net_download.chart.update();
    }

    monitorStats.net_connections.chart = createOrUpdateChart(
        'netConnectionsChart',
        monitorStats.net_connections.label,
        monitorStats.net_connections.unit,
        monitorStats.net_connections.borderColor,
        monitorStats.net_connections.history
    );

    // Renderowanie wykresów GPU
    if (gpuChartContainer) {
        // Clear previous GPU charts
        gpuChartContainer.innerHTML = '';
        // Iterate over monitorStats to find GPU related charts
        for (const key in monitorStats) {
            if (key.startsWith('gpu-') && key.endsWith('-load')) {
                const gpuIndex = key.split('-')[1];
                const gpuLoadKey = `gpu-${gpuIndex}-load`;
                const gpuMemoryUsedKey = `gpu-${gpuIndex}-memoryUsed`;
                const gpuTemperatureKey = `gpu-${gpuIndex}-temperature`;

                // Create a card for GPU charts
                const gpuCard = document.createElement('div');
                gpuCard.className = 'chart-card';
                gpuCard.innerHTML = `<h2>GPU ${gpuIndex} - Zużycie</h2><div class="chart-container-large"><canvas id="gpu${gpuIndex}LoadChart"></canvas></div>`;
                gpuChartContainer.appendChild(gpuCard);

                monitorStats[gpuLoadKey].chart = createOrUpdateChart(
                    `gpu${gpuIndex}LoadChart`,
                    monitorStats[gpuLoadKey].label,
                    monitorStats[gpuLoadKey].unit,
                    monitorStats[gpuLoadKey].borderColor,
                    monitorStats[gpuLoadKey].history
                );

                const gpuMemCard = document.createElement('div');
                gpuMemCard.className = 'chart-card';
                gpuMemCard.innerHTML = `<h2>GPU ${gpuIndex} - Pamięć Używana</h2><div class="chart-container-large"><canvas id="gpu${gpuIndex}MemoryUsedChart"></canvas></div>`;
                gpuChartContainer.appendChild(gpuMemCard);

                monitorStats[gpuMemoryUsedKey].chart = createOrUpdateChart(
                    `gpu${gpuIndex}MemoryUsedChart`,
                    monitorStats[gpuMemoryUsedKey].label,
                    monitorStats[gpuMemoryUsedKey].unit,
                    monitorStats[gpuMemoryUsedKey].borderColor,
                    monitorStats[gpuMemoryUsedKey].history
                );

                const gpuTempCard = document.createElement('div');
                gpuTempCard.className = 'chart-card';
                gpuTempCard.innerHTML = `<h2>GPU ${gpuIndex} - Temperatura</h2><div class="chart-container-large"><canvas id="gpu${gpuIndex}TemperatureChart"></canvas></div>`;
                gpuChartContainer.appendChild(gpuTempCard);

                monitorStats[gpuTemperatureKey].chart = createOrUpdateChart(
                    `gpu${gpuIndex}TemperatureChart`,
                    monitorStats[gpuTemperatureKey].label,
                    monitorStats[gpuTemperatureKey].unit,
                    monitorStats[gpuTemperatureKey].borderColor,
                    monitorStats[gpuTemperatureKey].history
                );
            }
        }
    }

    chartsInitialized = true;
}

// Funkcja pomocnicza do generowania losowych kolorów dla wykresów GPU
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Funkcja do ładowania wybranego odczytu
async function loadSelectedReadout() {
    const selectElement = document.getElementById('readout-select');
    const selectedReadoutId = selectElement.value;

    if (!selectedReadoutId) {
        alert('Proszę wybrać odczyt z listy.');
        return;
    }

    try {
        const response = await fetch(`${HISTORY_DATA_API_URL}${selectedReadoutId}`);
        const data = await response.json();

        if (data.status === 'error') {
            alert('Błąd podczas ładowania danych odczytu: ' + data.message);
            console.error('Błąd:', data.message);
            return;
        }

        renderCharts(data); // Renderuj wykresy z pobranych danych historycznych

    } catch (error) {
        console.error('Błąd podczas pobierania danych historycznych:', error);
        alert('Wystąpił błąd sieci lub serwera podczas ładowania danych.');
    }
}

// Funkcja do usuwania wybranego odczytu
async function deleteSelectedReadout() {
    const selectElement = document.getElementById('readout-select');
    const selectedReadoutId = selectElement.value;

    if (!selectedReadoutId) {
        alert('Proszę wybrać odczyt do usunięcia.');
        return;
    }

    if (!confirm('Czy na pewno chcesz usunąć ten odczyt?')) {
        return;
    }

    try {
        const response = await fetch(`${DELETE_READOUT_API_URL}${selectedReadoutId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert('Odczyt usunięty pomyślnie!');
            // Odśwież listę odczytów po usunięciu
            populateReadoutSelect();
            // Opcjonalnie: wyczyść wykresy po usunięciu odczytu
            clearAllCharts();
        } else {
            alert('Błąd podczas usuwania odczytu: ' + result.message);
        }
    } catch (error) {
        console.error('Błąd podczas wysyłania żądania usunięcia:', error);
        alert('Wystąpił błąd sieci lub serwera podczas usuwania odczytu.');
    }
}

function clearAllCharts() {
    for (const key in monitorStats) {
        if (monitorStats[key].chart) {
            monitorStats[key].chart.destroy();
            monitorStats[key].chart = null;
        }
        monitorStats[key].history = [];
    }
    // Wyczyść dynamicznie dodane wykresy GPU
    let gpuChartContainer = document.getElementById('gpu-chart-container'); // Zmieniono na 'let'
    if (gpuChartContainer) {
        gpuChartContainer.innerHTML = '';
    }
    chartsInitialized = false;
}


document.addEventListener('DOMContentLoaded', () => {
    populateReadoutSelect(); // Wypełnij listę odczytów przy ładowaniu strony

    const loadButton = document.getElementById('load-readout-button');
    if (loadButton) {
        loadButton.addEventListener('click', loadSelectedReadout);
    }

    const deleteButton = document.getElementById('delete-readout-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', deleteSelectedReadout);
    }
});