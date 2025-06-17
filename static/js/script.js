// script.js
const API_URL = '/api/stats';

// Obiekt do przechowywania najniższych i najwyższych wartości
// oraz konfiguracji formatowania dla każdej statystyki
let monitorStats = {
    // Ważne: klucze tutaj muszą odpowiadać kluczom zwracanym przez API Flaska
    cpu_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'cpuUsage' },
    cpu_clock: { min: Infinity, max: -Infinity, unit: ' GHz', decimals: 2, idPrefix: 'cpuClock' },
    processor_name: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'processorName', skipMinMax: true },
    l2_cache: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'l2Cache', skipMinMax: true },
    l3_cache: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'l3Cache', skipMinMax: true },
    cores_physical: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'coresPhysical', skipMinMax: true },
    cores_logical: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'coresLogical', skipMinMax: true },

    ram_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'ramUsage' },
    ram_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'ramFree' },
    ram_total: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'ramTotal', skipMinMax: true },

    disk_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'diskUsage' },
    disk_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'diskFree' },
    disk_total: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'diskTotal', skipMinMax: true },

    net_download: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 2, idPrefix: 'netDownload' },
    net_upload: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 2, idPrefix: 'netUpload' },
    net_connections: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'netConnections' },

    // Dodatkowe pola dla GPU, jeśli będą dostępne
    // Te pola nie będą miały min/max globalnych, ale będą aktualizowane dynamicznie
    // 'gpu-0-load': { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'gpu0Load', skipMinMax: false },
    // 'gpu-0-memory_used': { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'gpu0MemoryUsed', skipMinMax: false },
    // ... i tak dalej dla innych statystyk GPU
};

// Obiekt do przechowywania danych dla wykresów (do wykorzystania w charts.html)
// W tym skrypcie nie będzie bezpośrednio używany do wykresów, ale zachowujemy go,
// aby uniknąć potencjalnych konfliktów lub pomylenia z charts-script.js
let chartData = {
    labels: [], // Etykiety czasu
    cpuUsage: [],
    cpuClock: [],
    ramUsage: [],
    ramFree: [],
    diskUsage: [],
    diskFree: [],
    netDownload: [],
    netUpload: [],
    netConnections: [],
    gpuLoad: [],
    gpuMemoryUsed: [],
    gpuTemperature: []
};

// Zmienna do przechowywania identyfikatora interwału
let statsInterval = null;

// Funkcja resetująca wartości min/max
function resetMinMaxStats() {
    for (const key in monitorStats) {
        if (monitorStats.hasOwnProperty(key) && !monitorStats[key].skipMinMax) {
            monitorStats[key].min = Infinity;
            monitorStats[key].max = -Infinity;
            // Zaktualizuj wyświetlane wartości na "--"
            const minElement = document.getElementById(monitorStats[key].idPrefix + '-min');
            const maxElement = document.getElementById(monitorStats[key].idPrefix + '-max');
            if (minElement) minElement.textContent = '--' + monitorStats[key].unit;
            if (maxElement) maxElement.textContent = '--' + monitorStats[key].unit;
        }
    }
}

// Funkcja aktualizująca pasek postępu i jego kolor
function updateProgressBar(elementId, percentage) {
    const progressBar = document.getElementById(elementId);
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        // Zmiana koloru paska w zależności od użycia
        if (percentage < 50) {
            progressBar.className = 'progress-bar progress-bar-green';
        } else if (percentage < 80) {
            progressBar.className = 'progress-bar progress-bar-yellow';
        } else {
            progressBar.className = 'progress-bar progress-bar-red';
        }
    }
}

