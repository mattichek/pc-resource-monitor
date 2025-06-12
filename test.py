import cpuinfo

info = cpuinfo.get_cpu_info()
x = cpuinfo.get_cpu_info_json()
print(x)

for key, value in info.items():
    print(f"{key}: {value}")