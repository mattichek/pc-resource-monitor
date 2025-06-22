// history-charts-script.js
const API_URL = '/api/stats';
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

// Funkcja do dynamicznego tworzenia lub aktualizowania wykresów
function createOrUpdateChart(chartId, label, unit, borderColor, dataPoints, chartType = 'line', datasets = null) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return null;

    // Check if a chart instance already exists for this canvas
    if (Chart.getChart(ctx)) {
        // If it exists, destroy it before creating a new one to prevent duplicates
        Chart.getChart(ctx).destroy();
    }

    const chartData = {
        datasets: datasets || [{ // Use provided datasets or default to a single one
            label: label,
            data: dataPoints,
            borderColor: borderColor,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0 // Ukryj punkty na wykresie
        }]
    };

    const newChart = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Wyłącz animacje dla szybszego renderowania
            },
            scales: {
                x: {
                    // *** ZMIANY TUTAJ ***
                    display: true, // Zachowaj 'display: true', aby oś istniała
                    type: 'linear',
                    title: {
                        display: false // Ukryj tytuł osi X
                    },
                    min: 0,
                    max: dataPoints.length > 0 ? dataPoints.length - 1 : 1,
                    ticks: {
                        display: false // Ukryj etykiety (liczby) na osi X
                    },
                    grid: {
                        display: false // Ukryj linie siatki na osi X
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

    const mainChartGrid = document.getElementById('main-chart-grid');
    if (!mainChartGrid) {
        console.error("Element o ID 'main-chart-grid' nie został znaleziony.");
        return;
    }

    // Usuń dynamicznie dodane karty wykresów GPU
    let dynamicChartCards = mainChartGrid.querySelectorAll('.chart-card[data-dynamic-gpu="true"]');
    dynamicChartCards.forEach(card => card.remove());

    // Resetuj monitorStats dla dynamicznych wpisów GPU dla każdego nowego ładowania danych
    // To ważne, aby zapewnić prawidłowe niszczenie i tworzenie wykresów.
    // Usuwamy tylko klucze związane z GPU, ponieważ podstawowe są statyczne.
    for (const key in monitorStats) {
        if (key.startsWith('gpu-')) {
            delete monitorStats[key];
        }
    }

    // Zbuduj dane dla wykresów na podstawie historyData
    historyData.forEach((record, index) => {
        // Dodaj dane do historii dla istniejących statystyk (nie-GPU)
        for (const key in monitorStats) {
            if (record.hasOwnProperty(key) && !key.startsWith('gpu-')) {
                monitorStats[key].history.push({ x: index, y: record[key] });
            }
        }

        // Obsługa GPU - dodawanie dynamicznych statystyk i ich historii
        if (record.gpu_stats && record.gpu_stats.length > 0) {
            record.gpu_stats.forEach((gpu, gpuIndex) => {
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

                monitorStats[gpuLoadKey].history.push({ x: index, y: gpu.load });
                monitorStats[gpuMemoryUsedKey].history.push({ x: index, y: gpu.memoryUsed });
                monitorStats[gpuTemperatureKey].history.push({ x: index, y: gpu.temperature });
            });
        }
    });

    // Renderuj wykresy

    // 1. Wykres Wykorzystania Podzespołów (perfCombinedChart: CPU, RAM, Dysk, Zużycie GPU)
    const perfCombinedChartCtx = document.getElementById('perfCombinedChart');
    if (perfCombinedChartCtx) {
        const perfDatasets = [
            {
                label: monitorStats.cpu_usage.label,
                data: monitorStats.cpu_usage.history,
                borderColor: monitorStats.cpu_usage.borderColor,
                borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
            },
            {
                label: monitorStats.ram_usage.label,
                data: monitorStats.ram_usage.history,
                borderColor: monitorStats.ram_usage.borderColor,
                borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
            },
            {
                label: monitorStats.disk_usage.label,
                data: monitorStats.disk_usage.history,
                borderColor: monitorStats.disk_usage.borderColor,
                borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
            }
        ];

        // Dodaj Zużycie GPU do tego samego wykresu
        for (const key in monitorStats) {
            if (key.startsWith('gpu-') && key.endsWith('-load')) {
                perfDatasets.push({
                    label: monitorStats[key].label,
                    data: monitorStats[key].history,
                    borderColor: monitorStats[key].borderColor,
                    borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, yAxisID: 'y'
                });
            }
        }

        monitorStats.cpu_usage.chart = createOrUpdateChart(
            'perfCombinedChart',
            '', // Etykieta nieużywana, bo mamy wiele datasetów
            '%',
            '', // Kolor nieużywany
            historyData.map((_, i) => i), // Dummy data for x-axis scale
            'line',
            perfDatasets
        );
    }

    // 2. Wykres Wolnej pamięci RAM (ramFreeChart)
    monitorStats.ram_free.chart = createOrUpdateChart(
        'ramFreeChart',
        monitorStats.ram_free.label,
        monitorStats.ram_free.unit,
        monitorStats.ram_free.borderColor,
        monitorStats.ram_free.history
    );

    // 3. Wykres Ruchu Sieciowego (netCombinedChart: Pobieranie, Wysyłanie)
    const netCombinedChartCtx = document.getElementById('netCombinedChart');
    if (netCombinedChartCtx) {
        const netDatasets = [
            {
                label: monitorStats.net_download.label,
                data: monitorStats.net_download.history,
                borderColor: monitorStats.net_download.borderColor,
                borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0
            },
            {
                label: monitorStats.net_upload.label,
                data: monitorStats.net_upload.history,
                borderColor: monitorStats.net_upload.borderColor,
                borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0
            }
        ];
        monitorStats.net_download.chart = createOrUpdateChart(
            'netCombinedChart',
            '', // Etykieta nieużywana
            monitorStats.net_download.unit,
            '', // Kolor nieużywany
            historyData.map((_, i) => i), // Dummy data for x-axis scale
            'line',
            netDatasets
        );
    }

    // 4. Wykres Aktywnych Połączeń Sieciowych (netConnectionsChart)
    monitorStats.net_connections.chart = createOrUpdateChart(
        'netConnectionsChart',
        monitorStats.net_connections.label,
        monitorStats.net_connections.unit,
        monitorStats.net_connections.borderColor,
        monitorStats.net_connections.history
    );


    // 5. Dynamiczne generowanie wykresów Pamięci Używanej i Temperatury GPU
    // Szukamy po wszystkich kluczach w monitorStats, które zaczynają się od 'gpu-'
    // i kończą na '-memoryUsed' lub '-temperature'.
    const gpuChartKeys = Object.keys(monitorStats).filter(key =>
        key.startsWith('gpu-') && (key.endsWith('-memoryUsed') || key.endsWith('-temperature'))
    );

    gpuChartKeys.forEach(key => {
        const gpuIndex = key.split('-')[1];
        const statType = key.split('-')[2]; // 'memoryUsed' or 'temperature'
        const chartLabel = monitorStats[key].label;
        const chartUnit = monitorStats[key].unit;
        const chartColor = monitorStats[key].borderColor;
        const chartHistory = monitorStats[key].history;
        const chartCanvasId = `gpu${gpuIndex}${statType.charAt(0).toUpperCase() + statType.slice(1)}Chart`;

        // Tworzymy nową kartę wykresu (div.chart-card)
        const gpuCard = document.createElement('div');
        gpuCard.className = 'chart-card';
        gpuCard.setAttribute('data-dynamic-gpu', 'true'); // Oznaczamy jako dynamiczny dla łatwego usunięcia
        gpuCard.innerHTML = `<h2>${chartLabel}</h2><div class="chart-container-large"><canvas id="${chartCanvasId}"></canvas></div>`;
        mainChartGrid.appendChild(gpuCard); // Dodajemy do głównego kontenera

        // Tworzymy wykres
        monitorStats[key].chart = createOrUpdateChart(
            chartCanvasId,
            chartLabel,
            chartUnit,
            chartColor,
            chartHistory
        );
    });

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
    // Usuń wszystkie dynamicznie dodane karty wykresów GPU
    const mainChartGrid = document.getElementById('main-chart-grid');
    if (mainChartGrid) {
        let dynamicChartCards = mainChartGrid.querySelectorAll('.chart-card[data-dynamic-gpu="true"]');
        dynamicChartCards.forEach(card => card.remove());
    }
    chartsInitialized = false;
}


document.addEventListener('DOMContentLoaded', () => {

    setInterval(async () => {
        const response = await fetch(API_URL);
        const data = await response.json();
        updateAlerts(data); // Aktualizacja alertów
    }, 1000); 
    
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

function updateAlerts(data) {
    // CPU
    const cpuAlert = document.getElementById('alert-cpu');
    const cpuValue = document.querySelector('#alert-cpu .alert-value');
    cpuValue.textContent = `${data.cpu_usage}%`;
    
    if (data.cpu_usage > 90) {
        cpuAlert.classList.add('alert-danger');
        cpuAlert.classList.remove('alert-warning');
    } else if (data.cpu_usage > 70) {
        cpuAlert.classList.add('alert-warning');
        cpuAlert.classList.remove('alert-danger');
    } else {
        cpuAlert.classList.remove('alert-warning', 'alert-danger');
    }

    // RAM
    const ramAlert = document.getElementById('alert-ram');
    const ramValue = document.querySelector('#alert-ram .alert-value');
    ramValue.textContent = `${data.ram_usage}%`;
    
    if (data.ram_usage > 85) {
        ramAlert.classList.add('alert-danger');
        ramAlert.classList.remove('alert-warning');
    } else if (data.ram_usage > 70) {
        ramAlert.classList.add('alert-warning');
        ramAlert.classList.remove('alert-danger');
    } else {
        ramAlert.classList.remove('alert-warning', 'alert-danger');
    }

    // Dysk
    const diskAlert = document.getElementById('alert-disk');
    const diskValue = document.querySelector('#alert-disk .alert-value');
    diskValue.textContent = `${data.disk_usage}%`;
    
    if (data.disk_usage > 90) {
        diskAlert.classList.add('alert-danger');
        diskAlert.classList.remove('alert-warning');
    } else if (data.disk_usage > 80) {
        diskAlert.classList.add('alert-warning');
        diskAlert.classList.remove('alert-danger');
    } else {
        diskAlert.classList.remove('alert-warning', 'alert-danger');
    }

    // GPU Load
    const gpuAlert = document.getElementById('alert-gpu');
    const gpuValue = document.querySelector('#alert-gpu .alert-value');
    
    // GPU Temperature
    const gpuTempAlert = document.getElementById('alert-gpu-temp');
    const gpuTempValue = document.querySelector('#alert-gpu-temp .alert-value');
    
    if (data.gpu_stats && data.gpu_stats.length > 0) {
        const gpuLoad = data.gpu_stats[0].load;
        const gpuTemp = data.gpu_stats[0].temperature;
        
        // Aktualizacja obciążenia GPU
        gpuValue.textContent = `${gpuLoad}%`;
        
        if (gpuLoad > 90) {
            gpuAlert.classList.add('alert-danger');
            gpuAlert.classList.remove('alert-warning');
        } else if (gpuLoad > 80) {
            gpuAlert.classList.add('alert-warning');
            gpuAlert.classList.remove('alert-danger');
        } else {
            gpuAlert.classList.remove('alert-warning', 'alert-danger');
        }
        
        // Aktualizacja temperatury GPU
        gpuTempValue.textContent = `${gpuTemp}°C`;
        
        if (gpuTemp > 85) {
            gpuTempAlert.classList.add('alert-danger');
            gpuTempAlert.classList.remove('alert-warning');
        } else if (gpuTemp > 75) {
            gpuTempAlert.classList.add('alert-warning');
            gpuTempAlert.classList.remove('alert-danger');
        } else {
            gpuTempAlert.classList.remove('alert-warning', 'alert-danger');
        }
    } else {
        gpuValue.textContent = "Brak";
        gpuAlert.classList.remove('alert-warning', 'alert-danger');
        gpuTempValue.textContent = "Brak";
        gpuTempAlert.classList.remove('alert-warning', 'alert-danger');
    }
}