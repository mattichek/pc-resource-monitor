// charts-script.js
// URL do API, z którego pobierane są statystyki
const API_URL = 'http://127.0.0.1:5000/api/stats';

// Obiekt monitorStats przechowuje konfigurację i historię danych dla każdego wykresu.
// Klucze odpowiadają identyfikatorom canvas w pliku charts.html lub są dynamicznie dodawane dla GPU.
let monitorStats = {
    // Statystyki CPU
    cpu_usage: { label: 'Użycie CPU', unit: '%', borderColor: '#4A90E2', history: [], chart: null, decimals: 0 },
    cpu_clock: { label: 'Taktowanie CPU', unit: ' GHz', borderColor: '#5cb85c', history: [], chart: null, decimals: 2 },
    // Statystyki RAM
    ram_usage: { label: 'Użycie RAM', unit: '%', borderColor: '#f0ad4e', history: [], chart: null, decimals: 0 },
    ram_free: { label: 'Wolna pamięć RAM', unit: ' GB', borderColor: '#5bc0de', history: [], chart: null, decimals: 2 },
    // Statystyki Dysku
    disk_usage: { label: 'Użycie Dysku', unit: '%', borderColor: '#d9534f', history: [], chart: null, decimals: 0 },
    disk_free: { label: 'Wolne miejsce na Dysku', unit: ' GB', borderColor: '#00bcd4', history: [], chart: null, decimals: 2 },
    // Statystyki Sieci
    net_download: { label: 'Pobieranie Sieci', unit: ' KB/s', borderColor: '#673ab7', history: [], chart: null, decimals: 0 },
    net_upload: { label: 'Wysyłanie Sieci', unit: ' KB/s', borderColor: '#ff9800', history: [], chart: null, decimals: 0 },
    net_connections: { label: 'Aktywne Połączenia', unit: '', borderColor: '#8bc34a', history: [], chart: null, decimals: 0 }
};

const MAX_CHART_DATA_POINTS = 60; // Maksymalna liczba punktów danych na wykresie (60 sekund = 1 minuta historii)
let chartDataIndex = 0; // Globalny licznik dla osi X wykresów, symuluje czas

/**
 * Inicjalizuje nowy wykres Chart.js.
 * @param {HTMLCanvasElement} ctx - Kontekst renderowania canvasa.
 * @param {string} label - Etykieta zestawu danych (wyświetlana w legendzie).
 * @param {string} unit - Jednostka miary dla osi Y.
 * @param {string} borderColor - Kolor linii wykresu.
 * @param {Array<Object>} dataHistory - Tablica obiektów {x, y} reprezentujących historię danych.
 * @param {string} statKeyForTooltip - Klucz statystyki używany do pobierania konfiguracji formatowania z monitorStats.
 * @returns {Chart} - Utworzony obiekt wykresu Chart.js.
 */
