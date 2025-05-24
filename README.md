# Projekt Zaliczeniowy: Monitor Zasobów Serwera/Komputera z Wizualizacją

## Wprowadzenie

Niniejszy dokument przedstawia plan projektu zaliczeniowego z przedmiotu *Zarządzanie Systemami Informacyjnymi*, którego celem jest stworzenie prostego monitora zasobów serwera/komputera z wizualizacją danych historycznych. Projekt będzie realizowany przez zespół 4 osób w ciągu 4-5 tygodni.

---

## Wybór Technologii

**System operacyjny docelowy:** Windows 10/11.

**Moduł zbierający dane (Backend):** Python.

**Frontend (Aplikacja Desktopowa):** Biorąc pod uwagę wymagania projektu i preferencje dla aplikacji desktopowej, sugerujemy:
* **Python z biblioteką GUI (np. PyQt/PySide6):** Jeśli zależy nam na spójności technologicznej i wykorzystaniu jednego języka programowania. PyQt/PySide6 oferują nowoczesny wygląd i bogate możliwości.
* **C# (.NET WinForms/WPF):** Jeśli zespół chce zdobyć doświadczenie w technologii Microsoftu i stworzyć aplikację o bardziej "natywnym" wyglądzie Windows. Wymagałoby to komunikacji między modułem Pythona a aplikacją C# (np. poprzez REST API lub zapis do bazy).

**Baza Danych:** Sugerowana jest baza **SQLite**, ze względu na prostotę wdrożenia (plik bazodanowy, brak konieczności instalacji serwera bazy danych) i wystarczające możliwości do przechowywania danych historycznych dla prostego projektu.

---

## Architektura Systemu (Ogólny Zarys)

1.  **Moduł zbierający dane (Python):**
    * Będzie działał w tle na monitorowanym komputerze.
    * Wykorzysta bibliotekę `psutil` do zbierania danych o CPU, RAM, dyskach i sieci.
    * Będzie cyklicznie zapisywał zebrane dane do bazy danych SQLite.
2.  **Baza Danych (SQLite):**
    * Lokalny plik, przechowujący dane bieżące oraz dane historyczne o zasobach.
