// saved_charts_script.js
const SAVED_API_URL = '/api/get_saved_stats/';

let savedMonitorCharts = {}; // Obiekt do przechowywania instancji wykresów Chart.js

// Konfiguracja dla statystyk, używana do dynamicznego tworzenia wykresów
let savedChartConfig = {
    cpu_usage: { label: 'Użycie CPU', unit: '%', borderColor: '#4A90E2', decimals: 0 },
    cpu_clock: { label: 'Taktowanie CPU', unit: ' GHz', borderColor: '#5cb85c', decimals: 2 },
    ram_usage: { label: 'Użycie RAM', unit: '%', borderColor: '#f0ad4e', decimals: 0 },
    ram_free: { label: 'Wolna pamięć RAM', unit: ' GB', borderColor: '#5bc0de', decimals: 2 },
    disk_usage: { label: 'Użycie Dysku', unit: '%', borderColor: '#d9534f', decimals: 0 },
    disk_free: { label: 'Wolne miejsce na Dysku', unit: ' GB', borderColor: '#00bcd4', decimals: 2 },
    net_download: { label: 'Pobieranie Sieci', unit: ' KB/s', borderColor: '#673AB7', decimals: 2 },
    net_upload: { label: 'Wysyłanie Sieci', unit: ' KB/s', borderColor: '#FF5722', decimals: 2 },
    net_connections: { label: 'Aktywne Połączenia Sieciowe', unit: '', borderColor: '#9C27B0', decimals: 0 },
};

/**
 * Konwertuje string z snake_case na CamelCase i kapitalizuje pierwszą literę.
 * Np. "cpu_usage" -> "CpuUsage"
 * @param {string} str - String do konwersji.
 * @returns {string} Skonwertowany string.
 */
