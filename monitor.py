# monitor.py
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
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_basic_speed = psutil.cpu_freq()
    cpu_current_basic_speed = round(cpu_basic_speed.current / 1000, 2) if cpu_basic_speed else "N/A"

    processor_name = "N/A"
    l2_cache = "N/A"
    l3_cache = "N/A"
    cores_physical = "N/A"
    cores_logical = "N/A"
    try:
        info = cpuinfo.get_cpu_info()
        processor_name = info.get('brand_raw', 'N/A')
        l2_cache = info.get('l2_cache_size', 'N/A')
        l3_cache = info.get('l3_cache_size', 'N/A')
        cores_physical = psutil.cpu_count(logical=False)
        cores_logical = psutil.cpu_count(logical=True)
    except Exception:
        pass # Ignore errors if cpuinfo fails

    # RAM
    ram = psutil.virtual_memory()
    ram_usage_percent = ram.percent
    ram_total_gb = round(ram.total / (1024 ** 3), 2)
    ram_free_gb = round(ram.free / (1024 ** 3), 2) # Wolna pamięć w GB

    # Disk
    disk = psutil.disk_usage('/')
    disk_usage_percent = disk.percent
    disk_total_gb = round(disk.total / (1024 ** 3), 2)
    disk_free_gb = round(disk.free / (1024 ** 3), 2)

    # Network
    net_io = psutil.net_io_counters()
    current_time = time.time()

    net_download_kbs = 0
    net_upload_kbs = 0

    if last_net_io_counters and last_net_io_time:
        time_diff = current_time - last_net_io_time
        if time_diff > 0:
            download_diff = net_io.bytes_recv - last_net_io_counters.bytes_recv
            upload_diff = net_io.bytes_sent - last_net_io_counters.bytes_sent

            net_download_kbs = round((download_diff / time_diff) / 1024, 2) # KB/s
            net_upload_kbs = round((upload_diff / time_diff) / 1024, 2)     # KB/s
    
    last_net_io_counters = net_io
    last_net_io_time = current_time

    net_connections = len(psutil.net_connections(kind='inet'))

    # GPU
    gpus = []
    try:
        gpus = GPUtil.getGPUs()
    except Exception:
        pass # Ignoruj błędy, jeśli GPUtil nie działa

    gpu_stats = []
    for i, gpu in enumerate(gpus):
        gpu_stats.append({
            "id": i,
            "name": gpu.name,
            "load": round(gpu.load * 100, 2), # % obciążenia
            "memoryUsed": round(gpu.memoryUsed / 1024, 2), # Pamięć używana w GB
            "memoryTotal": round(gpu.memoryTotal / 1024, 2), # Pamięć całkowita w GB
            "temperature": gpu.temperature
        })

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
        "ram_free": ram_free_gb, # DODANO
        "disk_usage": disk_usage_percent,
        "disk_total": disk_total_gb,
        "disk_free": disk_free_gb,
        "net_download": net_download_kbs, # DODANO
        "net_upload": net_upload_kbs,     # DODANO
        "net_connections": net_connections, # DODANO
        "gpu_stats": gpu_stats
    }

# Usunięto funkcję get_chart_stats(), ponieważ get_system_stats() jest wystarczająca