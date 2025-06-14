import psutil
import GPUtil
import cpuinfo
import time

# wersja do wyświetlania ogólnych informacji
def get_system_stats():
    return {
        "cpu_usage": psutil.cpu_percent(interval=None),
        "cpu_clock": round(psutil.cpu_freq().current / 1000, 2),
        "processor_name": cpuinfo.get_cpu_info().get('brand_raw', 'N/A'),
        "ram_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
        "net_connections": len(psutil.net_connections(kind='inet'))
    }

# wersja do wykresów – tylko dane liczbowe, aktualizowane szybko
def get_chart_stats():
    data = {
        "cpu_usage": psutil.cpu_percent(interval=None),
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
