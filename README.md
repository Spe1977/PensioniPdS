# PensioniPdS

**PensioniPdS** è un simulatore pensionistico semplice e automatico, progettato specificamente per il personale della Polizia di Stato (Comparto Sicurezza).

L'applicazione è una Progressive Web App (PWA) "mobile first", sviluppata per funzionare anche offline. Il calcolo e l'analisi dei dati (ad esempio il parsing dei documenti personali) avvengono interamente in locale sul dispositivo dell'utente, garantendo la massima privacy e sicurezza.

## Caratteristiche Principali

- **PWA Offline & Mobile First**: Interfaccia moderna e ottimizzata per l'uso su smartphone, funzionante anche in assenza di connessione internet.
- **Privacy Totale by Design**: Il caricamento e l'elaborazione dei documenti personali (Estratto Contributivo INPS XML/PDF, Certificazione Unica PDF, Busta Paga PDF) avvengono interamente all'interno del browser, senza alcun invio di file a server esterni.
- **Gestione Completa dei Requisiti Previdenziali**:
  - Pensione con il solo requisito di anzianità (es. 41 anni di servizio utile + finestra mobile di 15 mesi).
  - Pensione con requisito età + anzianità (es. 58 anni + 35 anni di servizio utile + finestra mobile di 12 mesi).
  - Pensione per limiti di età ordinamentali (60, 63, 65 anni in base alla qualifica) con eventuale adeguamento alla speranza di vita (incrementi previsti per il biennio 2027-2028 e successivi).
- **Calcolo Avanzato della Pensione Netta**:
  - Applicazione dei vigenti scaglioni IRPEF (incluse le variazioni della Legge di Bilancio 2026).
  - Calcolo accurato delle detrazioni per reddito da pensione e carichi familiari.
  - Scorporo delle addizionali regionali e comunali estrapolate dalla busta paga.
- **Integrazione della Specificità del Comparto Sicurezza**:
  - Calcolo e applicazione delle maggiorazioni di servizio (es. 1/5 del servizio utile, nel limite massimo di 5 anni dal 01/01/1998).
  - Ricalcolo retributivo per il sistema misto ai sensi dell'Art. 54 del DPR 1092/1973.
  - Applicazione dell'incremento figurativo dei "Sei Scatti" (Art. 6-bis D.L. 387/1987).
  - Applicazione del Moltiplicatore sul montante contributivo per le cessazioni dal servizio per limiti di età (Art. 3 c. 7 D.Lgs. 165/1997).

## Stack Tecnologico

- **Linguaggio**: TypeScript
- **Framework UI**: Angular + Ionic (Standalone Components)
- **Testing**: Vitest (Unit Tests), Playwright (E2E Tests)
- **Formatting/Linting**: Prettier, ESLint

## Flusso di Utilizzo dell'App

1. **Home**: Inserimento dei dati essenziali (Data di nascita, Data di assunzione in Polizia).
2. **Scelta Pensione**: Selezione dello scenario di pensionamento desiderato tra Anzianità, Età + Anzianità o Limiti di età ordinamentali.
3. **Caricamento Dati**: Upload dei file (INPS, CU, Cedolino) tramite parsing automatico locale, o inserimento manuale di importi e tassi di rivalutazione per simulazioni previsionali.
4. **Risultati**: Dashboard riepilogativa con data esatta di decorrenza pensione, calcolo dettagliato del servizio utile (servizio effettivo + maggiorazioni), requisiti applicati e pensione netta mensile finale.
5. **Esportazione**: Possibilità di salvare i risultati finali comodamente in formato Markdown (`.md`) o PDF sul proprio dispositivo.
