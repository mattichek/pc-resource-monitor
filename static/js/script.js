// script.js
const API_URL = 'http://127.0.0.1:5000/api/stats';

// Obiekt do przechowywania najniższych i najwyższych wartości
// oraz konfiguracji formatowania dla każdej statystyki
let monitorStats = {
    // Ważne: klucze tutaj muszą odpowiadać kluczom zwracanym przez API Flaska
    cpu_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'cpuUsage' },
    cpu_clock: { min: Infinity, max: -Infinity, unit: ' GHz', decimals: 2, idPrefix: 'cpuClock' },
    // Nowe statystyki CPU
    processor_name: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'processorName', skipMinMax: true }, // Bez min/max
    l2_cache: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'l2Cache', skipMinMax: true }, // Bez min/max
    l3_cache: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'l3Cache', skipMinMax: true }, // Bez min/max
    cores_physical: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'coresPhysical', skipMinMax: true }, // Bez min/max
    cores_logical: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'coresLogical', skipMinMax: true }, // Bez min/max

    ram_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'ramUsage' },
    ram_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'ramFree' },
    disk_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'diskUsage' },
    disk_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'diskFree' },
    net_download: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 0, idPrefix: 'netDownload' },
    net_upload: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 0, idPrefix: 'netUpload' },
    net_connections: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'netConnections' }
};

// Funkcja do aktualizacji wartości min/max
function updateMinMax(statKey, currentValue) {
    // Sprawdź, czy klucz statystyki istnieje w monitorStats
    if (!monitorStats[statKey]) {
        console.warn(`Statystyka o kluczu "${statKey}" nie istnieje w monitorStats.`);
        return;
    }

    const stat = monitorStats[statKey];
    if (stat.skipMinMax) { // Jeśli ta statystyka ma pomijać aktualizację min/max
        return;
    }

    let value = parseFloat(currentValue);
    const elementIdPrefix = stat.idPrefix;
    const minElement = document.getElementById(`${elementIdPrefix}-min`);
    const maxElement = document.getElementById(`${elementIdPrefix}-max`);

    // Jeśli wartość jest NaN (np. z "N/A"), ustaw "--" i wyjdź
    if (isNaN(value)) {
        if (minElement) minElement.textContent = `--${stat.unit}`;
        if (maxElement) maxElement.textContent = `--${stat.unit}`;
        return;
    }

    // Aktualizuj min
    if (value < stat.min) {
        stat.min = value;
        if (minElement) minElement.textContent = `${value.toFixed(stat.decimals)}${stat.unit}`;
    }

    // Aktualizuj max
    if (value > stat.max) {
        stat.max = value;
        if (maxElement) maxElement.textContent = `${value.toFixed(stat.decimals)}${stat.unit}`;
    }
}

// Funkcja do inicjalizacji / resetowania wartości min/max
function resetMinMaxStats() {
    for (const key in monitorStats) {
        if (monitorStats.hasOwnProperty(key)) {
            const stat = monitorStats[key];
            if (stat.skipMinMax) continue; // Pomiń statystyki, które nie mają min/max

            stat.min = Infinity;
            stat.max = -Infinity;
            const elementIdPrefix = stat.idPrefix;
            const minElement = document.getElementById(`${elementIdPrefix}-min`);
            const maxElement = document.getElementById(`${elementIdPrefix}-max`);
            // Upewnij się, że jednostka jest wyświetlana nawet jeśli wartość to "--"
            if (minElement) minElement.textContent = `--${stat.unit}`;
            if (maxElement) maxElement.textContent = `--${stat.unit}`;
        }
    }
    // Specjalne czyszczenie dla GPU, ponieważ ich klucze są dynamiczne
    document.querySelectorAll('[id^="gpu-"][id$="-min"]').forEach(el => el.textContent = `--${monitorStats[el.id.replace('-min', '')]?.unit || ''}`);
    document.querySelectorAll('[id^="gpu-"][id$="-max"]').forEach(el => el.textContent = `--${monitorStats[el.id.replace('-max', '')]?.unit || ''}`);
}

