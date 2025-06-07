# Dokumentacja Techniczna: Projektowanie i Implementacja Aplikacji Desktopowej C# WPF z Wykorzystaniem MVVM, Prism i SQLite

Niniejsze repozytorium zawiera dokumentację techniczną projektu aplikacji desktopowej, skupiającą się na zaawansowanych aspektach programistycznych w technologii C# WPF. Projekt ten, choć koncepcyjny (ze względu na niedostępność pierwotnego repozytorium GitHub), stanowi kompleksowy przewodnik po najlepszych praktykach i wzorcach architektonicznych niezbędnych do budowy skalowalnych, testowalnych i łatwych w utrzymaniu aplikacji.

## Cel Projektu

Głównym celem projektu jest przedstawienie i analiza kluczowych technologii oraz wzorców projektowych wykorzystywanych w nowoczesnym programowaniu aplikacji desktopowych w C# WPF. Dokumentacja koncentruje się na:

*   **Programowaniu Obiektowym (OOP):** Fundamentalne zasady, takie jak abstrakcja, hermetyzacja, dziedziczenie i polimorfizm.
*   **Zasadach SOLID:** Zbiór pięciu zasad projektowania (SRP, OCP, LSP, ISP, DIP), które prowadzą do tworzenia elastycznego i modułowego kodu.
*   **Architekturze MVVM (Model-View-ViewModel):** Wzorzec architektoniczny zapewniający czystą separację odpowiedzialności między warstwą danych, logiką prezentacji i interfejsem użytkownika.
*   **Frameworku Prism:** Narzędzie do budowania modułowych i kompozycyjnych aplikacji WPF, wspierające skalowalność i elastyczność.
*   **Warstwie Dostępu do Danych (DAL) z SQLite:** Implementacja lekkiej, wbudowanej bazy danych do trwałego przechowywania danych.

## Technologie Wykorzystane w Projekcie

*   **C#:** Główny język programowania.
*   **WPF (Windows Presentation Foundation):** Framework do tworzenia interfejsów użytkownika aplikacji desktopowych.
*   **MVVM (Model-View-ViewModel):** Wzorzec architektoniczny dla separacji odpowiedzialności.
*   **Prism Framework:** Framework do budowania modułowych aplikacji.
*   **SQLite:** Lekka, wbudowana baza danych.

## Kluczowe Koncepcje Omówione w Dokumentacji

### 1. Podstawy Programowania Obiektowego (OOP)
Dokumentacja szczegółowo omawia cztery filary OOP:
*   **Abstrakcja:** Ukrywanie złożonych szczegółów implementacyjnych, prezentując tylko istotne cechy.[1]
*   **Hermetyzacja:** Łączenie danych i metod w jedną jednostkę (klasę), chroniąc wewnętrzny stan obiektu.[1]
*   **Dziedziczenie:** Mechanizm ponownego użycia kodu, pozwalający klasie potomnej przejmować właściwości i zachowania klasy bazowej.[1]
*   **Polimorfizm:** Zdolność obiektu do zachowywania się w różny sposób w zależności od kontekstu ("jedna nazwa, wiele form").[1]

### 2. Zasady SOLID w Projektowaniu Aplikacji C#
Zasady SOLID są kluczowe dla tworzenia łatwego w utrzymaniu, elastycznego i skalowalnego oprogramowania [2]:
*   **SRP (Single Responsibility Principle):** Każda klasa ma tylko jeden powód do zmiany.[2]
*   **OCP (Open/Closed Principle):** Otwarta na rozszerzenia, zamknięta na modyfikacje.[2]
*   **LSP (Liskov Substitution Principle):** Obiekty klas pochodnych mogą zastępować obiekty klas bazowych bez zmiany zachowania programu.[2]
*   **ISP (Interface Segregation Principle):** Klienci nie są zmuszani do implementowania interfejsów, których nie używają.[2]
*   **DIP (Dependency Inversion Principle):** Moduły wysokopoziomowe i niskopoziomowe zależą od abstrakcji.[2]