function initializeChart(ctx, label, unit, borderColor, dataHistory, statKeyForTooltip) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: label,
                data: dataHistory, // Dane są teraz obiektami {x, y} dla skali liniowej
                borderColor: borderColor,
                tension: 0.2, // Zaokrąglenie linii wykresu
                fill: false, // Brak wypełnienia pod linią
                pointRadius: 0, // Ukryj punkty danych
                id: statKeyForTooltip // Używane w tooltipie do pobrania konfiguracji formatowania
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Pozwala canvasowi dostosować się do rozmiaru kontenera
            animation: {
                duration: 0 // Wyłącz animacje dla płynnych aktualizacji
            },
            scales: {
                x: {
                    type: 'linear', // Skala liniowa dla osi czasu
                    ticks: {
                        display: false // Ukryj etykiety osi X
                    },
                    grid: {
                        display: false // Ukryj linie siatki osi X
                    },
                    // Ustawienia dla zakresu osi X, aby zawsze pokazywać ostatnie MAX_CHART_DATA_POINTS
                    min: 0,
                    max: MAX_CHART_DATA_POINTS - 1
                },
                y: {
                    beginAtZero: true, // Oś Y zaczyna się od zera
                    title: {
                        display: true,
                        text: unit, // Jednostka wyświetlana jako tytuł osi Y
                        color: '#C0C0C0' // Kolor tytułu osi
                    },
                    ticks: {
                        color: '#C0C0C0' // Kolor etykiet osi Y
                    },
                    grid: {
                        color: '#3A4750' // Kolor linii siatki osi Y
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#C0C0C0' // Kolor etykiet legendy
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index', // Wyświetlaj tooltip dla wszystkich punktów na tym samym indeksie X
                    intersect: false, // Tooltip pojawia się, nawet jeśli kursor nie przecina punktu
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
                                    label += context.parsed.y.toFixed(2); // Domyślne formatowanie
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

/**
 * Inicjalizuje wszystkie stałe wykresy (CPU, RAM, Dysk, Sieć) przed pierwszym pobraniem danych.
 */
function setupInitialCharts() {
    for (const key in monitorStats) {
        // Pomijamy dynamiczne klucze GPU, które będą dodawane później
        if (monitorStats.hasOwnProperty(key) && !key.startsWith('gpu-')) {
            const stat = monitorStats[key];
            // Konwertuje nazwę statystyki (np. cpu_usage) na ID canvasa (cpuUsageChart)
            const chartId = `${key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}Chart`;
            const ctx = document.getElementById(chartId);

            if (ctx && !stat.chart) {
                // Inicjuj wykres z pustą historią
                stat.chart = initializeChart(ctx.getContext('2d'), stat.label, stat.unit, stat.borderColor, stat.history, key);
            }
        }
    }
    // Komunikat o braku GPU będzie zarządzany w fetchAndRenderCharts
}

/**
 * Funkcja do pobierania danych z API i aktualizowania wszystkich wykresów.
 */
async function fetchAndRenderCharts() {
    const mainChartGrid = document.getElementById('main-chart-grid'); // Pobierz główny kontener siatki
    if (!mainChartGrid) {
        console.error("Główny kontener siatki wykresów nie został znaleziony.");
        return;
    }

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Aktualizacja wykresów dla CPU, RAM, Dysk, Sieć
        for (const key in monitorStats) {
            // Upewnij się, że aktualizujemy tylko stałe klucze, które mają odpowiednie dane z API
            if (monitorStats.hasOwnProperty(key) && data.hasOwnProperty(key) && !key.startsWith('gpu-')) {
                const stat = monitorStats[key];
                // Dodaj nowy punkt danych do historii
                stat.history.push({ x: chartDataIndex, y: parseFloat(data[key]) });
                // Usuń najstarszy punkt, jeśli historia przekracza MAX_CHART_DATA_POINTS
                if (stat.history.length > MAX_CHART_DATA_POINTS) {
                    stat.history.shift();
                }

                // Sprawdź, czy wykres już istnieje, a jeśli nie, zainicjuj go
                if (!stat.chart) {
                    const chartId = `${key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}Chart`;
                    const ctx = document.getElementById(chartId);
                    if (ctx) {
                        stat.chart = initializeChart(ctx.getContext('2d'), stat.label, stat.unit, stat.borderColor, stat.history, key);
                    }
                } else {
                    // Zaktualizuj dane wykresu i zakres osi X
                    stat.chart.data.datasets[0].data = stat.history;
                    stat.chart.options.scales.x.min = Math.max(0, chartDataIndex - MAX_CHART_DATA_POINTS + 1);
                    stat.chart.options.scales.x.max = chartDataIndex + 1;
                    stat.chart.update('none'); // Użyj 'none' dla płynnych aktualizacji bez animacji
                }
            }
        }

        // Dynamiczne dodawanie i aktualizacja wykresów GPU
        // Zbieramy ID kart GPU, które powinny być aktualnie wyświetlane na podstawie danych z API
        const currentGpuChartCardIds = new Set();

        if (data.gpu_stats && data.gpu_stats.length > 0) {
            // Jeśli są dane GPU, usuń komunikat "Brak danych GPU" jeśli istnieje
            const noGpuMessage = mainChartGrid.querySelector('.no-gpu-message');
            if (noGpuMessage) {
                noGpuMessage.remove();
            }

            data.gpu_stats.forEach((gpu, index) => {
                const gpuId = `gpu-${index}`; // Unikalny identyfikator dla każdej karty GPU
                const gpuName = gpu.name;

                // Klucze dla poszczególnych statystyk GPU
                const gpuChartKeys = [`${gpuId}-load`, `${gpuId}-memoryUsed`, `${gpuId}-temperature`];

                gpuChartKeys.forEach(key => {
                    const cardId = `${key}-card`; // ID dla karty kontenera wykresu
                    currentGpuChartCardIds.add(cardId); // Dodaj do zbioru aktywnych kart

                    // Sprawdź, czy karta wykresu dla tej statystyki GPU już istnieje w DOM
                    let existingCard = document.getElementById(cardId);

                    // Jeśli karta nie istnieje, stwórz ją
                    if (!existingCard) {
                        // Definiuj konfigurację dla nowej statystyki GPU
                        let label, unit, borderColor, decimals;
                        if (key.includes('load')) { label = `${gpuName} </br> Obciążenie`; unit = '%'; borderColor = '#FF5722'; decimals = 0; }
                        else if (key.includes('memoryUsed')) { label = `${gpuName} </br> Pamięć Używana`; unit = ' GB'; borderColor = '#4CAF50'; decimals = 2; }
                        else if (key.includes('temperature')) { label = `${gpuName} </br> Temperatura`; unit = ' °C'; borderColor = '#F44336'; decimals = 0; }

                        // Dodaj nową konfigurację do monitorStats
                        monitorStats[key] = { label, unit, borderColor, history: [], chart: null, decimals };

                        // Twórz i dodaj HTML nowej karty wykresu do DOM
                        const gpuHtml = `
                            <div class="chart-card gpu-chart-card" id="${cardId}">
                                <h2>${label}</h2>
                                <div class="chart-container-large">
                                    <canvas id="${key}-chart"></canvas>
                                </div>
                            </div>
                        `;
                        mainChartGrid.insertAdjacentHTML('beforeend', gpuHtml); // Wstaw bezpośrednio do głównej siatki

                        // Po dodaniu canvasa do DOM, zainicjuj wykres
                        const ctx = document.getElementById(`${key}-chart`);
                        if (ctx) {
                            monitorStats[key].chart = initializeChart(ctx.getContext('2d'), monitorStats[key].label, monitorStats[key].unit, monitorStats[key].borderColor, monitorStats[key].history, key);
                        }
                    }

                    // Aktualizacja danych i wykresów GPU (zarówno dla nowo utworzonych, jak i istniejących)
                    const stat = monitorStats[key];
                    let currentValue;
                    if (key.includes('load')) currentValue = gpu.load;
                    else if (key.includes('memoryUsed')) currentValue = gpu.memoryUsed;
                    else if (key.includes('temperature')) currentValue = gpu.temperature;

                    if (stat && typeof currentValue !== 'undefined') {
                        stat.history.push({ x: chartDataIndex, y: parseFloat(currentValue) });
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
                });
            });

            // Usuń wykresy GPU (i ich karty), które nie są już aktywne (np. odłączono kartę graficzną)
            mainChartGrid.querySelectorAll('.gpu-chart-card').forEach(cardElement => { // Zapytaj wewnątrz głównej siatki
                if (!currentGpuChartCardIds.has(cardElement.id)) {
                    // Znajdź odpowiedni klucz w monitorStats, aby zniszczyć wykres
                    const canvasId = cardElement.querySelector('canvas').id;
                    const keyFromCanvasId = canvasId.replace('-chart', ''); // Odzyskaj klucz statystyki
                    if (monitorStats[keyFromCanvasId] && monitorStats[keyFromCanvasId].chart) {
                        monitorStats[keyFromCanvasId].chart.destroy(); // Zniszcz instancję wykresu
                        delete monitorStats[keyFromCanvasId]; // Usuń z monitorStats
                    }
                    cardElement.remove(); // Usuń kartę z DOM
                }
            });

        } else {
            // Jeśli nie ma danych GPU z API, wyczyść wszystkie karty GPU z DOM
            mainChartGrid.querySelectorAll('.gpu-chart-card').forEach(card => card.remove());
            // Dodaj komunikat o braku danych GPU, jeśli jeszcze go nie ma
            const noGpuMessage = mainChartGrid.querySelector('.no-gpu-message');
            if (!noGpuMessage) {
                mainChartGrid.insertAdjacentHTML('beforeend', '<p class="no-gpu-message">Brak dostępnych danych GPU lub brak kart NVIDIA.</p>');
            }
            // Usuń z monitorStats wszystkie dynamiczne klucze GPU i zniszcz ich wykresy
            for (const key in monitorStats) {
                if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-')) {
                    if (monitorStats[key].chart) {
                        monitorStats[key].chart.destroy();
                    }
                    delete monitorStats[key];
                }
            }
        }

        chartDataIndex++; // Zwiększ globalny indeks po każdym pomyślnym odczycie danych

    } catch (error) {
        console.error('Błąd podczas pobierania danych dla wykresów:', error);
        // Wyświetl komunikat o błędzie na stronie wykresów
        const mainChartGrid = document.getElementById('main-chart-grid');
        if (mainChartGrid) {
            // Usuń wszystkie istniejące karty GPU i dodaj komunikat o błędzie
            mainChartGrid.querySelectorAll('.gpu-chart-card').forEach(card => card.remove());
            const errorMessage = mainChartGrid.querySelector('.no-gpu-message.error-message');
            if (!errorMessage) { // Dodaj komunikat tylko jeśli go jeszcze nie ma
                mainChartGrid.insertAdjacentHTML('beforeend', '<p class="no-gpu-message error-message">Wystąpił błąd podczas ładowania danych GPU. Sprawdź połączenie z API.</p>');
            }
        }
    }
}

/**
 * Resetuje wszystkie wykresy, czyści historię danych i niszczy instancje wykresów.
 */
function resetAllCharts() {
    // Iteruj przez wszystkie klucze w monitorStats
    for (const key in monitorStats) {
        if (monitorStats.hasOwnProperty(key)) {
            const stat = monitorStats[key];
            if (stat.chart) {
                stat.chart.destroy(); // Zniszcz instancję wykresu
                stat.chart = null; // Ustaw na null, aby móc ją ponownie zainicjować
            }
            stat.history = []; // Wyczyść historię danych dla tej statystyki
        }
    }

    const mainChartGrid = document.getElementById('main-chart-grid');
    if (mainChartGrid) {
        // Wyczyść wszystkie dynamicznie dodane karty GPU z DOM
        mainChartGrid.querySelectorAll('.gpu-chart-card').forEach(card => card.remove());
        // Dodaj początkowy komunikat o braku GPU
        const noGpuMessage = mainChartGrid.querySelector('.no-gpu-message');
        if (!noGpuMessage) { // Dodaj tylko jeśli nie istnieje
            mainChartGrid.insertAdjacentHTML('beforeend', '<p class="no-gpu-message">Brak dostępnych danych GPU lub brak kart NVIDIA.</p>');
        }
    }
    
    // Po zresetowaniu wszystkich statystyk w monitorStats, musimy usunąć
    // wszystkie dynamiczne klucze GPU, które mogły pozostać.
    for (const key in monitorStats) {
        if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-')) {
            delete monitorStats[key];
        }
    }

    chartDataIndex = 0; // Zresetuj globalny licznik indeksów
    setupInitialCharts(); // Zainicjuj stałe wykresy z pustymi danymi ponownie
    fetchAndRenderCharts(); // Pobierz i wypełnij danymi natychmiast po resecie
}

let chartUpdateInterval; // Zmienna do przechowywania identyfikatora interwału

// Nasłuchuj zdarzenia załadowania DOM
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdź, czy jesteśmy na stronie z wykresami (np. poprzez klasę kontenera)
    if (document.querySelector('.container-charts')) {
        setupInitialCharts(); // Zainicjuj wykresy z pustymi danymi od razu
        fetchAndRenderCharts(); // Pobierz pierwsze dane natychmiast
        chartUpdateInterval = setInterval(fetchAndRenderCharts, 1000); // Uruchom cykliczne pobieranie danych co sekundę
    }
});

// Obsługa przycisku resetowania wykresów
const resetButtonCharts = document.getElementById('reset-stats-button-charts');
if (resetButtonCharts) {
    resetButtonCharts.addEventListener('click', resetAllCharts);
}

// Upewnij się, że interwał jest czyszczony, gdy użytkownik opuszcza stronę, aby zapobiec wyciekom pamięci
window.addEventListener('beforeunload', () => {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }
});