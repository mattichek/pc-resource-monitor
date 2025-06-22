const API_URL = '/api/stats';
const SAVE_API_URL = '/api/save_current_readout'; // DODANA LINIA
const MAX_CHART_DATA_POINTS = 60;
let chartDataIndex = 0;

let monitorStats = {
    'gpu-0-load': { label: 'Zużycie GPU', unit: '%', borderColor: '#FF5722', history: [], chart: null, decimals: 0 },
    cpu_usage: { label: 'Zużycie CPU', unit: '%', borderColor: '#4A90E2', history: [], chart: null, decimals: 0 },
    ram_usage: { label: 'Zużycie RAM', unit: '%', borderColor: '#f0ad4e', history: [], chart: null, decimals: 0 },
    ram_free: { label: 'Wolna pamięć RAM', unit: ' GB', borderColor: '#5bc0de', history: [], chart: null, decimals: 2 },
    net_download: { label: 'Pobieranie Sieci', unit: ' KB/s', borderColor: '#673ab7', history: [], chart: null, decimals: 0 },
    net_upload: { label: 'Wysyłanie Sieci', unit: ' KB/s', borderColor: '#ff9800', history: [], chart: null, decimals: 0 },
    net_connections: { label: 'Aktywne Połączenia', unit: ' połączeń', borderColor: '#8bc34a', history: [], chart: null, decimals: 0 },
    'gpu-0-memoryUsed': { label: 'GPU - Pamięć Używana', unit: ' GB', borderColor: '#4CAF50', history: [], chart: null, decimals: 2 },
    'gpu-0-temperature': { label: 'GPU - Temperatura', unit: ' °C', borderColor: '#F44336', history: [], chart: null, decimals: 0 }
};

function initializeChart(ctx, key) {
    const stat = monitorStats[key];
    stat.chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: stat.label,
                data: stat.history,
                borderColor: stat.borderColor,
                tension: 0.2,
                fill: false,
                pointRadius: 0,
                id: key
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: {
                    type: 'linear',
                    ticks: { display: false },
                    grid: { display: false },
                    min: 0,
                    max: MAX_CHART_DATA_POINTS - 1
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: stat.unit, color: '#C0C0C0' },
                    ticks: { color: '#C0C0C0' },
                    grid: { color: '#3A4750' }
                }
            },
            plugins: {
                legend: { display: true, labels: { color: '#C0C0C0' } },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            const cfg = monitorStats[context.dataset.id];
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(cfg.decimals)}${cfg.unit}`;
                        }
                    }
                }
            }
        }
    });
}

function initializeCombinedChart(ctx, keys) {
    const datasets = keys.map(key => {
        const stat = monitorStats[key];
        return {
            label: stat.label,
            data: stat.history,
            borderColor: stat.borderColor,
            tension: 0.2,
            fill: false,
            pointRadius: 0,
            id: key
        };
    });
    const yUnit = monitorStats[keys[0]]?.unit || '';
    return new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: {
                    type: 'linear',
                    ticks: { display: false },
                    grid: { display: false },
                    min: 0,
                    max: MAX_CHART_DATA_POINTS - 1
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: yUnit, color: '#C0C0C0' },
                    ticks: { color: '#C0C0C0' },
                    grid: { color: '#3A4750' }
                }
            },
            plugins: {
                legend: { display: true, labels: { color: '#C0C0C0' } },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            const cfg = monitorStats[context.dataset.id];
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(cfg.decimals)}${cfg.unit}`;
                        }
                    }
                }
            }
        }
    });
}

function setupInitialCharts() {
    const netCtx = document.getElementById('netCombinedChart');
    if (netCtx) {
        monitorStats['net_combined'] = { chart: initializeCombinedChart(netCtx, ['net_download', 'net_upload']) };
    }

    const perfCtx = document.getElementById('perfCombinedChart');
    if (perfCtx) {
        monitorStats['perf_combined'] = { chart: initializeCombinedChart(perfCtx, ['cpu_usage', 'ram_usage', 'gpu-0-load']) };
    }

    initializeChart(document.getElementById('ramFreeChart'), 'ram_free');
    initializeChart(document.getElementById('netConnectionsChart'), 'net_connections');
    initializeChart(document.getElementById('gpu0memoryUsedChart'), 'gpu-0-memoryUsed');
    initializeChart(document.getElementById('gpu0temperatureChart'), 'gpu-0-temperature');
}
function resetAllCharts() {
    chartDataIndex = 0;
    for (const key in monitorStats) {
        if (monitorStats[key].chart) {
            monitorStats[key].chart.destroy();
            monitorStats[key].chart = null;
        }
        monitorStats[key].history = [];
    }
    setupInitialCharts();
}

// NOWA FUNKCJA: Zapisywanie aktualnego odczytu (skopiowana z script.js)
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

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.container-charts')) {
        setupInitialCharts();

        setInterval(async () => {
            const response = await fetch(API_URL);
            const data = await response.json();

            for (const key in monitorStats) {
                if (data[key] !== undefined && monitorStats[key].history) {
                    monitorStats[key].history.push({ x: chartDataIndex, y: parseFloat(data[key]) });
                    if (monitorStats[key].history.length > MAX_CHART_DATA_POINTS) {
                        monitorStats[key].history.shift();
                    }
                }
            }

            if (data.gpu_stats?.[0]) {
                const gpu = data.gpu_stats[0];
                [
                    { key: 'gpu-0-memoryUsed', value: gpu.memoryUsed },
                    { key: 'gpu-0-temperature', value: gpu.temperature },
                    { key: 'gpu-0-load', value: gpu.load }
                ].forEach(({ key, value }) => {
                    monitorStats[key].history.push({ x: chartDataIndex, y: parseFloat(value) });
                    if (monitorStats[key].history.length > MAX_CHART_DATA_POINTS)
                        monitorStats[key].history.shift();
                });
            }

            for (const key in monitorStats) {
                const ms = monitorStats[key];
                if (ms.chart && ms.chart.data) {
                    ms.chart.data.datasets.forEach(ds => {
                        const s = monitorStats[ds.id];
                        if (s && s.history) ds.data = s.history;
                    });
                    ms.chart.options.scales.x.min = Math.max(0, chartDataIndex - MAX_CHART_DATA_POINTS + 1);
                    ms.chart.options.scales.x.max = chartDataIndex + 1;
                    ms.chart.update('none');
                }
            }

            chartDataIndex++;

            const resetBtn = document.getElementById('reset-stats-button-charts');
            if (resetBtn && !resetBtn.dataset.bound) {
                resetBtn.addEventListener('click', resetAllCharts);
                resetBtn.dataset.bound = 'true';
            }
        }, 1000);

        // DODANIE OBSŁUGI PRZYCISKU ZAPISU
        const saveButton = document.getElementById('save-readout-button');
        if (saveButton) {
            saveButton.addEventListener('click', saveCurrentReadout);
        }
    }
});

