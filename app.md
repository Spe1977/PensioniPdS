## CARATTERISTICHE DELL'APP "PensioniPdS" 24.04.2026

Fase 1 - COMPLETATA

# STACK TECNOLOGICO:

PWA offline mobile first
TypeScript (versione stabile più recente)
Angular + Ionic (versione stabile più recente)
Vitest (versione stabile più recente)
Prettier (versione stabile più recente)
E2E Playwright (versione stabile più recente)

Fase 2

# UI/UX:

Aspetto estetico moderno, accattivante e minimalista, con interfacce user friendly con solo le funzioni e gli elementi essenziali.
Interfaccia ottimizzata per dispositivi mobili.

Fase 2.1 - COMPLETATA
La Home page deve essere strutturata così: in alto il nome dell'app "PensioniPdS" con questo sottotitolo "Simulatore pensionistico semplice ed automatico", entrambi i testi devono occupare solo lo spazio strettamente necessario. La home deve contenere solo questi altri elementi:
Campo data di nascita
Campo data di assunzione in Polizia
Pulsante avanti
Pulsante per cancellare tutti i dati caricati nell'app.

Fase 2.2 - COMPLETATA
La seconda pagina che si raggiunge schiacciando il pulsante avanti deve contenere solo la possibilità di scegliere se voler simulare:
Pensione con il solo requisito di anzianità contributiva/servizio utile;
Pensione con requisito età + anzianità;
Pensione per limiti di età ordinamentali (60, 63 o 65 anni, in base alla qualifica);
Pulsante continua.

Quando viene scelta la pensione per limiti di età, l'app deve permettere di indicare il limite ordinamentale applicabile: 60, 63 o 65 anni.

Fase 2.3 - COMPLETATA
La terza pagina deve contenere un campo dove caricare i file XML/PDF dell'estratto contributivo INPS, un campo dove caricare il PDF della CU (Certificazione Unica), il campo per caricare il PDF della busta paga e il pulsante calcola pensione.

Appena sotto il campo dove caricare il documento INPS, deve esserci un'altra area dove inserire manualmente gli importi degli ipotetici contributi futuri e degli ipotetici tassi di rivalutazione. Esempio: un poliziotto che andrà in pensione nel 2030 può avere dati reali disponibili fino al 2025, ma dal 2026 al 2030 questi dati potrebbero mancare; l'inserimento manuale serve quindi per effettuare una simulazione pensionistica con dati ipotetici per gli anni mancanti.

Il caricamento e l'analisi dei documenti devono avvenire localmente nell'app, senza invio dei file a server esterni. Quando il parsing automatico dei PDF non è affidabile, l'app deve permettere la conferma o l'inserimento manuale dei dati necessari.

Fase 2.4 - COMPLETATA
La quarta e ultima pagina deve riportare il giorno, il mese e l'anno in cui si andrà in pensione, l'importo della pensione netta calcolata usando gli scaglioni IRPEF in vigore, e un pulsante per scaricare i risultati in formato .md o PDF.

Fase 3:

# FUNZIONALITÀ:

Calcolo dell'età pensionabile e della decorrenza pensionistica includendo le maggiorazioni di servizio previste dal file penps.md.

Regola generale da rispettare sempre: la maggiorazione ordinaria di 1/5 del servizio equivale, in termini pratici, a 1 anno figurativo ogni 5 anni di servizio effettivo, ma il totale delle maggiorazioni utilizzabili dal 01/01/1998 non può superare 5 anni complessivi. La maggiorazione rileva ai fini del diritto e, per le quote retributive, anche ai fini della misura; non genera invece versamenti aggiuntivi da sommare al montante contributivo.

Tre scenari da calcolare:

Fase 3.1 - COMPLETATA
1 Calcolo pensione con il solo requisito di anzianità: 41 anni di servizio utile fino al 2026 (esempio ordinario: 36 anni effettivi + 5 anni figurativi), finestra mobile di 15 mesi e adeguamenti alla speranza di vita previsti per l'anno di maturazione del diritto, con i relativi test.

Fase 3.2 - COMPLETATA
2 Calcolo pensione con requisito età + anzianità: 58 anni di età e 35 anni di servizio utile fino al 2026 (esempio ordinario: 30 anni effettivi + 5 anni figurativi), finestra mobile di 12 mesi e adeguamenti alla speranza di vita previsti per l'anno di maturazione del diritto, con i relativi test.

Fase 3.3 - COMPLETATA
3 Calcolo pensione per limiti di età ordinamentali (60, 63 e 65 anni) + eventuale finestra mobile e speranza di vita solo nelle condizioni che le prevedono, con i relativi test.

Fase 3.4 - COMPLETATA

# TABELLA REQUISITI DA IMPLEMENTARE