3.  **Aplikacja Frontendowa (Python/C# Desktop):**
    * Interfejs graficzny dla użytkownika.
    * Pobiera aktualne dane bezpośrednio z bazy danych lub poprzez moduł Pythona.
    * Pobiera dane historyczne z bazy danych do wizualizacji (wykresy).

---

## Podział Zadań w JIRA

Poniżej przedstawiono propozycję zadań w systemie JIRA, podzieloną na Epiki (główne fazy projektu). Każde zadanie zawiera opis, szacowany czas (w dniach roboczych, gdzie 1 dzień roboczy = ok. 8 godzin pracy, co należy przeliczyć na Wasz realny nakład czasu) oraz sugestię odpowiedzialnej osoby (podział elastyczny).

---

### Epika 1: Analiza i Projektowanie (Tydzień 1)

* **Zadanie:** **Definicja wymagań funkcjonalnych i niefunkcjonalnych (User Stories)**
    * **Opis:** Określenie, co aplikacja ma robić (np. wyświetlać bieżące obciążenie CPU, pokazywać historię RAM na wykresie), jakie dane zbierać, jak ma wyglądać interfejs, kto będzie użytkownikiem.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Cały Zespół.
* **Zadanie:** **Wybór finalnych technologii i bibliotek**
    * **Opis:** Ostateczna decyzja o wyborze technologii GUI (np. PyQt, WPF), biblioteki do wykresów (np. Chart.js dla web, Matplotlib dla Pythona, LiveCharts dla C#) oraz bazy danych (SQLite).
    * **Szacowany czas:** 1 dzień.
    * **Odpowiedzialny:** Zespół.
* **Zadanie:** **Projekt bazy danych (schemat ERD)**
    * **Opis:** Określenie tabel, pól i relacji potrzebnych do przechowywania danych o zasobach i historycznych pomiarach.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 1 (zainteresowana bazami danych).
* **Zadanie:** **Projekt architektury systemu**
    * **Opis:** Zdefiniowanie, jak moduł zbierający dane będzie komunikował się z bazą danych i jak frontend będzie pobierał dane. Tworzenie diagramów komponentów.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 2 (zainteresowana architekturą).

---

### Epika 2: Moduł Zbierania Danych (Python) (Tydzień 2-3)

* **Zadanie:** **Implementacja zbierania danych CPU**
    * **Opis:** Wykorzystanie biblioteki `psutil` do odczytu użycia procesora.
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 3.
* **Zadanie:** **Implementacja zbierania danych RAM**
    * **Opis:** Odczyt dostępnej i używanej pamięci RAM.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 3.
* **Zadanie:** **Implementacja zbierania danych o dyskach**
    * **Opis:** Odczyt wolnej i zajętej przestrzeni dyskowej na partycjach systemowych.
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 4.
* **Zadanie:** **Implementacja zbierania danych sieciowych**
    * **Opis:** Odczyt statystyk ruchu sieciowego (wysłane/odebrane bajty).
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 4.
* **Zadanie:** **Moduł planowania i uruchamiania zbierania danych**
    * **Opis:** Stworzenie mechanizmu (np. pętli z opóźnieniem `time.sleep()`), który cyklicznie (np. co 5 sekund) będzie uruchamiał zbieranie wszystkich danych.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 3.

---

### Epika 3: Baza Danych i Warstwa Dostępowa (Tydzień 2-4)

* **Zadanie:** **Konfiguracja bazy danych (SQLite)**
    * **Opis:** Stworzenie pliku bazodanowego SQLite i początkowych tabel zgodnie z zaprojektowanym schematem ERD.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 1.
* **Zadanie:** **Implementacja warstwy ORM/DAO dla Pythona (Zapis)**
    * **Opis:** Stworzenie kodu Pythona do zapisu zebranych danych do bazy danych SQLite (np. z użyciem modułu `sqlite3` lub ORM takiego jak SQLAlchemy).
    * **Szacowany czas:** 4 dni.
    * **Odpowiedzialny:** Osoba 1.
* **Zadanie:** **Implementacja warstwy ORM/DAO dla Frontendu (Odczyt)**
    * **Opis:** Stworzenie kodu (w Pythonie, jeśli frontend w Pythonie, lub w C#, jeśli frontend w C#) do odczytu danych bieżących i historycznych z bazy danych.
    * **Szacowany czas:** 4 dni.
    * **Odpowiedzialny:** Osoba 2.

---

### Epika 4: Frontend (Aplikacja Desktopowa) (Tydzień 3-5)

* **Zadanie:** **Projekt interfejsu użytkownika (UI/UX)**
    * **Opis:** Stworzenie szkiców (mockupów) głównych ekranów aplikacji: ekran główny z aktualnymi danymi, ekran z historią/wykresami.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 2 (z zainteresowaniem UI/UX).
* **Zadanie:** **Implementacja głównego okna/ekranu (aktualne dane)**
    * **Opis:** Stworzenie głównego interfejsu wyświetlającego aktualne wartości CPU, RAM, dysków, sieci. Implementacja mechanizmu odświeżania danych.
    * **Szacowany czas:** 4 dni.
    * **Odpowiedzialny:** Osoba 2.
* **Zadanie:** **Implementacja ekranu historii/wizualizacji danych**
    * **Opis:** Stworzenie ekranu, na którym dane historyczne będą prezentowane w postaci wykresów (dla CPU, RAM, dysków).
    * **Szacowany czas:** 5 dni.
    * **Odpowiedzialny:** Osoba 3 (z zainteresowaniem wizualizacją).
* **Zadanie:** **Podstawowa nawigacja i układ aplikacji**
    * **Opis:** Zaimplementowanie przełączania między ekranami (np. przyciski, zakładki) i podstawowego układu elementów GUI.
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 4.

---

### Epika 5: Raportowanie i Wizualizacja (Tydzień 4-5)

* **Zadanie:** **Integracja biblioteki wykresów**
    * **Opis:** Wykorzystanie wybranej biblioteki do wykresów (np. Matplotlib/Plotly dla Pythona, LiveCharts/OxyPlot dla C#) do dynamicznego generowania wykresów na podstawie danych z bazy.
    * **Szacowany czas:** 4 dni.
    * **Odpowiedzialny:** Osoba 3.
* **Zadanie:** **Implementacja wyboru zakresu czasu dla wykresów**
    * **Opis:** Dodanie funkcjonalności pozwalającej użytkownikowi na wybór okresu, za jaki mają być wyświetlane dane historyczne (np. ostatnia godzina, ostatni dzień, ostatni tydzień).
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 3.
* **Zadanie:** **Eksport podstawowego raportu (opcjonalnie)**
    * **Opis:** Możliwość wygenerowania prostego pliku tekstowego lub CSV z wybranymi danymi z historii.
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 4.

---

### Epika 6: Testowanie i Deployment (Tydzień 5)

* **Zadanie:** **Testowanie jednostkowe modułu zbierania danych**
    * **Opis:** Sprawdzenie, czy każdy komponent zbierający dane działa poprawnie i zwraca oczekiwane wartości.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 4.
* **Zadanie:** **Testowanie integracyjne (frontend-backend-baza danych)**
    * **Opis:** Sprawdzenie, czy wszystkie moduły poprawnie się ze sobą komunikują, czy dane są prawidłowo zapisywane do bazy i odczytywane przez frontend.
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 1.
* **Zadanie:** **Testowanie UI/UX**
    * **Opis:** Sprawdzenie, czy interfejs jest intuicyjny, czy aplikacja działa stabilnie, czy nie ma błędów wizualnych.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Osoba 2.
* **Zadanie:** **Pakowanie aplikacji do dystrybucji (build)**
    * **Opis:** Utworzenie samodzielnego pliku wykonywalnego (`.exe`) lub instalatora, który pozwoli na łatwe uruchomienie aplikacji na komputerach z Windows (np. za pomocą PyInstaller dla Pythona lub MSBuild dla C#).
    * **Szacowany czas:** 3 dni.
    * **Odpowiedzialny:** Osoba 1.
* **Zadanie:** **Stworzenie krótkiej dokumentacji użytkownika**
    * **Opis:** Instrukcja krok po kroku, jak uruchomić aplikację i korzystać z jej podstawowych funkcji.
    * **Szacowany czas:** 2 dni.
    * **Odpowiedzialny:** Zespół.

---

## Podział Ról i Odpowiedzialności

Poniżej przedstawiono sugerowany podział ról i odpowiedzialności w zespole. Pamiętajcie, że ten podział jest elastyczny i może być dostosowany do indywidualnych umiejętności oraz preferencji członków zespołu.

* **Osoba 1 (Głównie Backend/Baza Danych):**
    * Projekt i konfiguracja bazy danych (SQLite).
    * Implementacja warstwy dostępu do danych (ORM/DAO) dla Pythona (moduł zapisu).
    * Pakowanie i przygotowanie aplikacji do dystrybucji (build).
    * Odpowiedzialność za testowanie integracyjne modułów.
* **Osoba 2 (Głównie Frontend/UI/UX):**
    * Projekt architektury systemu.
    * Projekt interfejsu użytkownika (UI/UX) i makiet.
    * Implementacja głównego okna/ekranu aplikacji (aktualne dane).
    * Odpowiedzialność za testy UI/UX.
* **Osoba 3 (Głównie Zbieranie Danych/Wizualizacja):**
    * Implementacja zbierania danych o CPU i RAM.
    * Opracowanie modułu planowania i uruchamiania zbierania danych.
    * Implementacja ekranu historii i wizualizacji danych (wykresy).
    * Integracja biblioteki wykresów i implementacja wyboru zakresu czasu.
* **Osoba 4 (Głównie Zbieranie Danych/Pomocniczy Frontend/Testy):**
    * Implementacja zbierania danych o dyskach i sieci.
    * Wsparcie przy implementacji podstawowej nawigacji i układu frontendu.
    * Odpowiedzialność za testowanie jednostkowe modułu zbierania danych.
    * Zaimplementowanie opcjonalnego eksportu raportów.

---

## Wskazówki do realizacji projektu

* **Komunikacja:** Organizujcie krótkie, regularne spotkania (np. co drugi dzień przed rozpoczęciem pracy) w celu omówienia postępów, napotkanych problemów i planów na najbliższe zadania.
* **Kontrola wersji:** Bezwzględnie korzystajcie z systemu kontroli wersji (np. **Git z GitHub/GitLab/Bitbucket**). Każde zadanie w JIRA powinno być powiązane z odpowiednim branchem lub commitami w repozytorium.
* **Definicja "Done":** Dla każdego zadania jasno określcie, co oznacza jego ukończenie, aby uniknąć nieporozumień.
* **Minimalne Działające Rozwiązanie (MVP):** Skupcie się najpierw na stworzeniu podstawowej, działającej wersji aplikacji (np. zbierającej tylko CPU i RAM, wyświetlającej aktualne dane). Dopiero po osiągnięciu MVP rozbudowujcie funkcjonalność.
* **Realizm:** Jeśli czas będzie naglił, bądźcie elastyczni i redukujcie zakres (np. ograniczcie liczbę monitorowanych metryk, zrezygnujcie z opcjonalnych raportów). Lepiej dostarczyć działający, choć prostszy, projekt niż niedokończony.
