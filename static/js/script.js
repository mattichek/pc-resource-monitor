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
        // This log is useful to see if new dynamic keys are being created or if expected ones are missing
        // console.warn(`Statystyka o kluczu "${statKey}" nie istnieje w monitorStats. Inicjalizacja...`);
        // If a dynamic GPU key is not found, initialize it here with defaults
        if (statKey.startsWith('gpu-')) {
            let unit = '';
            let decimals = 0;
            if (statKey.includes('load')) {
                unit = '%';
            } else if (statKey.includes('memoryUsed') || statKey.includes('memoryTotal') || statKey.includes('memoryFree')) {
                unit = ' GB';
                decimals = 2;
            } else if (statKey.includes('temperature')) {
                unit = ' °C';
            }
            monitorStats[statKey] = { min: Infinity, max: -Infinity, unit: unit, decimals: decimals, idPrefix: statKey };
        } else {
            // For non-GPU stats, if they're missing, it might indicate a configuration error
            return;
        }
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
    } else if (minElement && stat.min !== Infinity) { // Ensure min is displayed even if it doesn't change
        minElement.textContent = `${stat.min.toFixed(stat.decimals)}${stat.unit}`;
    }

    if (value > stat.max) {
        stat.max = value;
        if (maxElement) maxElement.textContent = `${value.toFixed(stat.decimals)}${stat.unit}`;
    } else if (maxElement && stat.max !== -Infinity) { // Ensure max is displayed even if it doesn't change
        maxElement.textContent = `${stat.max.toFixed(stat.decimals)}${stat.unit}`;
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
    // No longer need special GPU clearing here, as monitorStats handles it.
    // Dynamic GPU keys will be re-initialized by fetchStatsAndRender as needed.
}

// Funkcja do renderowania sekcji GPU
function renderGpuSections(gpuStats) {
    const gpuDetailsContainer = document.getElementById('gpu-details-container');
    // Clear existing GPU sections only if the number of GPUs has changed
    // or if we're sure it's the first render.
    // A more robust check would involve comparing GPU names/IDs.
    if (gpuDetailsContainer.children.length !== gpuStats.length) {
        gpuDetailsContainer.innerHTML = ''; // Clear only if structure needs to change
    }

    gpuStats.forEach((gpu, index) => {
        const gpuId = `gpu-${index}`;
        const gpuName = gpu.name;

        // Check if the GPU section already exists to avoid re-rendering entire HTML
        let gpuSubsection = document.getElementById(`${gpuId}-subsection`);
        if (!gpuSubsection) {
            const gpuHtml = `
                <div class="monitor-subsection" id="${gpuId}-subsection">
                    <h3>${gpuName} (ID: ${gpu.id})</h3>
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


            // Initialize monitorStats for this new GPU
            monitorStats[`${gpuId}-load`] = { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: `${gpuId}-load` };
            monitorStats[`${gpuId}-memoryUsed`] = { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: `${gpuId}-memoryUsed` };
            monitorStats[`${gpuId}-temperature`] = { min: Infinity, max: -Infinity, unit: ' °C', decimals: 0, idPrefix: `${gpuId}-temperature` };
        }

        // Now, update values within the existing or newly created structure
        document.getElementById(`${gpuId}-load`).textContent = `${gpu.load}%`;
        document.getElementById(`${gpuId}-memoryUsed`).textContent = `${gpu.memoryUsed} GB`;
        document.getElementById(`${gpuId}-memoryTotal`).textContent = `${gpu.memoryTotal} GB`;
        document.getElementById(`${gpuId}-memoryFree`).textContent = `${gpu.memoryFree} GB`;
        document.getElementById(`${gpuId}-temperature`).textContent = `${gpu.temperature} °C`;

        // Update progress bars
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

        // Update min/max for GPU values
        updateMinMax(`${gpuId}-load`, gpu.load);
        updateMinMax(`${gpuId}-memoryUsed`, gpu.memoryUsed);
        updateMinMax(`${gpuId}-temperature`, gpu.temperature);
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
        // console.log("Dane pobrane z API (index.html):", data); // Do debugowania

        // Funkcja pomocnicza do aktualizacji danych (BEZ wykresów)
        const updateMetricDisplay = (key, value, elementId, progressBarId, unit, decimals, thresholdYellow, thresholdRed) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = `${value.toFixed(decimals)}${unit}`;
            }

            if (progressBarId) {
                const progressBar = document.getElementById(progressBarId);
                if (progressBar) {
                    progressBar.style.width = `${value}%`;
                    progressBar.className = 'progress-bar'; // Reset klas
                    if (value > thresholdRed) progressBar.classList.add('red');
                    else if (value > thresholdYellow) progressBar.classList.add('yellow');
                }
            }
            updateMinMax(key, value);
        };

        // Aktualizacja CPU
        updateMetricDisplay('cpu_usage', data.cpu_usage, 'cpu-usage', 'cpu-progress', '%', 0, 50, 80);
        updateMetricDisplay('cpu_clock', data.cpu_clock, 'cpu-clock', null, ' GHz', 2);
        document.getElementById('processor-name').textContent = data.processor_name;
        document.getElementById('l2-cache').textContent = data.l2_cache;
        document.getElementById('l3-cache').textContent = data.l3_cache;
        document.getElementById('cores-physical').textContent = data.cores_physical;
        document.getElementById('cores-logical').textContent = data.cores_logical;

        // Aktualizacja RAM
        updateMetricDisplay('ram_usage', data.ram_usage, 'ram-usage', 'ram-progress', '%', 0, 60, 85);
        updateMetricDisplay('ram_free', data.ram_free, 'ram-free', null, ' GB', 2);
        document.getElementById('ram-total').textContent = `${data.ram_total} GB`;

        // Aktualizacja Dysku
        updateMetricDisplay('disk_usage', data.disk_usage, 'disk-usage', 'disk-progress', '%', 0, 70, 90);
        updateMetricDisplay('disk_free', data.disk_free, 'disk-free', null, ' GB', 2);
        document.getElementById('disk-total').textContent = `${data.disk_total} GB`;

        // Aktualizacja Sieci
        updateMetricDisplay('net_download', data.net_download, 'net-download', null, ' KB/s', 0);
        updateMetricDisplay('net_upload', data.net_upload, 'net-upload', null, ' KB/s', 0);
        updateMetricDisplay('net_connections', data.net_connections, 'net-connections', null, '', 0);

        // Aktualizacja GPU
        const gpuSection = document.getElementById('gpu-section');
        if (data.gpu_stats && data.gpu_stats.length > 0) {
            gpuSection.style.display = 'block';
            renderGpuSections(data.gpu_stats); // Call the new rendering function
        } else {
            gpuSection.style.display = 'none';
            document.getElementById('gpu-details-container').innerHTML = '<p>Brak dostępnych danych GPU lub brak kart NVIDIA.</p>';
            // Clear dynamic GPU keys from monitorStats if no GPUs are detected
            for (const key in monitorStats) {
                if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-')) {
                    delete monitorStats[key];
                }
            }
        }

    } catch (error) {
        console.error('Błąd podczas pobierania danych lub renderowania (index.html):', error);
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

        resetMinMaxStats(); // Resetuj statystyki w przypadku błędu
    }
}

// Uruchomienie cyklicznego pobierania danych
setInterval(fetchStatsAndRender, 1000);

// Pierwsze pobranie danych po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    // Resetuj wartości min/max tylko raz przy załadowaniu strony
    resetMinMaxStats();
    fetchStatsAndRender();
});

// Obsługa przycisku resetowania
document.getElementById('reset-stats-button').addEventListener('click', resetMinMaxStats);