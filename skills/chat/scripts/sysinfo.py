#!/usr/bin/env python3
"""
系统信息脚本

用法: python3 sysinfo.py [--type <info_type>]

支持的 info_type:
  - cpu: CPU 信息
  - memory: 内存信息
  - disk: 磁盘信息
  - network: 网络信息
  - all: 所有信息（默认）

输出格式 (JSON)
"""

import json
import platform
import sys
from datetime import datetime

def get_cpu_info():
    """获取 CPU 信息"""
    try:
        import multiprocessing
        cpu_count = multiprocessing.cpu_count()
    except:
        cpu_count = "unknown"

    return {
        "processor": platform.processor(),
        "cpu_count": cpu_count,
        "architecture": platform.machine(),
        "system": platform.system(),
        "release": platform.release(),
    }

def get_memory_info():
    """获取内存信息"""
    try:
        import psutil
        mem = psutil.virtual_memory()
        return {
            "total_gb": round(mem.total / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "used_percent": mem.percent,
        }
    except ImportError:
        return {"error": "psutil not installed"}

def get_disk_info():
    """获取磁盘信息"""
    try:
        import psutil
        disk = psutil.disk_usage('/')
        return {
            "total_gb": round(disk.total / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "used_percent": round(disk.used / disk.total * 100, 2),
        }
    except ImportError:
        return {"error": "psutil not installed"}
    except Exception as e:
        return {"error": str(e)}

def get_network_info():
    """获取网络信息"""
    try:
        import psutil
        net = psutil.net_io_counters()
        return {
            "bytes_sent_mb": round(net.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net.bytes_recv / (1024**2), 2),
        }
    except ImportError:
        return {"error": "psutil not installed"}

def get_all_info():
    """获取所有系统信息"""
    return {
        "timestamp": datetime.now().isoformat(),
        "hostname": platform.node(),
        "python_version": platform.python_version(),
        "cpu": get_cpu_info(),
        "memory": get_memory_info(),
        "disk": get_disk_info(),
        "network": get_network_info(),
    }

def main():
    info_type = "all"

    # 解析参数
    args = sys.argv[1:]
    for i in range(len(args)):
        if args[i] == "--type" and i + 1 < len(args):
            info_type = args[i + 1].lower()
            break

    # 获取信息
    if info_type == "cpu":
        result = get_cpu_info()
    elif info_type == "memory":
        result = get_memory_info()
    elif info_type == "disk":
        result = get_disk_info()
    elif info_type == "network":
        result = get_network_info()
    else:
        result = get_all_info()

    # 输出 JSON
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
