import cpuinfo
import psutil

x = psutil.sensors_temperatures()
print(x)