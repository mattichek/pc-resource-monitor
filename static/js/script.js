// script.js
const API_URL = 'http://127.0.0.1:5000/api/stats';

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
    disk_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'diskUsage' },
    disk_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'diskFree' },
    net_download: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 0, idPrefix: 'netDownload' },
    net_upload: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 0, idPrefix: 'netUpload' },
    net_connections: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'netConnections' }
};

// Funkcja do aktualizacji wartości min/max
function updateMinMax(statKey, currentValue) {
    if (!monitorStats[statKey]) {
        console.warn(`Statystyka o kluczu "${statKey}" nie istnieje w monitorStats.`);
        return;
    }

    const stat = monitorStats[statKey];
    if (stat.skipMinMax) {
        return;
    }

    let value = parseFloat(currentValue);
    const elementIdPrefix = stat.idPrefix;
    const minElement = document.getElementById(`${elementIdPrefix}-min`);
    const maxElement = document.getElementById(`${elementIdPrefix}-max`);

    if (isNaN(value)) {
        if (minElement) minElement.textContent = `--${stat.unit}`;
        if (maxElement) maxElement.textContent = `--${stat.unit}`;
        return;
    }

    if (value < stat.min) {
        stat.min = value;
        if (minElement) minElement.textContent = `${value.toFixed(stat.decimals)}${stat.unit}`;
    }

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
            if (stat.skipMinMax) continue;

            stat.min = Infinity;
            stat.max = -Infinity;
            const elementIdPrefix = stat.idPrefix;
            const minElement = document.getElementById(`${elementIdPrefix}-min`);
            const maxElement = document.getElementById(`${elementIdPrefix}-max`);
            if (minElement) minElement.textContent = `--${stat.unit}`;
            if (maxElement) maxElement.textContent = `--${stat.unit}`;
        }
    }
    // Specjalne czyszczenie dla GPU, ponieważ ich klucze są dynamiczne
    // To jest nadal potrzebne, aby wyczyścić wyświetlane wartości,
    // ponieważ monitorStats może zawierać klucze dla GPU, które już nie są obecne w nowym cyklu pobierania danych.
    document.querySelectorAll('[id^="gpu-"][id$="-min"]').forEach(el => {
        // Spróbuj odgadnąć jednostkę na podstawie ID
        let unit = '';
        if (el.id.includes('load')) unit = '%';
        else if (el.id.includes('memoryUsed')) unit = ' GB';
        else if (el.id.includes('temperature')) unit = ' °C';
        el.textContent = `--${unit}`;
    });
    document.querySelectorAll('[id^="gpu-"][id$="-max"]').forEach(el => {
        let unit = '';
        if (el.id.includes('load')) unit = '%';
        else if (el.id.includes('memoryUsed')) unit = ' GB';
        else if (el.id.includes('temperature')) unit = ' °C';
        el.textContent = `--${unit}`;
    });
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
        cpuProgress.className = 'progress-bar';
        if (data.cpu_usage > 80) cpuProgress.classList.add('red');
        else if (data.cpu_usage > 50) cpuProgress.classList.add('yellow');
        updateMinMax('cpu_usage', data.cpu_usage);

        document.getElementById('cpu-clock').textContent = `${data.cpu_clock} GHz`;
        updateMinMax('cpu_clock', data.cpu_clock);

        document.getElementById('processor-name').textContent = data.processor_name;
        document.getElementById('l2-cache').textContent = data.l2_cache;
        document.getElementById('l3-cache').textContent = data.l3_cache;
        document.getElementById('cores-physical').textContent = data.cores_physical;
        document.getElementById('cores-logical').textContent = data.cores_logical;

        // Aktualizacja RAM
        document.getElementById('ram-usage').textContent = `${data.ram_usage}%`;
        const ramProgress = document.getElementById('ram-progress');
        ramProgress.style.width = `${data.ram_usage}%`;
        ramProgress.className = 'progress-bar';
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
        diskProgress.className = 'progress-bar';
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

        // Tymczasowy obiekt do przechowywania kluczy GPU z bieżącego cyklu
        // Pozwoli to usunąć stare klucze GPU z monitorStats, jeśli karta zostanie odłączona
        const currentGpuKeys = new Set();

        if (data.gpu_stats && data.gpu_stats.length > 0) {
            gpuSection.style.display = 'block';
            data.gpu_stats.forEach((gpu, index) => {
                const gpuId = `gpu-${index}`;

                // Dodanie/aktualizacja definicji statystyk min/max dla GPU w monitorStats
                // Sprawdź, czy statystyka już istnieje, jeśli nie, zainicjuj ją
                const gpuLoadKey = `${gpuId}-load`;
                const gpuMemoryUsedKey = `${gpuId}-memoryUsed`;
                const gpuTemperatureKey = `${gpuId}-temperature`;

                if (!monitorStats[gpuLoadKey]) {
                    monitorStats[gpuLoadKey] = { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: gpuLoadKey };
                }
                if (!monitorStats[gpuMemoryUsedKey]) {
                    monitorStats[gpuMemoryUsedKey] = { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: gpuMemoryUsedKey };
                }
                if (!monitorStats[gpuTemperatureKey]) {
                    monitorStats[gpuTemperatureKey] = { min: Infinity, max: -Infinity, unit: ' °C', decimals: 0, idPrefix: gpuTemperatureKey };
                }

                // Dodaj klucze do zestawu bieżących kluczy GPU
                currentGpuKeys.add(gpuLoadKey);
                currentGpuKeys.add(gpuMemoryUsedKey);
                currentGpuKeys.add(gpuTemperatureKey);

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
                            <span class="min-value">Min: <span id="${gpuId}-load-min">${monitorStats[gpuLoadKey].min === Infinity ? '--' : monitorStats[gpuLoadKey].min.toFixed(monitorStats[gpuLoadKey].decimals)}${monitorStats[gpuLoadKey].unit}</span></span>
                            <span class="max-value">Max: <span id="${gpuId}-load-max">${monitorStats[gpuLoadKey].max === -Infinity ? '--' : monitorStats[gpuLoadKey].max.toFixed(monitorStats[gpuLoadKey].decimals)}${monitorStats[gpuLoadKey].unit}</span></span>
                        </div>

                        <div class="monitor-item">
                            <span>Pamięć Używana:</span>
                            <span id="${gpuId}-memoryUsed">${gpu.memoryUsed} GB</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="${gpuId}-progress-memory"></div>
                        </div>
                        <div class="min-max-values">
                            <span class="min-value">Min: <span id="${gpuId}-memoryUsed-min">${monitorStats[gpuMemoryUsedKey].min === Infinity ? '--' : monitorStats[gpuMemoryUsedKey].min.toFixed(monitorStats[gpuMemoryUsedKey].decimals)}${monitorStats[gpuMemoryUsedKey].unit}</span></span>
                            <span class="max-value">Max: <span id="${gpuId}-memoryUsed-max">${monitorStats[gpuMemoryUsedKey].max === -Infinity ? '--' : monitorStats[gpuMemoryUsedKey].max.toFixed(monitorStats[gpuMemoryUsedKey].decimals)}${monitorStats[gpuMemoryUsedKey].unit}</span></span>
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
                            <span class="min-value">Min: <span id="${gpuId}-temperature-min">${monitorStats[gpuTemperatureKey].min === Infinity ? '--' : monitorStats[gpuTemperatureKey].min.toFixed(monitorStats[gpuTemperatureKey].decimals)}${monitorStats[gpuTemperatureKey].unit}</span></span>
                            <span class="max-value">Max: <span id="${gpuId}-temperature-max">${monitorStats[gpuTemperatureKey].max === -Infinity ? '--' : monitorStats[gpuTemperatureKey].max.toFixed(monitorStats[gpuTemperatureKey].decimals)}${monitorStats[gpuTemperatureKey].unit}</span></span>
                        </div>
                    </div>
                `;
                gpuDetailsContainer.insertAdjacentHTML('beforeend', gpuHtml);


                const gpuLoadProgress = document.getElementById(`${gpuId}-progress-load`);
                if (gpuLoadProgress) {
                    gpuLoadProgress.style.width = `${gpu.load}%`;
                    gpuLoadProgress.className = 'progress-bar';
                    if (gpu.load > 80) gpuLoadProgress.classList.add('red');
                    else if (gpu.load > 50) gpuLoadProgress.classList.add('yellow');
                }

                const gpuMemoryProgress = document.getElementById(`${gpuId}-progress-memory`);
                if (gpuMemoryProgress && gpu.memoryTotal > 0) {
                    const memoryUsagePercent = (gpu.memoryUsed / gpu.memoryTotal * 100).toFixed(0);
                    gpuMemoryProgress.style.width = `${memoryUsagePercent}%`;
                    gpuMemoryProgress.className = 'progress-bar';
                    if (memoryUsagePercent > 85) gpuMemoryProgress.classList.add('red');
                    else if (memoryUsagePercent > 60) gpuMemoryProgress.classList.add('yellow');
                }

                // Aktualizacja min/max po renderowaniu HTML
                updateMinMax(gpuLoadKey, gpu.load);
                updateMinMax(gpuMemoryUsedKey, gpu.memoryUsed);
                updateMinMax(gpuTemperatureKey, gpu.temperature);
            });

            // Usuń z monitorStats klucze GPU, które nie są już aktywne
            for (const key in monitorStats) {
                if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-') && !currentGpuKeys.has(key)) {
                    delete monitorStats[key];
                }
            }

        } else {
            gpuSection.style.display = 'none';
            gpuDetailsContainer.innerHTML = '<p>Brak dostępnych danych GPU lub brak kart NVIDIA.</p>';
            // Jeśli nie ma GPU, upewnij się, że stare statystyki GPU są usunięte z monitorStats
            for (const key in monitorStats) {
                if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-')) {
                    delete monitorStats[key];
                }
            }
        }

    } catch (error) {
        console.error('Błąd podczas pobierania danych lub renderowania:', error);
        const elementsToReset = [
            'cpu-usage', 'cpu-clock',
            'processor-name', 'l2-cache', 'l3-cache', 'cores-physical', 'cores-logical',
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

        const progressBars = ['cpu-progress', 'ram-progress', 'disk-progress'];
        progressBars.forEach(id => {
            const bar = document.getElementById(id);
            if (bar) {
                bar.style.width = '0%';
                bar.className = 'progress-bar';
            }
        });

        resetMinMaxStats();
    }
}

// Uruchomienie cyklicznego pobierania danych
setInterval(fetchStatsAndRender, 1000);

// Pierwsze pobranie danych po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    resetMinMaxStats();
    fetchStatsAndRender();
});

// Obsługa przycisku resetowania
document.getElementById('reset-stats-button').addEventListener('click', resetMinMaxStats);