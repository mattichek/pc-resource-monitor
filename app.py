# app.py
import threading
import psutil
from flask import Flask, render_template, jsonify
from flask_cors import CORS
import time
import GPUtil
import cpuinfo # Dodajemy import cpuinfo

from monitor import get_system_stats, get_chart_stats

app = Flask(__name__)
CORS(app) # Włączamy CORS dla całej aplikacji, aby frontend mógł się łączyć


stats_data = {}
charts_data = {}

# Blokady do bezpiecznego dostępu wielowątkowego
stats_lock = threading.Lock()
charts_lock = threading.Lock()

# Wątek do zbierania danych dla index.html
def stats_collector_loop():
    global stats_data
    while True:
        data = get_system_stats()
        with stats_lock:
            stats_data = data
        time.sleep(1)

# Wątek do zbierania danych dla charts.html
def charts_collector_loop():
    global charts_data
    while True:
        data = get_chart_stats()
        with charts_lock:
            charts_data = data
        time.sleep(1)

# Start obu pętli zbierających dane
threading.Thread(target=stats_collector_loop, daemon=True).start()
threading.Thread(target=charts_collector_loop, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/charts')
def charts():
    return render_template('charts.html')


@app.route('/api/stats')
def api_stats():
    with stats_lock:
        return jsonify(stats_data)


@app.route('/api/charts_data')
def api_charts_data():
    with charts_lock:
        return jsonify(charts_data)

if __name__ == '__main__':
    app.run(debug=True)