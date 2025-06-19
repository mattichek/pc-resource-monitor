import threading
import psutil
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import time
import GPUtil
import cpuinfo
import json
from datetime import datetime

from monitor import get_system_stats, get_chart_stats

# === Dodane dla Bazy Danych ===
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError

# Konfiguracja bazy danych SQLite
DATABASE_URL = "sqlite:///system_stats.db"
engine = create_engine(DATABASE_URL, echo=False) # echo=True do debugowania zapytań SQL
Base = declarative_base()

class SavedStat(Base):
    __tablename__ = 'saved_stats'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.now)
    # Zapisujemy wszystkie statystyki jako JSON w jednej kolumnie
    stats_json = Column(Text, nullable=False)

    def __repr__(self):
        return f"<SavedStat(id={self.id}, timestamp='{self.timestamp}')>"

# Utwórz tabelę w bazie danych, jeśli nie istnieje
def init_db():
    Base.metadata.create_all(engine)

# Funkcja do dodawania statystyk do bazy danych
def add_stats_to_db(stats_data):
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        # Konwertujemy słownik statystyk na string JSON
        stats_json_str = json.dumps(stats_data)
        new_stat = SavedStat(stats_json=stats_json_str)
        session.add(new_stat)
        session.commit()
        return True
    except SQLAlchemyError as e:
        print(f"Błąd podczas zapisu do bazy danych: {e}")
        session.rollback()
        return False
    finally:
        session.close()

# Funkcja do pobierania ostatnich N statystyk
def get_latest_n_chart_stats_from_buffer(n=50):
    with charts_lock:
        # Zapewniamy, że buffer jest bezpiecznie kopiowany i przycinany
        return list(charts_history)[:n]

# ================================

app = Flask(__name__)
CORS(app)

stats_data = {}
charts_data = {}
charts_history = [] # Nowa lista do przechowywania historii dla wykresów
MAX_CHART_HISTORY = 50 # Maksymalna liczba odczytów do przechowywania w pamięci

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
    global charts_history
    while True:
        data = get_chart_stats()
        with charts_lock:
            charts_data = data
            charts_history.append({"data": data}) # Dodajemy timestamp i dane
            # Utrzymujemy historię do MAX_CHART_HISTORY elementów
            if len(charts_history) > MAX_CHART_HISTORY:
                charts_history.pop(0) # Usuwamy najstarszy element
        time.sleep(1)

# Start obu pętli zbierających dane
threading.Thread(target=stats_collector_loop, daemon=True).start()
threading.Thread(target=charts_collector_loop, daemon=True).start()

# Inicjalizacja bazy danych przy starcie aplikacji
with app.app_context():
    init_db()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/charts')
def charts():
    return render_template('charts.html')

# Nowy endpoint do wyświetlania zapisanych statystyk
@app.route('/saved_charts')
def saved_charts():
    Session = sessionmaker(bind=engine)
    session = Session()
    records = []
    try:
        # Pobierz wszystkie zapisane rekordy, posortowane malejąco po dacie
        records = session.query(SavedStat).order_by(SavedStat.timestamp.desc()).all()
    except SQLAlchemyError as e:
        print(f"Błąd podczas pobierania zapisanych statystyk: {e}")
    finally:
        session.close()
    return render_template('saved_charts.html', records=records)


@app.route('/api/stats')
def get_stats():
    with stats_lock:
        return jsonify(stats_data)

@app.route('/api/charts_data')
def get_charts_data():
    with charts_lock:
        return jsonify(charts_data)

# Nowy endpoint do zapisywania ostatnich 50 odczytów
@app.route('/api/save_current_stats', methods=['POST'])
def save_current_stats():
    # Pobierz ostatnie N odczytów z bufora charts_history
    latest_chart_stats = get_latest_n_chart_stats_from_buffer(50)

    if not latest_chart_stats:
        return jsonify({"message": "Brak danych do zapisania."}), 404

    # Utwórz pojedynczy obiekt do zapisu, który będzie zawierał listę odczytów
    # Dodajemy timestamp zapisu dla łatwej identyfikacji
    save_timestamp = datetime.now()
    data_to_save = {
        "save_timestamp": save_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        "readings": latest_chart_stats
    }

    if add_stats_to_db(data_to_save):
        return jsonify({"message": f"Zapisano {len(latest_chart_stats)} odczytów statystyk z {save_timestamp.strftime('%Y-%m-%d %H:%M:%S')}."}), 200
    else:
        return jsonify({"message": "Nie udało się zapisać statystyk."}), 500

# Nowy endpoint do pobierania konkretnego zapisanego zestawu statystyk po ID
@app.route('/api/get_saved_stats/<int:record_id>')
def get_saved_stats_by_id(record_id):
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        saved_record = session.query(SavedStat).get(record_id)
        if saved_record:
            # Parsujemy JSON z powrotem do obiektu Pythona
            stats_data = json.loads(saved_record.stats_json)
            return jsonify(stats_data), 200
        else:
            return jsonify({"message": "Zapisany rekord nie znaleziony."}), 404
    except SQLAlchemyError as e:
        print(f"Błąd podczas pobierania zapisanego rekordu o ID {record_id}: {e}")
        return jsonify({"message": "Błąd serwera podczas pobierania danych."}), 500
    finally:
        session.close()


if __name__ == '__main__':
    app.run(debug=True)