// Funkcja do pobierania danych z API i renderowania
async function fetchStatsAndRender() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dane pobrane z API:", data);

        // Aktualizacja CPU
        document.getElementById('cpu-usage').textContent = `${data.cpu_usage}%`;
        const cpuProgress = document.getElementById('cpu-progress');
        cpuProgress.style.width = `${data.cpu_usage}%`;
        cpuProgress.className = 'progress-bar'; // Resetuje klasy
        if (data.cpu_usage > 80) cpuProgress.classList.add('red');
        else if (data.cpu_usage > 50) cpuProgress.classList.add('yellow');
        updateMinMax('cpu_usage', data.cpu_usage);

        // Taktowanie CPU
        document.getElementById('cpu-clock').textContent = `${data.cpu_clock} GHz`;
        updateMinMax('cpu_clock', data.cpu_clock);

        // Nowe dane CPU
        document.getElementById('processor-name').textContent = data.processor_name;
        document.getElementById('l2-cache').textContent = data.l2_cache;
        document.getElementById('l3-cache').textContent = data.l3_cache;
        document.getElementById('cores-physical').textContent = data.cores_physical;
        document.getElementById('cores-logical').textContent = data.cores_logical;


        // Aktualizacja RAM
        document.getElementById('ram-usage').textContent = `${data.ram_usage}%`;
        const ramProgress = document.getElementById('ram-progress');
        ramProgress.style.width = `${data.ram_usage}%`;
        ramProgress.className = 'progress-bar'; // Resetuje klasy
        if (data.ram_usage > 85) ramProgress.classList.add('red');
        else if (data.ram_usage > 60) ramProgress.classList.add('yellow');
        updateMinMax('ram_usage', data.ram_usage);

        document.getElementById('ram-free').textContent = `${data.ram_free} GB`;
        updateMinMax('ram_free', data.ram_free);
        document.getElementById('ram-total').textContent = `${data.ram_total} GB`;

        // Aktualizacja Dysku
        document.getElementById('disk-usage').textContent = `${data.disk_usage}%`;
        const diskProgress = document.getElementById('disk-progress');
        diskProgress.style.width = `${data.disk_usage}%`;
        diskProgress.className = 'progress-bar'; // Resetuje klasy
        if (data.disk_usage > 90) diskProgress.classList.add('red');
        else if (data.disk_usage > 70) diskProgress.classList.add('yellow');
        updateMinMax('disk_usage', data.disk_usage);

        document.getElementById('disk-free').textContent = `${data.disk_free} GB`;
        updateMinMax('disk_free', data.disk_free);
        document.getElementById('disk-total').textContent = `${data.disk_total} GB`;

        // Aktualizacja Sieci
        document.getElementById('net-download').textContent = `${data.net_download} KB/s`;
        updateMinMax('net_download', data.net_download);

        document.getElementById('net-upload').textContent = `${data.net_upload} KB/s`;
        updateMinMax('net_upload', data.net_upload);

        document.getElementById('net-connections').textContent = `${data.net_connections}`;
        updateMinMax('net_connections', data.net_connections);

        // Aktualizacja GPU
        const gpuSection = document.getElementById('gpu-section');
        const gpuDetailsContainer = document.getElementById('gpu-details-container');
        gpuDetailsContainer.innerHTML = ''; // Wyczyść poprzednie dane

        if (data.gpu_stats && data.gpu_stats.length > 0) {
            gpuSection.style.display = 'block'; // Pokaż sekcję GPU
            data.gpu_stats.forEach((gpu, index) => {
                const gpuId = `gpu-${index}`; // Unikalne ID dla każdego GPU

                // HTML dla pojedynczego GPU, naśladujący strukturę 'monitor-section'
                const gpuHtml = `
                    <div class="monitor-subsection"> <h3>${gpu.name} (ID: ${gpu.id})</h3>

                        <div class="monitor-item">
                            <span>Obciążenie:</span>
                            <span id="${gpuId}-load">${gpu.load}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="${gpuId}-progress-load"></div>
                        </div>
                        <div class="min-max-values">
                            <span class="min-value">Min: <span id="${gpuId}-load-min">--%</span></span>
                            <span class="max-value">Max: <span id="${gpuId}-load-max">--%</span></span>
                        </div>

                        <div class="monitor-item">
                            <span>Pamięć Używana:</span>
                            <span id="${gpuId}-memoryUsed">${gpu.memoryUsed} GB</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="${gpuId}-progress-memory"></div>
                        </div>
                        <div class="min-max-values">
                            <span class="min-value">Min: <span id="${gpuId}-memoryUsed-min">-- GB</span></span>
                            <span class="max-value">Max: <span id="${gpuId}-memoryUsed-max">-- GB</span></span>
                        </div>

                        <div class="monitor-item">
                            <span>Pamięć Całkowita:</span>
                            <span id="${gpuId}-memoryTotal">${gpu.memoryTotal} GB</span>
                        </div>
                        <div class="monitor-item">
                            <span>Pamięć Wolna:</span>
                            <span id="${gpuId}-memoryFree">${gpu.memoryFree} GB</span>
                        </div>

                        <div class="monitor-item">
                            <span>Temperatura:</span>
                            <span id="${gpuId}-temperature">${gpu.temperature} °C</span>
                        </div>
                        <div class="min-max-values">
                            <span class="min-value">Min: <span id="${gpuId}-temperature-min">-- °C</span></span>
                            <span class="max-value">Max: <span id="${gpuId}-temperature-max">-- °C</span></span>
                        </div>
                    </div>
                `;
                gpuDetailsContainer.insertAdjacentHTML('beforeend', gpuHtml);

                // Aktualizacja paska postępu obciążenia GPU
                const gpuLoadProgress = document.getElementById(`${gpuId}-progress-load`);
                if (gpuLoadProgress) {
                    gpuLoadProgress.style.width = `${gpu.load}%`;
                    gpuLoadProgress.className = 'progress-bar';
                    if (gpu.load > 80) gpuLoadProgress.classList.add('red');
                    else if (gpu.load > 50) gpuLoadProgress.classList.add('yellow');
                }

                // Aktualizacja paska postępu użycia pamięci GPU
                const gpuMemoryProgress = document.getElementById(`${gpuId}-progress-memory`);
                if (gpuMemoryProgress && gpu.memoryTotal > 0) { // Upewnij się, że memoryTotal nie jest 0
                    const memoryUsagePercent = (gpu.memoryUsed / gpu.memoryTotal * 100).toFixed(0);
                    gpuMemoryProgress.style.width = `${memoryUsagePercent}%`;
                    gpuMemoryProgress.className = 'progress-bar';
                    if (memoryUsagePercent > 85) gpuMemoryProgress.classList.add('red');
                    else if (memoryUsagePercent > 60) gpuMemoryProgress.classList.add('yellow');
                }

                // Dodanie/aktualizacja statystyk min/max
                if (!monitorStats[`${gpuId}-load`]) {
                    monitorStats[`${gpuId}-load`] = { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: `${gpuId}-load` };
                }
                if (!monitorStats[`${gpuId}-memoryUsed`]) {
                    monitorStats[`${gpuId}-memoryUsed`] = { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: `${gpuId}-memoryUsed` };
                }
                if (!monitorStats[`${gpuId}-temperature`]) {
                    monitorStats[`${gpuId}-temperature`] = { min: Infinity, max: -Infinity, unit: ' °C', decimals: 0, idPrefix: `${gpuId}-temperature` };
                }

                updateMinMax(`${gpuId}-load`, gpu.load);
                updateMinMax(`${gpuId}-memoryUsed`, gpu.memoryUsed);
                updateMinMax(`${gpuId}-temperature`, gpu.temperature);
            });
        } else {
            gpuSection.style.display = 'none'; // Ukryj sekcję, jeśli brak GPU
            gpuDetailsContainer.innerHTML = '<p>Brak dostępnych danych GPU lub brak kart NVIDIA.</p>';
        }

    } catch (error) {
        console.error('Błąd podczas pobierania danych lub renderowania:', error);
        // W przypadku błędu ustawiamy stan na "Błąd!" dla wszystkich pól
        const elementsToReset = [
            'cpu-usage', 'cpu-clock',
            'processor-name', 'l2-cache', 'l3-cache', 'cores-physical', 'cores-logical', // Nowe elementy CPU
            'ram-usage', 'ram-free', 'ram-total',
            'disk-usage', 'disk-free', 'disk-total',
            'net-download', 'net-upload', 'net-connections'
        ];
        elementsToReset.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
               element.textContent = 'Błąd!';
            }
        });

        // Reset pasków postępu i ich klas
        const progressBars = ['cpu-progress', 'ram-progress', 'disk-progress'];
        progressBars.forEach(id => {
            const bar = document.getElementById(id);
            if (bar) {
                bar.style.width = '0%';
                bar.className = 'progress-bar';
            }
        });

        // Ustawienie min/max na --
        resetMinMaxStats(); // Wywołaj reset Min/Max statystyk
    }
}

// Uruchomienie cyklicznego pobierania danych
setInterval(fetchStatsAndRender, 3000); // Co 3 sekundy

// Pierwsze pobranie danych po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    resetMinMaxStats();
    fetchStatsAndRender();
});

// Obsługa przycisku resetowania
document.getElementById('reset-stats-button').addEventListener('click', resetMinMaxStats);