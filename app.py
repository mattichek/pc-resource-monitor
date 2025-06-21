# app.py
import threading
import psutil
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import time
import GPUtil
import cpuinfo
import json
import sqlite3
from datetime import datetime
import logging

from monitor import get_system_stats # Teraz będziemy używać tylko get_system_stats

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

stats_data = {}
# Usunięto charts_data, bo nie będzie już potrzebne oddzielne zbieranie danych dla charts.html
# Wszystkie dane będą w stats_data
charts_history_buffer = []
MAX_HISTORY_BUFFER_SIZE = 50

stats_lock = threading.Lock()
history_buffer_lock = threading.Lock()

DATABASE_NAME = 'monitor_history.db'

def init_db():
    with sqlite3.connect(DATABASE_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historical_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                data TEXT NOT NULL
            )
        ''')
        conn.commit()
        app.logger.info("Baza danych monitor_history.db zainicjalizowana.")

with app.app_context():
    init_db()

# Wątek do zbierania danych dla index.html, charts.html i bufora historii
def data_collector_loop(): # Zmieniono nazwę, bo zbiera wszystkie dane
    global stats_data, charts_history_buffer
    while True:
        data = get_system_stats() # Używamy tylko get_system_stats
        with stats_lock:
            stats_data = data # Aktualizujemy główne dane statystyk

        with history_buffer_lock:
            # Dodaj aktualne dane do bufora historii (dla charts.html i history.html)
            charts_history_buffer.append(data) # Dodajemy kompletny słownik
            if len(charts_history_buffer) > MAX_HISTORY_BUFFER_SIZE:
                charts_history_buffer.pop(0)
        
        time.sleep(1)

# Start wątku zbierającego dane
threading.Thread(target=data_collector_loop, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/charts')
def charts():
    return render_template('charts.html')

@app.route('/history')
def history():
    return render_template('history.html')

@app.route('/api/stats')
def api_stats():
    with stats_lock:
        # Teraz stats_data zawiera wszystkie potrzebne dane z get_system_stats()
        return jsonify(stats_data)

@app.route('/api/chart_stats')
def api_chart_stats():
    # Zwracamy całą zawartość charts_history_buffer
    with history_buffer_lock:
        return jsonify(charts_history_buffer)

@app.route('/api/save_current_readout', methods=['POST'])
def save_current_readout():
    with history_buffer_lock:
        if not charts_history_buffer:
            app.logger.warning("Attempted to save, but history buffer is empty.")
            return jsonify({"status": "error", "message": "Brak danych do zapisu."}), 400

        data_to_save = list(charts_history_buffer)
        charts_history_buffer.clear()
    
    timestamp = datetime.now().isoformat()
    try:
        with sqlite3.connect(DATABASE_NAME) as conn:
            cursor = conn.cursor()
            json_data_str = json.dumps(data_to_save)
            cursor.execute("INSERT INTO historical_data (timestamp, data) VALUES (?, ?)", 
                           (timestamp, json_data_str))
            conn.commit()
        app.logger.info(f"Pomyślnie zapisano {len(data_to_save)} rekordów odczytów historycznych z timestampem {timestamp}.")
        return jsonify({"status": "success", "message": "Odczyt zapisany pomyślnie!"})
    except Exception as e:
        app.logger.error(f"Błąd podczas zapisu odczytu do DB: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/get_historical_readouts')
def get_historical_readouts():
    try:
        with sqlite3.connect(DATABASE_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, timestamp FROM historical_data ORDER BY timestamp DESC")
            readouts = cursor.fetchall()
            
            formatted_readouts = [
                {"id": row[0], "timestamp": row[1]} for row in readouts
            ]
        app.logger.info(f"Pobrano {len(formatted_readouts)} odczytów historycznych z bazy danych.")
        return jsonify(formatted_readouts)
    except Exception as e:
        app.logger.error(f"Błąd serwera podczas pobierania listy odczytów historycznych: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/get_historical_data/<int:readout_id>')
def get_historical_data(readout_id):
    try:
        app.logger.info(f"Próba pobrania danych historycznych dla ID odczytu: {readout_id}")
        with sqlite3.connect(DATABASE_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM historical_data WHERE id = ?", (readout_id,))
            result = cursor.fetchone()
            
            if result:
                historical_data = json.loads(result[0])
                app.logger.info(f"Pomyślnie sparsowano dane JSON dla ID {readout_id}.")
                return jsonify(historical_data)
            else:
                app.logger.warning(f"Nie znaleziono odczytu dla ID: {readout_id}")
                return jsonify({"status": "error", "message": "Odczyt nie znaleziony"}), 404
    except json.JSONDecodeError as e:
        app.logger.error(f"Błąd dekodowania JSON dla ID odczytu {readout_id}: {e}")
        return jsonify({"status": "error", "message": f"Błąd dekodowania JSON danych historycznych: {e}"}), 500
    except Exception as e:
        app.logger.error(f"Błąd serwera podczas pobierania danych historycznych dla ID {readout_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/delete_historical_readout/<int:readout_id>', methods=['DELETE'])
def delete_historical_readout(readout_id):
    try:
        app.logger.info(f"Próba usunięcia danych historycznych dla ID odczytu: {readout_id}")
        with sqlite3.connect(DATABASE_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM historical_data WHERE id = ?", (readout_id,))
            conn.commit()
            if cursor.rowcount > 0:
                app.logger.info(f"Pomyślnie usunięto odczyt ID: {readout_id}")
                return jsonify({"status": "success", "message": "Odczyt usunięty pomyślnie!"})
            else:
                app.logger.warning(f"Nie znaleziono odczytu z ID {readout_id} do usunięcia.")
                return jsonify({"status": "error", "message": "Odczyt nie znaleziony lub już usunięty"}), 404
    except Exception as e:
        app.logger.error(f"Błąd serwera podczas usuwania danych historycznych dla ID {readout_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)