Fino al 31/12/2026:
Solo requisito di anzianità: 41 anni di servizio utile + 15 mesi di finestra mobile.
Età + anzianità: 58 anni di età + 35 anni di servizio utile + 12 mesi di finestra mobile.
Limiti di età: 60, 63 o 65 anni in base alla qualifica; se al limite di età non sono maturati i requisiti della pensione di anzianità, applicare gli adeguamenti alla speranza di vita secondo penps.md e Circolare INPS n. 28/2026.

Dal 01/01/2027 al 31/12/2027:
Solo requisito di anzianità: 41 anni e 1 mese di servizio utile + 15 mesi di finestra mobile.
Età + anzianità: 58 anni e 1 mese di età + 35 anni di servizio utile + 12 mesi di finestra mobile.
Limiti di età: se al limite ordinamentale non sono maturati i requisiti della pensione di anzianità, incrementare il requisito anagrafico di 1 mese.

Dal 01/01/2028 al 31/12/2028:
Solo requisito di anzianità: 41 anni e 3 mesi di servizio utile + 15 mesi di finestra mobile.
Età + anzianità: 58 anni e 3 mesi di età + 35 anni di servizio utile + 12 mesi di finestra mobile.
Limiti di età: se al limite ordinamentale non sono maturati i requisiti della pensione di anzianità, incrementare il requisito anagrafico di 3 mesi.

Dal 2029 in avanti:
I requisiti devono essere gestiti come parametri aggiornabili. L'app non deve cristallizzare automaticamente l'incremento aggiuntivo specifico del comparto sicurezza/difesa/soccorso pubblico finché non risultano disponibili il DPCM attuativo e le successive istruzioni INPS.

Fase 4:

# CALCOLO PENSIONE

Calcolo dell'importo della pensione netta in base alle aliquote IRPEF in vigore, con inclusione dei 6 scatti e del moltiplicatore nei casi in cui questi benefici devono essere corrisposti secondo penps.md.

Per il calcolo netto devono essere previsti, anche tramite inserimento manuale, i dati necessari a determinare detrazioni e addizionali: residenza fiscale, addizionale regionale/comunale, eventuali carichi familiari, regime pensionistico, ultimo imponibile annuo e dati stipendiali utili per 6 scatti e moltiplicatore.

Fase 4.1 - COMPLETATA
Calcolo pensione netta con il solo requisito di anzianità negli scenari A, B, C (Retributivo pro-rata, Misto e Contributivo puro) con i relativi test.

Fase 4.2 - COMPLETATA
Calcolo della pensione netta con requisito età + anzianità negli scenari A, B, C (Retributivo pro-rata, Misto e Contributivo puro), con i relativi test.

Fase 4.3 - COMPLETATA
Calcolo della pensione netta per limiti di età (60, 63 e 65 anni) negli scenari A, B, C (Retributivo pro-rata, Misto e Contributivo puro), con i relativi test.

Fase 5 - COMPLETATA
Includere nei calcoli pensionistici i seguenti tre elementi reperibili nei capitoli 7, 7.1 e 7.2 del file penps.md:

- Imposta lorda (aliquote IRPEF);
- Detrazioni da reddito da pensione (calcolate secondo gli scaglioni di reddito e le formule matematiche)
- Addizionali regionali e comunali (da estrapolare dalla busta paga);
  realizzare i test Vitest e Playwright per questa fase e lanciare Prettier.

# VINCOLI OPERATIVI DA RISPETTARE SEMPRE:

1 - Consulta sempre il file penps.md prima di realizzare ogni fase, in modo da avere tutte le informazioni necessarie da seguire per realizzare la fase a regola d'arte;
2 - Esegui sempre i test realizzati alla fine di ogni fase e tutti i test man mano che vengono incrementati;
3 - Scrivi il codice nel modo più semplice, compatto e breve possibile, ma realizza comunque codice di alta qualità, sicuro, efficace ed altamente ottimizzato, rispettando le più recenti ed affidabili best practices;
4 - Quando hai la necessità di effettuare ricerche online per cercare informazioni o risolvere problemi, cerca sempre e soltanto su siti ufficiali ed altamente affidabili;
5 - Al termine della realizzazione di ogni fase segnala come completata;
6 - Invoca le skill adatte di cui disponi per svolgere i compiti in cui sono necessarie a realizzare e migliorare il lavoro;
7 - Prima di iniziare una nuova fase valutane sempre la complessità, e se lo ritieni necessario, suddividila in più step;
8 - Ogni volta che hai bisogno di informazioni aggiuntive o chiarimenti da parte mia, chiedimi pure;
9 - Esprimiti sempre in lingua italiana.

# NOTA del 28.04.2026:

# GRAZIE PER L'AIUTO E BUON LAVORO!
