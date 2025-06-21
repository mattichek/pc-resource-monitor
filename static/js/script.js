// script.js
const API_URL = '/api/stats';

// Obiekt do przechowywania najniższych i najwyższych wartości
let monitorStats = {
    cpu_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'cpuUsage' },
    cpu_current_basic_speed: { min: Infinity, max: -Infinity, unit: ' GHz', decimals: 2, idPrefix: 'cpuBasicClock' },
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
let statsInterval;

// Funkcja do aktualizacji alertów
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

// Funkcja do aktualizacji wartości min/max
function updateMinMax(statKey, currentValue) {
    if (!monitorStats[statKey]) {
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
    } else if (minElement && stat.min !== Infinity) {
        minElement.textContent = `${stat.min.toFixed(stat.decimals)}${stat.unit}`;
    }

    if (value > stat.max) {
        stat.max = value;
        if (maxElement) maxElement.textContent = `${value.toFixed(stat.decimals)}${stat.unit}`;
    } else if (maxElement && stat.max !== -Infinity) {
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
}

// Funkcja do renderowania sekcji GPU
function renderGpuSections(gpuStats) {
    const gpuDetailsContainer = document.getElementById('gpu-details-container');
    if (gpuDetailsContainer.children.length !== gpuStats.length) {
        gpuDetailsContainer.innerHTML = '';
    }

    gpuStats.forEach((gpu, index) => {
        const gpuId = `gpu-${index}`;
        const gpuName = gpu.name;

        let gpuSubsection = document.getElementById(`${gpuId}-subsection`);
        if (!gpuSubsection) {
            const gpuHtml = `
                <div class="monitor-subsection" id="${gpuId}-subsection">
                    <div class="monitor-item">
                    <span>${gpuName}</span>
                    </div>
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

            monitorStats[`${gpuId}-load`] = { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: `${gpuId}-load` };
            monitorStats[`${gpuId}-memoryUsed`] = { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: `${gpuId}-memoryUsed` };
            monitorStats[`${gpuId}-temperature`] = { min: Infinity, max: -Infinity, unit: ' °C', decimals: 0, idPrefix: `${gpuId}-temperature` };
        }

        document.getElementById(`${gpuId}-load`).textContent = `${gpu.load}%`;
        document.getElementById(`${gpuId}-memoryUsed`).textContent = `${gpu.memoryUsed} GB`;
        document.getElementById(`${gpuId}-memoryTotal`).textContent = `${gpu.memoryTotal} GB`;
        document.getElementById(`${gpuId}-memoryFree`).textContent = `${gpu.memoryFree} GB`;
        document.getElementById(`${gpuId}-temperature`).textContent = `${gpu.temperature} °C`;

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

        // Aktualizacja alertów
        updateAlerts(data);

        // Funkcja pomocnicza do aktualizacji danych
        const updateMetricDisplay = (key, value, elementId, progressBarId, unit, decimals, thresholdYellow, thresholdRed) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = `${value.toFixed(decimals)}${unit}`;
            }

            if (progressBarId) {
                const progressBar = document.getElementById(progressBarId);
                if (progressBar) {
                    progressBar.style.width = `${value}%`;
                    progressBar.className = 'progress-bar';
                    if (value > thresholdRed) progressBar.classList.add('red');
                    else if (value > thresholdYellow) progressBar.classList.add('yellow');
                }
            }
            updateMinMax(key, value);
        };

        // Aktualizacja CPU
        updateMetricDisplay('cpu_usage', data.cpu_usage, 'cpu-usage', 'cpu-progress', '%', 0, 50, 80);
        updateMetricDisplay('cpu_current_basic_speed', data.cpu_current_basic_speed, 'cpu_current_basic_speed', null, ' GHz', 2);
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
            renderGpuSections(data.gpu_stats);
        } else {
            gpuSection.style.display = 'none';
            document.getElementById('gpu-details-container').innerHTML = '<p>Brak dostępnych danych GPU lub brak kart NVIDIA.</p>';
            for (const key in monitorStats) {
                if (monitorStats.hasOwnProperty(key) && key.startsWith('gpu-')) {
                    delete monitorStats[key];
                }
            }
        }

    } catch (error) {
        console.error('Błąd podczas pobierania danych lub renderowania (index.html):', error);
        const elementsToReset = [
            'cpu-usage', 'cpu_current_basic_speed',
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
document.addEventListener('DOMContentLoaded', () => {
    resetMinMaxStats();
    fetchStatsAndRender();

    if (!statsInterval) {
        statsInterval = setInterval(fetchStatsAndRender, 1000);
    }
});

// Obsługa przycisku resetowania
document.getElementById('reset-stats-button').addEventListener('click', resetMinMaxStats);