// charts-script.js
const API_URL = 'http://127.0.0.1:5000/api/stats';

let monitorStats = {
    // Te klucze odpowiadają ID canvas w charts.html
    cpu_usage: { label: 'Użycie CPU', unit: '%', borderColor: '#4A90E2', history: [], chart: null, decimals: 0 },
    cpu_clock: { label: 'Taktowanie CPU', unit: ' GHz', borderColor: '#5cb85c', history: [], chart: null, decimals: 2 },
    ram_usage: { label: 'Użycie RAM', unit: '%', borderColor: '#f0ad4e', history: [], chart: null, decimals: 0 },
    ram_free: { label: 'Wolna pamięć RAM', unit: ' GB', borderColor: '#5bc0de', history: [], chart: null, decimals: 2 },
    disk_usage: { label: 'Użycie Dysku', unit: '%', borderColor: '#d9534f', history: [], chart: null, decimals: 0 },
    disk_free: { label: 'Wolne miejsce na Dysku', unit: ' GB', borderColor: '#00bcd4', history: [], chart: null, decimals: 2 },
    net_download: { label: 'Pobieranie Sieci', unit: ' KB/s', borderColor: '#673ab7', history: [], chart: null, decimals: 0 },
    net_upload: { label: 'Wysyłanie Sieci', unit: ' KB/s', borderColor: '#ff9800', history: [], chart: null, decimals: 0 },
    net_connections: { label: 'Aktywne Połączenia', unit: '', borderColor: '#8bc34a', history: [], chart: null, decimals: 0 }
};

const MAX_CHART_DATA_POINTS = 60; // 60 sekund = 1 minuta historii
let chartDataIndex = 0; // Globalny licznik dla osi X