// Funkcja do pobierania statystyk i aktualizowania interfejsu
async function fetchStatsAndRender() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Aktualizuj timestamp w console.log dla lepszego debugowania
        // console.log(`Odebrano dane: ${new Date().toLocaleTimeString()} - CPU: ${data.cpu_usage}%`);

        // Aktualizuj wszystkie monitorowane statystyki
        for (const key in monitorStats) {
            if (data.hasOwnProperty(key)) {
                let value = data[key];

                // Specjalna obsługa dla procesor_name, l2_cache, l3_cache, cores_physical, cores_logical, os_info
                if (['processor_name', 'l2_cache', 'l3_cache', 'cores_physical', 'cores_logical', 'os_info'].includes(key)) {
                    const element = document.getElementById(key.replace(/_/g, '-'));
                    if (element) {
                        element.textContent = value;
                    }
                    continue; // Pomiń aktualizację min/max dla tych pól
                }

                // Formatowanie wartości
                if (typeof value === 'number') {
                    value = value.toFixed(monitorStats[key].decimals);
                }

                const element = document.getElementById(key.replace(/_/g, '-'));
                if (element) {
                    element.textContent = value + monitorStats[key].unit;
                }

                // Aktualizuj min/max, jeśli nie jest pomijane
                if (typeof data[key] === 'number' && !monitorStats[key].skipMinMax) {
                    monitorStats[key].min = Math.min(monitorStats[key].min, data[key]);
                    monitorStats[key].max = Math.max(monitorStats[key].max, data[key]);

                    const minElement = document.getElementById(monitorStats[key].idPrefix + '-min');
                    const maxElement = document.getElementById(monitorStats[key].idPrefix + '-max');

                    if (minElement) minElement.textContent = monitorStats[key].min.toFixed(monitorStats[key].decimals) + monitorStats[key].unit;
                    if (maxElement) maxElement.textContent = monitorStats[key].max.toFixed(monitorStats[key].decimals) + monitorStats[key].unit;
                }
            }
        }

        // Aktualizuj paski postępu
        updateProgressBar('cpu-progress', data.cpu_usage);
        updateProgressBar('ram-progress', data.ram_usage);
        updateProgressBar('disk-progress', data.disk_usage);

        // Aktualizuj statystyki GPU
        const gpuSection = document.getElementById('gpu-section');
        const gpuDetailsContainer = document.getElementById('gpu-details-container');
        if (data.gpu_stats && data.gpu_stats.length > 0) {
            gpuSection.style.display = 'grid'; // Pokaż sekcję GPU
            gpuDetailsContainer.innerHTML = ''; // Wyczyść poprzednie dane
            data.gpu_stats.forEach((gpu, index) => {
                const gpuCard = document.createElement('div');
                gpuCard.className = 'monitor-card gpu-card'; // Możesz dodać specjalny styl dla kart GPU
                gpuCard.innerHTML = `
                    <h3>${gpu.name} (ID: ${gpu.id})</h3>
                    <div class="monitor-item"><span>Obciążenie:</span><span>${gpu.load}%</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width:${gpu.load}%;" class="${gpu.load < 50 ? 'progress-bar-green' : gpu.load < 80 ? 'progress-bar-yellow' : 'progress-bar-red'}"></div></div>
                    <div class="monitor-item"><span>Użycie pamięci:</span><span>${gpu.memory_used.toFixed(2)} GB / ${gpu.memory_total.toFixed(2)} GB</span></div>
                     <div class="progress-bar-container"><div class="progress-bar" style="width:${(gpu.memory_used/gpu.memory_total)*100}%;" class="${(gpu.memory_used/gpu.memory_total)*100 < 50 ? 'progress-bar-green' : (gpu.memory_used/gpu.memory_total)*100 < 80 ? 'progress-bar-yellow' : 'progress-bar-red'}"></div></div>
                    <div class="monitor-item"><span>Wolna pamięć:</span><span>${gpu.memory_free.toFixed(2)} GB</span></div>
                    <div class="monitor-item"><span>Temperatura:</span><span>${gpu.temperature}°C</span></div>
                `;
                gpuDetailsContainer.appendChild(gpuCard);

                // Aktualizuj min/max dla GPU dynamicznie
                // Pamiętaj, że dla GPU będziesz musiał dynamicznie dodawać klucze do monitorStats
                // lub obsługiwać to osobno, jeśli chcesz śledzić min/max dla każdej GPU indywidualnie.
                // Na potrzeby tego przykładu, upraszczamy i nie śledzimy min/max dla poszczególnych GPU tutaj.
            });
        } else {
            gpuSection.style.display = 'none'; // Ukryj sekcję GPU, jeśli brak danych
        }

    } catch (error) {
        console.error('Błąd podczas pobierania danych lub renderowania (index.html):', error);
        const elementsToReset = [
            'cpu-usage', 'cpu-clock',
            'processor-name', 'l2-cache', 'l3-cache', 'cores-physical', 'cores-logical',
            'ram-usage', 'ram-free', 'ram-total',
            'disk-usage', 'disk-free', 'disk-total',
            'net-download', 'net-upload', 'net-connections',
            'os-info'
        ];
        elementsToReset.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Błąd!';
            }
        });

        const progressBars = ['cpu-progress', 'ram-progress', 'disk-progress'];
        progressBars.forEach(id => {
            const bar = document.getElementById(id);
            if (bar) {
                bar.style.width = '0%';
                bar.className = 'progress-bar';
            }
        });

        resetMinMaxStats(); // Resetuj statystyki w przypadku błędu
    }
}

// Funkcja do obsługi zapisu statystyk
async function saveCurrentStats() {
    try {
        const response = await fetch('/api/save_current_stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
        } else {
            alert('Błąd podczas zapisu statystyk: ' + result.message);
        }
    } catch (error) {
        console.error('Błąd podczas wysyłania żądania zapisu statystyk:', error);
        alert('Wystąpił błąd sieciowy podczas zapisu statystyk.');
    }
}


// Uruchomienie cyklicznego pobierania danych
document.addEventListener('DOMContentLoaded', () => {
    resetMinMaxStats();
    fetchStatsAndRender();

    if (!statsInterval) {
        statsInterval = setInterval(fetchStatsAndRender, 1000); // Odświeżaj co 1 sekundę
    }

    // Obsługa przycisku resetowania min/max
    const resetButton = document.getElementById('reset-stats-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetMinMaxStats);
    }

    // Obsługa przycisku zapisu statystyk
    const saveButton = document.getElementById('save-stats-button');
    if (saveButton) {
        saveButton.addEventListener('click', saveCurrentStats);
    }
});

// Zatrzymanie interwału przy opuszczaniu strony (opcjonalne, ale dobra praktyka)
window.addEventListener('beforeunload', () => {
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
});