function snakeToCamelCaseAndCapitalize(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
              .charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Funkcja pomocnicza do kapitalizowania pierwszej litery ciągu (używana głównie dla GPU statConfig.key)
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Funkcja pomocnicza do tworzenia/aktualizowania wykresu Chart.js.
 * @param {string} chartId - ID elementu canvas.
 * @param {string} label - Etykieta zestawu danych.
 * @param {string} unit - Jednostka miary.
 * @param {string} borderColor - Kolor linii wykresu.
 * @param {Array<number>} data - Dane liczbowe dla wykresu.
 * @param {Array<Date>} labels - Etykiety osi X (timestampy jako obiekty Date).
 * @param {number} decimals - Liczba miejsc po przecinku do wyświetlenia.
 * @param {string} chartType - Typ wykresu (domyślnie 'line').
 */
function createOrUpdateChart(chartId, label, unit, borderColor, data, labels, decimals, chartType = 'line') {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        console.error(`Nie znaleziono elementu canvas o id: ${chartId}`);
        return;
    }

    const chartContext = ctx.getContext('2d');

    // Jeśli wykres już istnieje, zniszcz go, aby uniknąć błędów
    if (savedMonitorCharts[chartId]) {
        savedMonitorCharts[chartId].destroy();
        console.log(`Zniszczono istniejący wykres: ${chartId}`);
    }

    savedMonitorCharts[chartId] = new Chart(chartContext, {
        type: chartType,
        data: {
            labels: labels, // Etykiety czasu jako obiekty Date
            datasets: [{
                label: label, // Bez jednostki w labelu, bo dodajemy ją w tooltipie i tytule osi Y
                data: data,
                borderColor: borderColor,
                backgroundColor: 'rgba(74, 144, 226, 0.2)', // Przykład koloru tła
                borderWidth: 1,
                fill: false,
                tension: 0.1,
                pointRadius: 0 // Ukryj punkty danych
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Wyłącz animacje dla płynnych aktualizacji
            },
            scales: {
                x: {
                    type: 'time', // Użyj skali czasowej
                    time: {
                        unit: 'second', // lub 'minute' w zależności od interwału
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss',
                        displayFormats: {
                            second: 'HH:mm:ss', // Format wyświetlania na osi
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Czas',
                        color: '#C0C0C0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Jasne linie siatki
                    },
                    ticks: {
                        color: '#C0C0C0' // Kolor etykiet osi X
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: label + unit, // Tytuł osi Y z etykietą i jednostką
                        color: '#C0C0C0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Jasne linie siatki
                    },
                    ticks: {
                        color: '#C0C0C0', // Kolor etykiet osi Y
                        callback: function(value) {
                            return value.toFixed(decimals) + unit;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#C0C0C0' // Kolor legendy
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let tooltipLabel = context.dataset.label || '';
                            if (tooltipLabel) {
                                tooltipLabel += ': ';
                            }
                            if (context.parsed.y !== null) {
                                tooltipLabel += context.parsed.y.toFixed(decimals) + unit;
                            }
                            return tooltipLabel;
                        },
                        title: function(context) {
                            // Wyświetlaj czas w tooltipie
                            if (context[0] && context[0].parsed && context[0].parsed.x !== null) {
                                return new Date(context[0].parsed.x).toLocaleString();
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
    console.log(`Zainicjalizowano/Zaktualizowano wykres: ${chartId}`);
}

/**
 * Funkcja renderująca wszystkie wykresy na podstawie załadowanych danych.
 * @param {Object} savedData - Obiekt zawierający załadowane dane statystyk.
 */
function renderCharts(savedData) {
    const noDataMessageElement = document.getElementById('no-data-message');
    const savedChartGridElement = document.getElementById('saved-chart-grid');
    const gpuChartsContainer = document.getElementById('saved-gpu-charts-container');

    noDataMessageElement.style.display = 'none'; // Ukryj komunikat o braku danych
    savedChartGridElement.style.display = 'grid'; // Pokaż siatkę wykresów
    gpuChartsContainer.innerHTML = ''; // Wyczyść poprzednie dynamiczne wykresy GPU

    const readings = savedData.readings;
    if (!readings || readings.length === 0) {
        console.warn("Brak odczytów w załadowanych danych.");
        noDataMessageElement.style.display = 'block';
        noDataMessageElement.querySelector('p').textContent = "Brak danych dla wybranego zapisu.";
        savedChartGridElement.style.display = 'none';
        return;
    }

    // Wyciągnij etykiety czasu (timestampy) i konwertuj na obiekty Date
    // Dodano walidację, aby upewnić się, że timestamp jest liczbą
    const labels = readings.map(reading => {
        if (typeof reading.timestamp === 'number' && !isNaN(reading.timestamp)) {
            return new Date(reading.timestamp * 1000);
        }
        console.warn(`Nieprawidłowy timestamp dla odczytu:`, reading.timestamp, `Użyto bieżącej daty jako fallback.`);
        return new Date(); // Zwróć bieżącą datę jako fallback lub null, jeśli wolisz pominąć ten punkt
    });
    console.log("Etykiety czasu (Date objects):", labels);

    // Renderuj standardowe wykresy (CPU, RAM, Disk, Net)
    for (const key in savedChartConfig) {
        if (savedChartConfig.hasOwnProperty(key)) {
            const config = savedChartConfig[key];
            // POPRAWIONA LINIA: Używamy snakeToCamelCaseAndCapitalize
            const chartId = `saved${snakeToCamelCaseAndCapitalize(key)}Chart`;
            const chartCard = document.getElementById(chartId)?.closest('.chart-card');

            // Pobieramy konkretne dane dla danego klucza
            const data = readings.map(reading => {
                const value = reading.data[key];
                // Dodano walidację, aby upewnić się, że wartość jest liczbą
                return typeof value === 'number' && !isNaN(value) ? parseFloat(value.toFixed(config.decimals)) : null;
            });
            console.log(`Dane dla ${key} (${chartId}):`, data);

            // Sprawdź, czy istnieją sensowne dane dla tego wykresu (przynajmniej jeden nie-null)
            if (data.every(val => val === null || val === undefined)) {
                if (chartCard) {
                    chartCard.style.display = 'none'; // Ukryj kartę wykresu, jeśli brak danych
                }
                console.warn(`Brak danych dla wykresu: ${key} (ID: ${chartId}). Ukrywanie karty.`);
            } else {
                if (chartCard) {
                    chartCard.style.display = 'block'; // Upewnij się, że karta jest widoczna
                }
                createOrUpdateChart(
                    chartId,
                    config.label,
                    config.unit,
                    config.borderColor,
                    data,
                    labels,
                    config.decimals
                );
            }
        }
    }

    // Obsługa wykresów GPU
    const hasGpuData = readings.some(reading => reading.data.gpu_stats && reading.data.gpu_stats.length > 0);

    if (hasGpuData) {
        let gpuDevices = {};
        // Zbierz unikalne ID kart GPU i ich nazwy z pierwszego odczytu, który ma dane GPU
        // Zakładamy, że lista GPU nie zmienia się w trakcie jednego zapisu
        for(const reading of readings) {
            if (reading.data.gpu_stats) {
                reading.data.gpu_stats.forEach(gpu => {
                    if (!gpuDevices[gpu.id]) {
                        gpuDevices[gpu.id] = gpu.name || `GPU ${gpu.id}`;
                    }
                });
            }
        }
        console.log("Wykryte urządzenia GPU:", gpuDevices);

        const gpuStatsToChart = [
            { key: 'load', label: 'Obciążenie', unit: '%', decimals: 0, borderColor: '#FFC107' },
            { key: 'memoryUsed', label: 'Pamięć Używana', unit: ' GB', decimals: 2, borderColor: '#4CAF50' }, // Przyjmuję, że memoryUsed jest już w GB
            { key: 'memoryUtilisation', label: 'Użycie Pamięci', unit: '%', decimals: 0, borderColor: '#9C27B0' }, // Jeśli memoryUtilisation jest w 0-1
            { key: 'temperature', label: 'Temperatura', unit: '°C', decimals: 0, borderColor: '#E91E63' },
        ];

        for (const gpuId in gpuDevices) {
            const gpuName = gpuDevices[gpuId];

            gpuStatsToChart.forEach(statConfig => {
                const canvasId = `savedGpu${gpuId}${capitalizeFirstLetter(statConfig.key)}Chart`;
                let chartCard = document.getElementById(canvasId)?.closest('.chart-card'); // Sprawdź, czy karta już istnieje

                if (!chartCard) { // Jeśli karta nie istnieje, stwórz ją
                    chartCard = document.createElement('div');
                    chartCard.className = 'chart-card';
                    chartCard.innerHTML = `
                        <h2>${gpuName} - ${statConfig.label}</h2>
                        <div class="chart-container-large">
                            <canvas id="${canvasId}"></canvas>
                        </div>
                    `;
                    gpuChartsContainer.appendChild(chartCard);
                    console.log(`Dodano nową kartę dla GPU: ${gpuName} - ${statConfig.label} (ID: ${canvasId})`);
                } else {
                    console.log(`Karta dla GPU już istnieje: ${gpuName} - ${statConfig.label} (ID: ${canvasId})`);
                }

                const gpuDataSeries = readings.map(reading => {
                    const gpuStat = reading.data.gpu_stats ? reading.data.gpu_stats.find(g => g.id === parseInt(gpuId)) : null;
                    let value = null;
                    if (gpuStat && gpuStat[statConfig.key] !== undefined && gpuStat[statConfig.key] !== null) {
                         // Dodano walidację: upewnij się, że wartość jest liczbą
                        if (typeof gpuStat[statConfig.key] === 'number' && !isNaN(gpuStat[statConfig.key])) {
                            value = gpuStat[statConfig.key];
                            // Specjalna obsługa dla 'load' i 'memoryUtilisation', które mogą być w zakresie 0-1
                            if (statConfig.key === 'load' || statConfig.key === 'memoryUtilisation') {
                                value = value * 100;
                            }
                        }
                    }
                    return typeof value === 'number' ? parseFloat(value.toFixed(statConfig.decimals)) : null;
                });
                console.log(`Dane dla GPU ${gpuName} - ${statConfig.label}:`, gpuDataSeries);

                // Sprawdź, czy są jakieś dane do wyświetlenia dla tego wykresu GPU
                if (gpuDataSeries.every(val => val === null || val === undefined)) {
                    chartCard.style.display = 'none'; // Ukryj kartę, jeśli brak danych
                    console.warn(`Brak danych dla wykresu GPU: ${gpuName} - ${statConfig.label}. Ukrywanie karty.`);
                } else {
                    chartCard.style.display = 'block';
                    createOrUpdateChart(
                        canvasId,
                        `${gpuName} ${statConfig.label}`, // Etykieta wykresu z nazwą GPU
                        statConfig.unit,
                        statConfig.borderColor,
                        gpuDataSeries,
                        labels,
                        statConfig.decimals
                    );
                }
            });
        }
        // Usuń stare karty GPU, które mogły zostać z poprzedniego załadowania i już nie istnieją
        gpuChartsContainer.querySelectorAll('.chart-card').forEach(card => {
            const canvasElement = card.querySelector('canvas');
            let isStillActive = false;
            for (const gpuId in gpuDevices) {
                gpuStatsToChart.forEach(statConfig => {
                    if (canvasElement && canvasElement.id === `savedGpu${gpuId}${capitalizeFirstLetter(statConfig.key)}Chart`) {
                        isStillActive = true;
                    }
                });
            }
            if (canvasElement && !isStillActive) {
                // Jeśli wykres jest w savedMonitorCharts, zniszcz go
                if (savedMonitorCharts[canvasElement.id]) {
                    savedMonitorCharts[canvasElement.id].destroy();
                    delete savedMonitorCharts[canvasElement.id];
                }
                card.remove();
                console.log(`Usunięto starą kartę GPU: ${card.id}`);
            }
        });

    } else {
        // Jeśli nie ma danych GPU z API, wyczyść wszystkie karty GPU z DOM
        gpuChartsContainer.innerHTML = '';
        const noGpuMessage = document.createElement('p');
        noGpuMessage.className = 'no-gpu-message';
        noGpuMessage.textContent = "Brak dostępnych danych GPU dla tego zapisu lub brak kart NVIDIA.";
        gpuChartsContainer.appendChild(noGpuMessage);
        console.warn("Brak danych GPU w zapisie.");
    }
}

/**
 * Funkcja do ładowania danych z wybranego zapisu.
 */
async function loadSelectedStats() {
    const selectElement = document.getElementById('savedStatsSelect');
    const selectedRecordId = selectElement.value;

    if (!selectedRecordId) {
        resetSavedCharts(); // Wyczyść wykresy i pokaż domyślny komunikat
        console.log("Nie wybrano zapisu.");
        return;
    }

    try {
        console.log(`Pobieranie danych dla rekordu ID: ${selectedRecordId}`);
        const response = await fetch(`${SAVED_API_URL}${selectedRecordId}`);
        const data = await response.json();

        if (response.ok) {
            console.log("Załadowane dane:", data);
            if (data.readings && data.readings.length > 0) {
                renderCharts(data);
            } else {
                console.warn("Załadowano dane, ale brak odczytów.");
                document.getElementById('no-data-message').style.display = 'block';
                document.getElementById('no-data-message').querySelector('p').textContent = "Brak szczegółowych danych dla wybranego zapisu.";
                document.getElementById('saved-chart-grid').style.display = 'none';
                resetSavedCharts();
            }
        } else {
            console.error(`Błąd API: ${response.status} - ${data.message || 'Nieznany błąd'}`);
            document.getElementById('no-data-message').style.display = 'block';
            document.getElementById('no-data-message').querySelector('p').textContent = `Błąd ładowania danych: ${data.message || 'Nieznany błąd'}`;
            document.getElementById('saved-chart-grid').style.display = 'none';
            resetSavedCharts();
        }
    } catch (error) {
        console.error('Błąd podczas pobierania zapisanych statystyk:', error);
        document.getElementById('no-data-message').style.display = 'block';
        document.getElementById('no-data-message').querySelector('p').textContent = 'Wystąpił błąd sieciowy podczas ładowania danych.';
        document.getElementById('saved-chart-grid').style.display = 'none';
        resetSavedCharts();
    }
}

/**
 * Funkcja do resetowania wszystkich wykresów i stanu UI.
 */
function resetSavedCharts() {
    console.log("Resetowanie wykresów...");
    // Zniszcz wszystkie instancje wykresów Chart.js
    for (const chartId in savedMonitorCharts) {
        if (savedMonitorCharts.hasOwnProperty(chartId) && savedMonitorCharts[chartId]) {
            savedMonitorCharts[chartId].destroy();
            delete savedMonitorCharts[chartId];
        }
    }
    // Wyczyść wybór z listy rozwijanej
    document.getElementById('savedStatsSelect').value = "";
    // Pokaż komunikat o braku danych
    document.getElementById('no-data-message').style.display = 'block';
    document.getElementById('no-data-message').querySelector('p').textContent = "Wybierz zapis z listy, aby wyświetlić wykresy.";
    // Ukryj siatkę wykresów
    document.getElementById('saved-chart-grid').style.display = 'none';
    // Wyczyść dynamiczne wykresy GPU
    document.getElementById('saved-gpu-charts-container').innerHTML = '';

    // Upewnij się, że wszystkie karty "stałych" wykresów są widoczne po resecie
    // (na wypadek, gdyby zostały ukryte z powodu braku danych w poprzednim załadowaniu)
    for (const key in savedChartConfig) {
        if (savedChartConfig.hasOwnProperty(key)) {
            const chartId = `saved${snakeToCamelCaseAndCapitalize(key)}Chart`;
            const chartCard = document.getElementById(chartId)?.closest('.chart-card');
            if (chartCard) {
                chartCard.style.display = 'block';
            }
        }
    }
    console.log("Wykresy zresetowane.");
}


// Uruchomienie obsługi zdarzeń po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    const loadButton = document.getElementById('load-selected-stats');
    if (loadButton) {
        loadButton.addEventListener('click', loadSelectedStats);
    }

    const resetChartsButton = document.getElementById('reset-saved-charts');
    if (resetChartsButton) {
        resetChartsButton.addEventListener('click', resetSavedCharts);
    }

    // Wyświetl domyślny komunikat po załadowaniu strony
    document.getElementById('no-data-message').style.display = 'block';
    document.getElementById('saved-chart-grid').style.display = 'none';
    console.log("DOM załadowany, początkowy stan UI ustawiony.");
});