### 3. Architektura Model-View-ViewModel (MVVM) w WPF
MVVM promuje silną separację odpowiedzialności, zwiększając testowalność i ułatwiając współpracę [3]:
*   **Model:** Reprezentuje dane aplikacji i logikę biznesową.[3]
*   **View:** Interfejs użytkownika, odpowiedzialny za wyświetlanie danych i przechwytywanie danych wejściowych.[3]
*   **ViewModel:** Pośrednik między View a Modelem, udostępniający dane i logikę specyficzną dla UI.[3]
*   **Powiązanie Danych (Data Binding) i `INotifyPropertyChanged`:** Automatyczna synchronizacja danych między UI a ViewModel, kluczowa dla aktualizacji interfejsu.[3]
*   **Komendy (Commands):** Oddzielenie wywołującego akcję od logiki obsługującej tę akcję, ułatwiające zarządzanie interakcjami użytkownika.[4]

### 4. Framework Prism dla Aplikacji WPF
Prism ułatwia budowanie modułowych, kompozycyjnych aplikacji [5]:
*   **Koncepcja Modułowości:** Dzielenie aplikacji na niezależne, luźno sprzężone moduły.[5]
*   **Proces Ładowania Modułów:** Rejestracja, ładowanie i inicjalizacja modułów za pomocą `ModuleCatalog` i `ModuleManager`.[5]
*   **Komunikacja Między Modułami:** Wzorce takie jak zdarzenia luźno sprzężone i usługi współdzielone.[5]
*   **Regiony i Kompozycja UI:** Dynamiczne dodawanie widoków do predefiniowanych obszarów interfejsu użytkownika.[6]
*   **Wstrzykiwanie Zależności (DI) i Kontenery IoC (Unity/MEF):** Promowanie luźnego sprzężenia i elastyczności.[5]

### 5. Warstwa Dostępu do Danych (DAL) z SQLite
DAL zapewnia abstrakcję nad szczegółami bazy danych [7]:
*   **Zarządzanie Połączeniami:** Elastyczne konfigurowanie i automatyczne zarządzanie połączeniami z bazą danych SQLite.[7]
*   **Wykonywanie Zapytań:** Metody do wykonywania instrukcji DDL, DML i zapytań `SELECT` (`ExecuteNonQuery`, `ExecuteScalar`, `ExecuteDataTable`, `ExecuteDataSet`, `ExecuteAndFillList<T>`, `ExecuteAndFill<T>`).[7]
*   **Obsługa Błędów:** Mechanizmy sprawdzania i obsługi błędów operacji bazodanowych.[7]

## Struktura Repozytorium (Koncepcyjna)

Chociaż to repozytorium nie zawiera kodu źródłowego aplikacji, jego struktura odzwierciedlałaby typowy projekt C# WPF z wykorzystaniem omawianych technologii:
.
├── Documentation/
│   └── TechnicalDocumentation.pdf  # Skompilowana dokumentacja LaTeX
│   └── TechnicalDocumentation.tex  # Plik źródłowy LaTeX
├── src/
│   ├── YourProject.Core/           # Moduł zawierający wspólne interfejsy, modele, usługi
│   ├── YourProject.Modules.ModuleA/ # Przykład modułu A (View, ViewModel, logika modułu)
│   ├── YourProject.Modules.ModuleB/ # Przykład modułu B
│   ├── YourProject.UI.Shell/       # Główna aplikacja (Shell), definiująca regiony
│   └── YourProject.Data/           # Warstwa dostępu do danych (DAL) z implementacją SQLite
├── media/                          # Zasoby graficzne dla dokumentacji
├──.gitignore
└── README.md

## Uruchamianie Projektu (Koncepcyjnie)

Ponieważ jest to dokumentacja koncepcyjna, nie ma bezpośrednich kroków do uruchomienia kodu. Jednakże, typowy proces dla takiej aplikacji obejmowałby:

1.  **Skompilowanie projektu:** Użycie Visual Studio do zbudowania wszystkich modułów i głównej aplikacji.
2.  **Konfiguracja bazy danych:** Upewnienie się, że plik bazy danych SQLite jest dostępny w odpowiedniej lokalizacji (zazwyczaj w folderze aplikacji lub danych użytkownika).
3.  **Uruchomienie aplikacji:** Uruchomienie skompilowanego pliku `.exe` głównej aplikacji (Shell).

## Autorzy

*   Mateusz Zaskórski
*   Jakub Kwaśniewski
