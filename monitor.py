import psutil
import GPUtil
import cpuinfo
import time

last_net_io_counters = None
last_net_io_time = None
def get_system_stats():
    """Zbiera aktualne statystyki systemu."""
    global last_net_io_counters 
    global last_net_io_time 

    # CPU
    # Użycie CPU w ciągu ostatniego interwału (od ostatniego wywołania cpu_percent())
    cpu_percent = psutil.cpu_percent(interval=0.1)  # Używamy 0.1 sekundy jako interwału, aby uzyskać aktualne dane
    # Taktowanie podstawowe CPU
    cpu_basic_speed = psutil.cpu_freq()
    cpu_current_basic_speed = round(cpu_basic_speed.current / 1000, 2) if cpu_basic_speed else "N/A"

    # Nowe dane CPU z cpuinfo i psutil
    processor_name = "N/A"
    l2_cache = "N/A"
    l3_cache = "N/A"
    cores_physical = "N/A"
    cores_logical = "N/A"
    try:
        info = cpuinfo.get_cpu_info()
        processor_name = info.get('brand_raw', 'N/A')
        # psutil nie zawsze podaje te dane bezpośrednio, więc próbujemy z cpuinfo
        l2_cache = info.get('l2_cache_size', 'N/A')
        if l2_cache != 'N/A' and l2_cache is not None:
             l2_cache = f"{round(l2_cache / (1024 * 1024), 2)} MB" # Konwersja na MB
        l3_cache = info.get('l3_cache_size', 'N/A')
        if l3_cache != 'N/A' and l3_cache is not None:
            l3_cache = f"{round(l3_cache / (1024 * 1024), 2)} MB" # Konwersja na MB

        cores_physical = psutil.cpu_count(logical=False)
        cores_logical = psutil.cpu_count(logical=True)

    except Exception as e:
        print(f"Błąd podczas zbierania informacji o CPU: {e}")

    # RAM
    ram = psutil.virtual_memory()
    ram_usage_percent = ram.percent
    ram_total_gb = round(ram.total / (1024**3), 2)
    ram_free_gb = round(ram.available / (1024**3), 2)

    # Dysk
    disk = psutil.disk_usage('/') # 'C:\\' na Windows, '/' na Linux/macOS
    disk_usage_percent = disk.percent
    disk_total_gb = round(disk.total / (1024**3), 2)
    disk_free_gb = round(disk.free / (1024**3), 2)

    # Sieć
    net_io_new = psutil.net_io_counters()
    net_download_kbs = 0
    net_upload_kbs = 0
    if last_net_io_counters and last_net_io_time:
        time_diff = time.time() - last_net_io_time
        if time_diff > 0:
            # Różnica w bajtach, konwersja na KB/s
            net_download_kbs = round((net_io_new.bytes_recv - last_net_io_counters.bytes_recv) / 1024 / time_diff, 0)
            net_upload_kbs = round((net_io_new.bytes_sent - last_net_io_counters.bytes_sent) / 1024 / time_diff, 0)

    last_net_io_counters = net_io_new
    last_net_io_time = time.time()

    # Aktywne połączenia sieciowe
    net_connections = len(psutil.net_connections(kind='inet')) # Tylko połączenia internetowe

    # GPU (tylko NVIDIA z GPUtil)
    gpu_stats = []
    try:
        gpus = GPUtil.getGPUs()
        for gpu in gpus:
            gpu_stats.append({
                "id": gpu.id,
                "name": gpu.name,
                "load": round(gpu.load * 100, 2), # Obciążenie w %
                "memoryUsed": round(gpu.memoryUsed / 1024, 2), # Pamięć w GB
                "memoryTotal": round(gpu.memoryTotal / 1024, 2), # Pamięć w GB
                "memoryFree": round(gpu.memoryFree / 1024, 2),   # Pamięć w GB
                "temperature": gpu.temperature # Temperatura w °C
            })
    except Exception as e:
        print(f"Błąd podczas pobierania danych GPU: {e}. Upewnij się, że masz sterowniki NVIDIA i narzędzie nvidia-smi zainstalowane i działające.")
        # Możesz tutaj dodać placeholder, jeśli chcesz, aby frontend wiedział, że GPU nie jest dostępne
        gpu_stats = [] # Ustaw pustą listę, jeśli błąd


    return {
        "cpu_usage": cpu_percent,
        "cpu_current_basic_speed": cpu_current_basic_speed,
        "processor_name": processor_name, 
        "l2_cache": l2_cache,             
        "l3_cache": l3_cache,             
        "cores_physical": cores_physical, 
        "cores_logical": cores_logical,   
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

# wersja do wykresów – tylko dane liczbowe, aktualizowane szybko
def get_chart_stats():
    data = {
        "cpu_usage": psutil.cpu_percent(interval=0.1),
        "ram_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
        "net_download": 0,
        "net_upload": 0,
        "gpu_stats": []
    }

    try:
        gpus = GPUtil.getGPUs()
        for gpu in gpus:
            data["gpu_stats"].append({
                "id": gpu.id,
                "name": gpu.name,
                "load": round(gpu.load * 100, 2),
                "memoryUsed": round(gpu.memoryUsed / 1024, 2),
                "temperature": gpu.temperature
            })
    except Exception:
        pass

    return data
