// script.js
const API_URL = '/api/stats';
const SAVE_API_URL = '/api/save_current_readout'; // NOWA ZMIENNA

// Obiekt do przechowywania najniższych i najwyższych wartości
// oraz konfiguracji formatowania dla każdej statystyki
let monitorStats = {
    // Ważne: klucze tutaj muszą odpowiadać kluczom zwracanym przez API Flaska
    cpu_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'cpuUsage' },
    cpu_current_basic_speed: { min: Infinity, max: -Infinity, unit: ' GHz', decimals: 2, idPrefix: 'cpuCurrentBasicSpeed' },
    processor_name: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'processorName', skipMinMax: true },
    l2_cache: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'l2Cache', skipMinMax: true },
    l3_cache: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'l3Cache', skipMinMax: true },
    cores_physical: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'coresPhysical', skipMinMax: true },
    cores_logical: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'coresLogical', skipMinMax: true },

    ram_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'ramUsage' },
    ram_total: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'ramTotal', skipMinMax: true },
    ram_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'ramFree' },

    disk_usage: { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: 'diskUsage' },
    disk_total: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'diskTotal', skipMinMax: true },
    disk_free: { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: 'diskFree' },

    net_download: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 0, idPrefix: 'netDownload' },
    net_upload: { min: Infinity, max: -Infinity, unit: ' KB/s', decimals: 0, idPrefix: 'netUpload' },
    net_connections: { min: Infinity, max: -Infinity, unit: '', decimals: 0, idPrefix: 'netConnections' },
};

let statsInterval; // Zmienna do przechowywania ID interwału

// Funkcja do resetowania statystyk min/max
function resetMinMaxStats() {
    for (let key in monitorStats) {
        if (!monitorStats[key].skipMinMax) {
            monitorStats[key].min = Infinity;
            monitorStats[key].max = -Infinity;
            // Aktualizacja wyświetlanych wartości na '--' po resecie
            const minElement = document.getElementById(monitorStats[key].idPrefix + '-min');
            const maxElement = document.getElementById(monitorStats[key].idPrefix + '-max');
            if (minElement) minElement.textContent = '--' + monitorStats[key].unit;
            if (maxElement) maxElement.textContent = '--' + monitorStats[key].unit;
        }
    }
}