// Funkcja do inicjalizacji wykresu Chart.js
function initializeChart(ctx, label, unit, borderColor, dataHistory, statKeyForTooltip) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            // Etykiety X nie są potrzebne dla skali liniowej, dane są w obiektach {x, y}
            // labels: Array(dataHistory.length).fill(''),
            datasets: [{
                label: label,
                data: dataHistory, // Dane są teraz obiektami {x, y}
                borderColor: borderColor,
                tension: 0.2,
                fill: false,
                pointRadius: 0,
                id: statKeyForTooltip
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            scales: {
                x: {
                    type: 'linear', // Koniecznie liniowa
                    ticks: {
                        display: false // Ukryj etykiety
                    },
                    grid: {
                        display: false // Ukryj linie siatki
                    },
                    // Ustawienia dla zakresu osi X, aby pokazywać zawsze MAX_CHART_DATA_POINTS
                    min: 0,
                    max: MAX_CHART_DATA_POINTS -1
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: unit,
                        color: '#C0C0C0'
                    },
                    ticks: {
                        color: '#C0C0C0'
                    },
                    grid: {
                        color: '#3A4750'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#C0C0C0'
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                const statConfig = monitorStats[context.dataset.id];
                                if (statConfig) {
                                    label += context.parsed.y.toFixed(statConfig.decimals || 0) + statConfig.unit;
                                } else {
                                    label += context.parsed.y.toFixed(2);
                                }
                            }
                            return label;
                        },
                         title: function(context) {
                            // Wyświetlaj indeks jako "Odczyt: X"
                            if (context[0] && context[0].parsed && context[0].parsed.x !== null) {
                                return `Odczyt: ${context[0].parsed.x + 1}`; // +1 dla czytelności (nie zaczynając od 0)
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// Funkcja do inicjalizacji wszystkich kanwasów wykresów przed pierwszym pobraniem danych
function setupInitialCharts() {
    for (const key in monitorStats) {
        if (monitorStats.hasOwnProperty(key)) {
            const stat = monitorStats[key];
            const chartId = `${key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}Chart`;
            const ctx = document.getElementById(chartId);

            if (ctx && !stat.chart) {
                // Inicjuj wykres z pustą historią
                stat.chart = initializeChart(ctx.getContext('2d'), stat.label, stat.unit, stat.borderColor, stat.history, key);
            }
        }
    }
    const gpuChartsContainer = document.getElementById('gpu-charts-container');
    if (gpuChartsContainer) {
        gpuChartsContainer.innerHTML = '<p class="no-gpu-message">Brak dostępnych danych GPU lub brak kart NVIDIA.</p>'; // Resetuj komunikat
    }
}


// Funkcja do rysowania wszystkich wykresów
async function fetchAndRenderCharts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Aktualizacja wykresów dla CPU, RAM, Dysk, Sieć
        for (const key in monitorStats) {
            if (monitorStats.hasOwnProperty(key) && data.hasOwnProperty(key) && !key.startsWith('gpu-')) {
                const stat = monitorStats[key];
                stat.history.push({ x: chartDataIndex, y: parseFloat(data[key]) });
                if (stat.history.length > MAX_CHART_DATA_POINTS) {
                    stat.history.shift(); // Usuń najstarszy punkt
                }

                if (!stat.chart) {
                    const chartId = `${key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}Chart`;
                    const ctx = document.getElementById(chartId);
                    if (ctx) {
                        stat.chart = initializeChart(ctx.getContext('2d'), stat.label, stat.unit, stat.borderColor, stat.history, key);
                    }
                } else {
                    stat.chart.data.datasets[0].data = stat.history;
                    // Skalowanie osi X dynamicznie, aby zawsze pokazywać ostatnie N punktów
                    stat.chart.options.scales.x.min = Math.max(0, chartDataIndex - MAX_CHART_DATA_POINTS + 1);
                    stat.chart.options.scales.x.max = chartDataIndex + 1; // Zawsze o jeden więcej niż aktualny indeks
                    stat.chart.update('none'); // Użyj 'none' dla płynnych aktualizacji bez animacji
                }
            }
        }

        // Dynamiczne dodawanie i aktualizacja wykresów GPU
        const gpuChartsContainer = document.getElementById('gpu-charts-container');
        const currentGpuChartCardIds = new Set(); // Zbieramy ID kart, które powinny być
        const chartsToRemove = []; // Lista wykresów do usunięcia

        if (data.gpu_stats && data.gpu_stats.length > 0) {
            gpuChartsContainer.innerHTML = ''; // Wyczyść komunikat "Brak danych GPU"
            data.gpu_stats.forEach((gpu, index) => {
                const gpuId = `gpu-${index}`;
                const gpuName = gpu.name;

                const gpuChartKeys = [`${gpuId}-load`, `${gpuId}-memoryUsed`, `${gpuId}-temperature`];

                gpuChartKeys.forEach(key => {
                    const cardId = `${key}-card`;
                    currentGpuChartCardIds.add(cardId);

                    if (!monitorStats[key]) {
                        // Tworzymy nową konfigurację dla GPU.
                        let label, unit, borderColor, decimals;
                        if (key.includes('load')) { label = `${gpuName} Obciążenie`; unit = '%'; borderColor = '#FF5722'; decimals = 0; }
                        else if (key.includes('memoryUsed')) { label = `${gpuName} Pamięć Używana`; unit = ' GB'; borderColor = '#4CAF50'; decimals = 2; }
                        else if (key.includes('temperature')) { label = `${gpuName} Temperatura`; unit = ' °C'; borderColor = '#F44336'; decimals = 0; }

                        monitorStats[key] = { label, unit, borderColor, history: [], chart: null, decimals };

                        // Dodaj nową kartę GPU do DOM
                        const gpuHtml = `
                            <div class="chart-card gpu-chart-card" id="${cardId}">
                                <h2>${label}</h2>
                                <div class="chart-container-large">
                                    <canvas id="${key}-chart"></canvas>
                                </div>
                            </div>
                        `;
                        gpuChartsContainer.insertAdjacentHTML('beforeend', gpuHtml);

                        // Zainicjuj wykres zaraz po dodaniu canvasa
                        const ctx = document.getElementById(`${key}-chart`);
                        if (ctx) {
                            monitorStats[key].chart = initializeChart(ctx.getContext('2d'), monitorStats[key].label, monitorStats[key].unit, monitorStats[key].borderColor, monitorStats[key].history, key);
                        }
                    }
                });

                // Aktualizacja danych i wykresów GPU
                const updateGpuChartData = (key, value) => {
                    const stat = monitorStats[key];
                    if (stat) {
                        stat.history.push({ x: chartDataIndex, y: parseFloat(value) });
                        if (stat.history.length > MAX_CHART_DATA_POINTS) {
                            stat.history.shift();
                        }
                        if (stat.chart) {
                            stat.chart.data.datasets[0].data = stat.history;
                            stat.chart.options.scales.x.min = Math.max(0, chartDataIndex - MAX_CHART_DATA_POINTS + 1);
                            stat.chart.options.scales.x.max = chartDataIndex + 1;
                            stat.chart.update('none');
                        }
                    }
                };

                updateGpuChartData(`${gpuId}-load`, gpu.load);
                updateGpuChartData(`${gpuId}-memoryUsed`, gpu.memoryUsed);
                updateGpuChartData(`${gpuId}-temperature`, gpu.temperature);
            });

            // Usuń wykresy GPU, które nie są już aktywne
            document.querySelectorAll('.gpu-chart-card').forEach(cardElement => {
                if (!currentGpuChartCardIds.has(cardElement.id)) {
                    // Znajdź odpowiedni klucz w monitorStats, aby zniszczyć wykres
                    const canvasId = cardElement.querySelector('canvas').id;
                    const keyFromCanvasId = canvasId.replace('-chart', '');
                    if (monitorStats[keyFromCanvasId] && monitorStats[keyFromCanvasId].chart) {
                        monitorStats[keyFromCanvasId].chart.destroy();
                        delete monitorStats[keyFromCanvasId];
                    }
                    cardElement.remove(); // Usuń kartę z DOM
                }
            });

        } else {
            // Jeśli nie ma GPU, wyczyść wszystkie karty GPU i dodaj komunikat
            if (gpuChartsContainer) {
                gpuChartsContainer.innerHTML = '<p class="no-gpu-message">Brak dostępnych danych GPU lub brak kart NVIDIA.</p>';
            }
            // Usuń z monitorStats wszystkie klucze GPU i zniszcz ich wykresy
            for (const key in monitorStats) {
                if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-')) {
                    if (monitorStats[key].chart) {
                        monitorStats[key].chart.destroy();
                    }
                    delete monitorStats[key];
                }
            }
        }

        chartDataIndex++; // Zwiększ globalny indeks po każdym odczycie

    } catch (error) {
        console.error('Błąd podczas pobierania danych dla wykresów:', error);
        // Możesz tutaj dodać logikę wyświetlania komunikatu o błędzie na stronie wykresów
    }
}

// Funkcja do resetowania wszystkich wykresów
function resetAllCharts() {
    for (const key in monitorStats) {
        if (monitorStats.hasOwnProperty(key)) {
            const stat = monitorStats[key];
            if (stat.chart) {
                stat.chart.destroy();
                stat.chart = null;
            }
            stat.history = []; // Wyczyść historię danych
        }
    }
    // Wyczyść również dynamicznie dodane wykresy GPU i ich karty z DOM
    const gpuChartsContainer = document.getElementById('gpu-charts-container');
    if (gpuChartsContainer) {
        gpuChartsContainer.innerHTML = '<p class="no-gpu-message">Brak dostępnych danych GPU lub brak kart NVIDIA.</p>';
    }
    chartDataIndex = 0; // Zresetuj licznik indeksów
    setupInitialCharts(); // Zainicjuj puste wykresy ponownie
    fetchAndRenderCharts(); // Pobierz i wypełnij danymi
}


let chartUpdateInterval;
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdź, czy jesteśmy na stronie z wykresami
    if (document.querySelector('.container-charts')) {
        setupInitialCharts(); // Zainicjuj wykresy z pustymi danymi od razu
        fetchAndRenderCharts(); // Pobierz pierwsze dane natychmiast
        chartUpdateInterval = setInterval(fetchAndRenderCharts, 1000); // Uruchom interwał
    }
});

// Obsługa przycisku resetowania wykresów
const resetButtonCharts = document.getElementById('reset-stats-button-charts');
if (resetButtonCharts) {
    resetButtonCharts.addEventListener('click', resetAllCharts);
}

// Upewnij się, że interwał jest czyszczony, gdy użytkownik opuszcza stronę
window.addEventListener('beforeunload', () => {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }
});