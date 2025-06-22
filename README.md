# ZSI Monitor Zasobów Komputera

Aplikacja webowa do monitorowania zasobów komputera w czasie rzeczywistym oraz przeglądania danych historycznych. Projekt został zrealizowany z wykorzystaniem frameworka Flask (Python) dla warstwy backendowej oraz HTML, CSS i JavaScript (z Chart.js) dla warstwy front-endowej.

## Spis treści

  - [ZSI Monitor Zasobów Komputera](https://www.google.com/search?q=%23zsi-monitor-zasob%C3%B3w-komputera)
      - [Spis treści](https://www.google.com/search?q=%23spis-tre%C5%9Bci)
      - [Opis Projektu](https://www.google.com/search?q=%23opis-projektu)
      - [Funkcjonalności](https://www.google.com/search?q=%23funkcjonalno%C5%9Bci)
      - [Technologie](https://www.google.com/search?q=%23technologie)
      - [Instalacja](https://www.google.com/search?q=%23instalacja)
          - [Wymagania wstępne](https://www.google.com/search?q=%23wymagania-wst%C4%99pne)
          - [Klonowanie repozytorium](https://www.google.com/search?q=%23klonowanie-repozytorium)
          - [Instalacja zależności](https://www.google.com/search?q=%23instalacja-zale%C5%BCno%C5%9Bci)
          - [Uruchomienie aplikacji](https://www.google.com/search?q=%23uruchomienie-aplikacji)
      - [Struktura Projektu](https://www.google.com/search?q=%23struktura-projektu)
      - [Użycie](https://www.google.com/search?q=%23u%C5%BCycie)
          - [Ekran główny (Monitor)](https://www.google.com/search?q=%23ekran-g%C5%82%C3%B3wny-monitor)
          - [Wykresy Live](https://www.google.com/search?q=%23wykresy-live)
          - [Historia](https://www.google.com/search?q=%23historia)
      - [Potencjał Rozwoju](https://www.google.com/search?q=%23potencja%C5%82-rozwoju)
      - [Autorzy](https://www.google.com/search?q=%23autorzy)

## Opis Projektu

ZSI Monitor Zasobów Komputera to intuicyjna aplikacja webowa, która umożliwia użytkownikom monitorowanie kluczowych parametrów pracy ich systemu komputerowego. Aplikacja zbiera i wyświetla dane dotyczące zużycia procesora (CPU), pamięci RAM, przestrzeni dyskowej, aktywności sieciowej oraz obciążenia i temperatury karty graficznej (GPU). Dodatkowo, oferuje możliwość zapisywania bieżących odczytów i przeglądania danych historycznych w formie interaktywnych wykresów.

Projekt symuluje pełen cykl tworzenia oprogramowania, od idei, przez iteracyjny rozwój w sprintach, po fazy testowania i zbierania feedbacku, co pozwoliło na elastyczne reagowanie na potrzeby i systematyczne rozbudowywanie funkcjonalności.

## Funkcjonalności

  * **Monitorowanie w czasie rzeczywistym:** Wyświetlanie aktualnych statystyk CPU, RAM, dysku, sieci i GPU.
  * **Szczegółowe informacje o podzespołach:** Podstawowe dane o procesorze (nazwa, rdzenie, pamięć podręczna) oraz GPU (nazwa, użycie pamięci).
  * **Wykresy Live:** Dynamiczne wykresy przedstawiające historię zużycia kluczowych zasobów w krótkim okresie.
  * **Zapisywanie odczytów:** Możliwość zapisania bieżących statystyk do bazy danych SQLite.
  * **Przeglądanie historii:** Dostęp do zapisanych odczytów historycznych i ich wizualizacja na wykresach.
  * **Usuwanie danych historycznych:** Funkcjonalność usuwania pojedynczych zapisanych odczytów.
  * **Alertowanie:** Wizualne alerty informujące o wysokim zużyciu zasobów (CPU, RAM, Dysk, GPU, Temperatura GPU).
  * **Śledzenie min/max:** Wyświetlanie najniższych i najwyższych wartości dla monitorowanych parametrów.
  * **Responsywny interfejs:** Dostosowanie wyglądu aplikacji do różnych rozmiarów ekranów.

## Technologie

  * **Backend:**
      * **Python 3.x:** Główny język programowania.
      * **Flask:** Lekki framework webowy Pythona do budowy API i serwowania stron.
      * **`psutil`:** Biblioteka do uzyskiwania informacji o procesach i wykorzystaniu systemu (CPU, RAM, dysk, sieć).
      * **`GPUtil`:** Biblioteka do monitorowania statystyk GPU (wspiera NVIDIA).
      * **`cpuinfo`:** Biblioteka do pobierania szczegółowych informacji o procesorze.
      * **`sqlite3`:** Moduł Pythona do interakcji z bazą danych SQLite.
      * **`threading`:** Do zbierania statystyk w tle.
      * **`logging`:** Do zarządzania logami aplikacji.
  * **Frontend:**
      * **HTML5:** Struktura strony.
      * **CSS3:** Stylizacja interfejsu (plik `style.css`).
      * **JavaScript (Vanilla JS):** Interaktywność i pobieranie danych z API.
      * **Chart.js:** Biblioteka do generowania dynamicznych i interaktywnych wykresów.
  * **Zarządzanie projektem:**
      * **Jira Software:** Do śledzenia zadań, błędów i postępów w projekcie.
      * **Git:** System kontroli wersji.

## Instalacja

Poniższe instrukcje pomogą w uruchomieniu aplikacji na lokalnej maszynie.

### Wymagania wstępne

Upewnij się, że masz zainstalowane następujące oprogramowanie:

  * Python 3.x
  * pip (menedżer pakietów Pythona)

### Klonowanie repozytorium

```bash
git clone https://github.com/TwojaNazwaUzytkownika/ZSI-Monitor-Zasobow-Komputera.git
cd ZSI-Monitor-Zasobow-Komputera
```

### Instalacja zależności

Utwórz wirtualne środowisko (zalecane) i zainstaluj niezbędne pakiety:

```bash
python -m venv venv
# Aktywuj wirtualne środowisko:
# Na Windowsie:
.\venv\Scripts\activate
# Na macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**Uwaga:** Plik `requirements.txt` powinien zawierać:

```
Flask
psutil
GPUtil
cpuinfo
Flask-Cors
```

### Uruchomienie aplikacji

Po zainstalowaniu zależności, możesz uruchomić aplikację:

```bash
python app.py
```

Aplikacja będzie dostępna pod adresem: `http://127.0.0.1:5000/`

## Struktura Projektu

```
ZSI-Monitor-Zasobow-Komputera/
├── app.py                      # Główny plik aplikacji Flask
├── monitor.py                  # Moduł do zbierania statystyk systemowych
├── monitor_history.db          # Baza danych SQLite (generowana automatycznie przy pierwszym uruchomieniu)
├── static/
│   ├── css/
│   │   └── style.css           # Plik stylów CSS
│   └── js/
│       ├── charts-script.js    # Skrypty JS dla strony wykresów live
│       ├── history-charts-script.js # Skrypty JS dla strony historii
│       └── script.js           # Skrypty JS dla strony głównej monitora
└── templates/
    ├── charts.html             # Strona z wykresami live
    ├── history.html            # Strona z historią odczytów
    └── index.html              # Strona główna monitora
```

## Użycie

### Ekran główny (Monitor)

Po uruchomieniu aplikacji, otworzy się strona główna (`index.html`), gdzie zobaczysz aktualne statystyki zasobów. Na tej stronie dostępne są również przyciski do:

  * `Pokaż wykresy Live`: Przenosi do strony z dynamicznymi wykresami.
  * `Pokaż Historię`: Przenosi do strony z zapisanymi odczytami historycznymi.
  * `Resetuj statystyki min/max`: Resetuje wyświetlane wartości minimalne i maksymalne.
  * `Zapisz aktualny odczyt`: Zapisuje bieżący zestaw statystyk do bazy danych.

### Wykresy Live

Strona `charts.html` (`/charts`) prezentuje wykresy w czasie rzeczywistym dla najważniejszych parametrów, takich jak zużycie CPU, RAM, GPU oraz ruch sieciowy. Wykresy są aktualizowane na bieżąco, oferując dynamiczną wizualizację.

### Historia

Strona `history.html` (`/history`) pozwala na przeglądanie zapisanych odczytów. Możesz wybrać konkretny odczyt z listy i zobaczyć jego szczegółowe dane na wykresach. Istnieje również możliwość usunięcia wybranego odczytu.

## Potencjał Rozwoju

Projekt ma duży potencjał do dalszego rozwoju, w tym:

  * **Alerty i powiadomienia:** Implementacja progów zużycia zasobów i wysyłanie powiadomień (np. e-mail, push).
  * **Konfigurowalne interwały:** Możliwość zmiany częstotliwości odświeżania danych przez użytkownika.
  * **Monitorowanie procesów:** Dodanie listy aktywnych procesów i ich zużycia zasobów.
  * **Autoryzacja użytkowników:** Wprowadzenie systemu logowania i zarządzania użytkownikami dla środowisk wielodostępnych.
  * **Rozbudowane bazy danych:** Migracja z SQLite na bardziej skalowalną bazę danych (np. PostgreSQL, MySQL) dla dużych ilości danych historycznych.
  * **Dokumentacja:** Stworzenie bardziej szczegółowej dokumentacji technicznej i użytkowej.
  * **Skaner kodów:** Chociaż nie jest bezpośrednio związane z obecną funkcjonalnością monitorowania, sugestia "skaner kodu QR" z wniosków wskazuje na potencjalne rozszerzenie aplikacji o obsługę kodów kreskowych/QR do identyfikacji monitorowanych urządzeń lub zasobów fizycznych.

## Autorzy

  * Mateusz Zaskórski
  * Jakub Kwaśniewski
  * Patryk Hałacz
  * Patryk Foja