// Funkcja do pobierania i renderowania danych
async function fetchStatsAndRender() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        updateAlerts(data);
        // CPU
        document.getElementById('processor-name').textContent = data.processor_name;
        document.getElementById('l2-cache').textContent = data.l2_cache + ' MB';
        document.getElementById('l3-cache').textContent = data.l3_cache + ' MB';
        document.getElementById('cores-physical').textContent = data.cores_physical;
        document.getElementById('cores-logical').textContent = data.cores_logical;

        document.getElementById('cpu-usage').textContent = data.cpu_usage + '%';
        updateProgressBar('cpu-progress', data.cpu_usage);
        document.getElementById('cpu-current-basic-speed').textContent = data.cpu_current_basic_speed + ' GHz';

        // RAM
        document.getElementById('ram-usage').textContent = data.ram_usage + '%';
        updateProgressBar('ram-progress', data.ram_usage);
        document.getElementById('ram-total').textContent = data.ram_total + ' GB';
        document.getElementById('ram-free').textContent = data.ram_free + ' GB';

        // Disk
        document.getElementById('disk-usage').textContent = data.disk_usage + '%';
        updateProgressBar('disk-progress', data.disk_usage);
        document.getElementById('disk-total').textContent = data.disk_total + ' GB';
        document.getElementById('disk-free').textContent = data.disk_free + ' GB';

        // Network
        document.getElementById('net-download').textContent = data.net_download + ' KB/s';
        document.getElementById('net-upload').textContent = data.net_upload + ' KB/s';
        document.getElementById('net-connections').textContent = data.net_connections;

        // GPU (conditional rendering)
        const gpuSection = document.getElementById('gpu-section');
        const gpuDetailsContainer = document.getElementById('gpu-details-container');
        if (data.gpu_stats && data.gpu_stats.length > 0) {
            gpuSection.style.display = 'block'; // Show GPU section
            gpuDetailsContainer.innerHTML = ''; // Clear previous details

            data.gpu_stats.forEach((gpu, index) => {
                const gpuCard = document.createElement('div');
                gpuCard.className = 'monitor-card'; // Use a generic card style or create a new one

                // Add card-specific monitor-items
                const gpuNameItem = document.createElement('div');
                gpuNameItem.className = 'monitor-item';
                gpuNameItem.innerHTML = `<span>${gpu.name}</span>`;
                gpuCard.appendChild(gpuNameItem);

                const gpuLoadItem = document.createElement('div');
                gpuLoadItem.className = 'monitor-item';
                gpuLoadItem.innerHTML = `<span>Obciążenie:</span> <span id="gpu-${index}-load">${gpu.load}%</span>`;
                gpuCard.appendChild(gpuLoadItem);
                
                const gpuMemoryTotalItem = document.createElement('div');
                gpuMemoryTotalItem.className = 'monitor-item';
                gpuMemoryTotalItem.innerHTML = `<span>Pamięć całkowita:</span> <span>${gpu.memoryTotal} GB</span>`;
                gpuCard.appendChild(gpuMemoryTotalItem);

                const gpuMemoryUsedItem = document.createElement('div');
                gpuMemoryUsedItem.className = 'monitor-item';
                gpuMemoryUsedItem.innerHTML = `<span>Pamięć używana:</span> <span id="gpu-${index}-memoryUsed">${gpu.memoryUsed} GB</span>`;
                gpuCard.appendChild(gpuMemoryUsedItem);

                const gpuTemperatureItem = document.createElement('div');
                gpuTemperatureItem.className = 'monitor-item';
                gpuTemperatureItem.innerHTML = `<span>Temperatura:</span> <span id="gpu-${index}-temperature">${gpu.temperature}°C</span>`;
                gpuCard.appendChild(gpuTemperatureItem);
                
                // Add min/max for GPU if needed
                if (!monitorStats[`gpu-${index}-load`]) {
                     monitorStats[`gpu-${index}-load`] = { min: Infinity, max: -Infinity, unit: '%', decimals: 0, idPrefix: `gpu-${index}-load` };
                     monitorStats[`gpu-${index}-memoryUsed`] = { min: Infinity, max: -Infinity, unit: ' GB', decimals: 2, idPrefix: `gpu-${index}-memoryUsed` };
                     monitorStats[`gpu-${index}-temperature`] = { min: Infinity, max: -Infinity, unit: '°C', decimals: 0, idPrefix: `gpu-${index}-temperature` };
                }

                // Update min/max for GPU
                updateMinMax(`gpu-${index}-load`, gpu.load);
                updateMinMax(`gpu-${index}-memoryUsed`, gpu.memoryUsed);
                updateMinMax(`gpu-${index}-temperature`, gpu.temperature);


                // Add the card to the container
                gpuDetailsContainer.appendChild(gpuCard);
            });
        } else {
            gpuSection.style.display = 'none'; // Hide GPU section if no data
        }


        // Aktualizacja wartości min/max
        for (let key in monitorStats) {
            if (data.hasOwnProperty(key) && !monitorStats[key].skipMinMax) {
                updateMinMax(key, data[key]);
            }
            // Specjalna obsługa dla GPU, które są w tablicy
            if (key.startsWith('gpu-') && data.gpu_stats && data.gpu_stats.length > 0) {
                 const gpuIndex = parseInt(key.split('-')[1]);
                 if (data.gpu_stats[gpuIndex]) {
                     const gpu = data.gpu_stats[gpuIndex];
                     if (key.endsWith('-load')) updateMinMax(key, gpu.load);
                     else if (key.endsWith('-memoryUsed')) updateMinMax(key, gpu.memoryUsed);
                     else if (key.endsWith('-temperature')) updateMinMax(key, gpu.temperature);
                 }
            }
        }

    } catch (error) {
        console.error('Błąd podczas pobierania danych lub renderowania (index.html):', error);
        const elementsToReset = [
            'cpu-usage', 'cpu-basic-clock',
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

// Funkcja pomocnicza do aktualizacji paska postępu
function updateProgressBar(id, value) {
    const progressBar = document.getElementById(id);
    if (progressBar) {
        progressBar.style.width = value + '%';
        // Zmiana koloru paska w zależności od użycia
        if (value < 50) {
            progressBar.className = 'progress-bar low-usage';
        } else if (value < 80) {
            progressBar.className = 'progress-bar medium-usage';
        } else {
            progressBar.className = 'progress-bar high-usage';
        }
    }
}

// Funkcja pomocnicza do aktualizacji wartości min/max
function updateMinMax(key, currentValue) {
    if (typeof currentValue !== 'number' || monitorStats[key].skipMinMax) return;

    if (currentValue < monitorStats[key].min) {
        monitorStats[key].min = currentValue;
        const minElement = document.getElementById(monitorStats[key].idPrefix + '-min');
        if (minElement) minElement.textContent = monitorStats[key].min.toFixed(monitorStats[key].decimals) + monitorStats[key].unit;
    }
    if (currentValue > monitorStats[key].max) {
        monitorStats[key].max = currentValue;
        const maxElement = document.getElementById(monitorStats[key].idPrefix + '-max');
        if (maxElement) maxElement.textContent = monitorStats[key].max.toFixed(monitorStats[key].decimals) + monitorStats[key].unit;
    }
}


// NOWA FUNKCJA: Zapisywanie aktualnego odczytu
async function saveCurrentReadout() {
    try {
        const button = document.getElementById('save-readout-button');
        button.disabled = true; // Dezaktywuj przycisk, aby zapobiec wielokrotnemu kliknięciu
        button.textContent = 'Zapisuję...';

        const response = await fetch(SAVE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
            // Ciało żądania jest puste, bo serwer pobiera aktualne dane z pamięci
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            alert('Odczyt zapisany pomyślnie!');
        } else {
            alert('Błąd podczas zapisu odczytu: ' + result.message);
        }
    } catch (error) {
        console.error('Błąd podczas wysyłania żądania zapisu:', error);
        alert('Wystąpił błąd sieci lub serwera podczas zapisu odczytu.');
    } finally {
        const button = document.getElementById('save-readout-button');
        button.disabled = false; // Aktywuj przycisk z powrotem
        button.textContent = 'Zapisz aktualny odczyt';
    }
}

// Uruchomienie cyklicznego pobierania danych
document.addEventListener('DOMContentLoaded', () => {
    resetMinMaxStats();
    fetchStatsAndRender();

    if (!statsInterval) {
        statsInterval = setInterval(fetchStatsAndRender, 1000); // Odświeżanie co 1 sekundę
    }

    // Dodanie event listenera dla nowego przycisku
    const saveButton = document.getElementById('save-readout-button');
    if (saveButton) {
        saveButton.addEventListener('click', saveCurrentReadout);
    }

    const resetBtn = document.getElementById('reset-stats-button');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetMinMaxStats);
    }
});

// Funkcja do aktualizacji alertówAdd commentMore actions
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