import psutil
from flask import Flask, render_template, jsonify
from flask_cors import CORS
import time
import GPUtil
import cpuinfo # Dodajemy import cpuinfo

app = Flask(__name__)
CORS(app) # Włączamy CORS dla całej aplikacji, aby frontend mógł się łączyć

# Zmienne globalne do przechowywania poprzednich danych sieciowych
last_net_io_counters = None
last_net_io_time = None

def get_system_stats():
    """Zbiera aktualne statystyki systemu."""
    global last_net_io_counters
    global last_net_io_time

    # CPU
    # Użycie CPU w ciągu ostatniego interwału (od ostatniego wywołania cpu_percent())
    cpu_percent = psutil.cpu_percent(interval=1)  # Używamy 1 sekundy jako interwału, aby uzyskać aktualne dane

    # Taktowanie CPU
    cpu_freq = psutil.cpu_freq()
    # Konwertujemy na GHz i zaokrąglamy do 2 miejsc po przecinku
    cpu_current_freq = round(cpu_freq.current / 1000, 2) if cpu_freq else "N/A"

    # Nowe dane CPU z cpuinfo i psutil
    processor_name = "N/A"
    l2_cache = "N/A"
    l3_cache = "N/A"
    cores_physical = "N/A"
    cores_logical = "N/A"

    try:
        info = cpuinfo.get_cpu_info()
        processor_name = info.get('brand_raw', 'Nieznany procesor')
        l2_cache_size = info.get('l2_cache_size')
        l3_cache_size = info.get('l3_cache_size')

        if l2_cache_size is not None:
            l2_cache = f"{l2_cache_size / (1024*1024):.0f} MB"
        if l3_cache_size is not None:
            l3_cache = f"{l3_cache_size / (1024*1024):.0f} MB"

        cores_physical = psutil.cpu_count(logical=False)
        cores_logical = psutil.cpu_count(logical=True)

    except Exception as e:
        print(f"Błąd podczas pobierania danych CPU z cpuinfo/psutil: {e}")


    # RAM
    ram = psutil.virtual_memory()
    ram_usage_percent = ram.percent
    ram_total_gb = round(ram.total / (1024**3), 2)
    ram_free_gb = round(ram.available / (1024**3), 2)

    # Disk
    disk_usage_percent = "N/A"
    disk_total_gb = "N/A"
    disk_free_gb = "N/A"
    try:
        # Próbujemy 'C:\' dla Windows, inaczej '/' dla Linux/macOS
        # Jeśli masz wiele partycji, możesz dodać logikę do wyboru konkretnej
        disk_usage = psutil.disk_usage('C:\\' if psutil.WINDOWS else '/')
        disk_usage_percent = disk_usage.percent
        disk_total_gb = round(disk_usage.total / (1024**3), 2)
        disk_free_gb = round(disk_usage.free / (1024**3), 2)
    except Exception as e:
        print(f"Błąd podczas pobierania danych dysku: {e}")


    # Network (wymaga dwóch odczytów, aby obliczyć prędkość)
    current_net_io_counters = psutil.net_io_counters()
    current_net_io_time = time.time()

    net_upload_kbs = 0
    net_download_kbs = 0

    if last_net_io_counters is not None and last_net_io_time is not None:
        time_diff = current_net_io_time - last_net_io_time
        if time_diff > 0:
            bytes_sent_diff = current_net_io_counters.bytes_sent - last_net_io_counters.bytes_sent
            bytes_recv_diff = current_net_io_counters.bytes_recv - last_net_io_counters.bytes_recv

            net_upload_kbs = round((bytes_sent_diff / 1024) / time_diff, 0) # KB/s
            net_download_kbs = round((bytes_recv_diff / 1024) / time_diff, 0) # KB/s

    last_net_io_counters = current_net_io_counters
    last_net_io_time = current_net_io_time

    # Aktywne połączenia sieciowe
    net_connections = len(psutil.net_connections(kind='inet'))

    # GPU
    gpu_stats = []
    try:
        gpus = GPUtil.getGPUs()
        for gpu in gpus:
            gpu_stats.append({
                "id": gpu.id,
                "name": gpu.name,
                "load": round(gpu.load * 100, 0), # Obciążenie w %
                "memoryTotal": round(gpu.memoryTotal / 1024, 2), # Konwertuj na GB
                "memoryUsed": round(gpu.memoryUsed / 1024, 2),   # Konwertuj na GB
                "memoryFree": round(gpu.memoryFree / 1024, 2),   # Konwertuj na GB
                "temperature": round(gpu.temperature, 0) # Temperatura w °C
            })
    except Exception as e:
        print(f"Błąd podczas pobierania danych GPU: {e}. Upewnij się, że masz sterowniki NVIDIA i narzędzie nvidia-smi zainstalowane i działające.")
        # Możesz tutaj dodać placeholder, jeśli chcesz, aby frontend wiedział, że GPU nie jest dostępne
        gpu_stats = [] # Ustaw pustą listę, jeśli błąd


    return {
        "cpu_usage": cpu_percent,
        "cpu_clock": cpu_current_freq,
        "processor_name": processor_name, # Nowe dane
        "l2_cache": l2_cache,             # Nowe dane
        "l3_cache": l3_cache,             # Nowe dane
        "cores_physical": cores_physical, # Nowe dane
        "cores_logical": cores_logical,   # Nowe dane
        "ram_usage": ram_usage_percent,
        "ram_total": ram_total_gb,
        "ram_free": ram_free_gb,
        "disk_usage": disk_usage_percent,
        "disk_total": disk_total_gb,
        "disk_free": disk_free_gb,
        "net_download": net_download_kbs,
        "net_upload": net_upload_kbs,
        "net_connections": net_connections,
        "gpu_stats": gpu_stats
    }

# Endpoint dla strony głównej (renderuje nasz HTML)
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint API do pobierania danych o zasobach
@app.route('/api/stats')
def get_stats():
    stats = get_system_stats()
    return jsonify(stats)

if __name__ == '__main__':
    psutil.cpu_percent(interval=None)
    app.run(host='0.0.0.0', port=5000, debug=True)