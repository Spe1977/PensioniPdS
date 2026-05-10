# Specifica tecnica modifiche PensioniPdS - simulazione sistema misto Polizia di Stato

Documento operativo per migliorare l'affidabilità della simulazione pensionistica dell'app **PensioniPdS**, mantenendo l'obiettivo dichiarato: fornire una **stima prudenziale, indicativa e non ufficiale**, senza sostituire il calcolo INPS.

Data: 2026-04-30

---

## 1. Obiettivo delle modifiche

L'app deve migliorare il calcolo della pensione in **sistema misto** per il personale della Polizia di Stato, distinguendo in modo più chiaro le tre quote:

| Quota | Periodo | Metodo | Base |
|---|---|---|---|
| Quota A | Fino al 31/12/1992 | Retributivo | Retribuzione pensionabile alla cessazione |
| Quota B | Dal 01/01/1993 al 31/12/1995 | Retributivo | Media delle retribuzioni pensionabili storiche/rivalutate |
| Quota C | Dal 01/01/1996 alla cessazione | Contributivo | Montante contributivo x coefficiente di trasformazione |

L'app deve continuare a essere un simulatore prudenziale. Dove mancano dati reali, deve preferire la **sottostima** alla sovrastima.

---

## 2. Fonti considerate

### 2.1 Circolare INPS n. 44 del 23/03/2022

La circolare chiarisce che per il personale delle Forze di polizia a ordinamento civile, quindi anche Polizia di Stato, con anzianità contributiva al 31/12/1995 inferiore a 18 anni, la quota retributiva nel sistema misto deve essere determinata applicando l'art. 54 del D.P.R. 1092/1973 con aliquota annua del **2,44% per ogni anno utile** maturato al 31/12/1995.

La circolare precisa anche che i benefici dei **sei aumenti periodici** devono essere rapportati alla medesima aliquota del 2,44%.

### 2.2 Documento `misto.md`

Il documento interno descrive correttamente la struttura a tre quote del sistema misto:

- Quota A fino al 31/12/1992;
- Quota B dal 01/01/1993 al 31/12/1995;
- Quota C dal 01/01/1996 in poi.

Precisa inoltre che la quota B richiede, per un calcolo corretto, le retribuzioni imponibili/pensionabili del triennio 1993-1995 e i criteri di rivalutazione.

### 2.3 Tabella ISTAT FOI(nt) 2023

Il file `Istat_2023.pdf` contiene i coefficienti ISTAT FOI(nt), generale al netto dei tabacchi, per tradurre valori monetari storici in valori del 2023.

Per gli anni utili alla stima della Quota B:

| Anno | Coefficiente ISTAT a valori 2023 |
|---:|---:|
| 1993 | 1,911 |
| 1994 | 1,839 |
| 1995 | 1,745 |
| 1996 | 1,680 |
| 2023 | 1,000 |

---

## 3. Principi di calcolo da adottare

### 3.1 Approccio prudenziale

L'app deve evitare di promettere importi troppo alti.

Regola generale:

```text
In mancanza di dati reali, usare sempre una stima prudenziale.
```

Per la Quota B, il valore predefinito deve essere basato su importi storici nominali stimati, senza applicare rivalutazione automatica.

La rivalutazione ISTAT deve essere disponibile nel motore di calcolo, ma applicata solo tramite parametro modificabile dall'utente.

---

## 4. Nuova logica per sistema misto

### 4.1 Formula generale

```text
Pensione lorda annua stimata =
Quota A
+ Quota B
+ Quota C
+ benefici applicabili
```

Poi:

```text
Pensione netta annua =
Pensione lorda annua
- IRPEF netta annua
- addizionali annue
```

Infine:

```text
Pensione netta mensile media =
Pensione netta annua / 13
```

L'app deve esplicitare che il mensile è calcolato su **13 mensilità**.

---

## 5. Calcolo Quota A

### 5.1 Dati necessari

- Data assunzione;
- anzianità utile maturata fino al 31/12/1992;
- retribuzione pensionabile finale stimata;
- aliquota art. 54: 2,44% annuo.

### 5.2 Fonte dati

Per una stima, la retribuzione pensionabile finale può essere ricavata da:

- ultima busta paga;
- CU;
- valore manuale inserito dall'utente.

Preferire un campo esplicito:

```text
retribuzionePensionabileFinale
```

separato da:

```text
ultimoImponibileAnnuo
```

perché non sempre coincidono perfettamente.

### 5.3 Formula

```text
anniQuotaA = anni utili maturati fino al 31/12/1992

aliquotaQuotaA = anniQuotaA x 0,0244

QuotaA = retribuzionePensionabileFinale x aliquotaQuotaA
```

### 5.4 Esempio

```text
anniQuotaA = 3
aliquotaQuotaA = 3 x 2,44% = 7,32%

retribuzionePensionabileFinale = 44.917,49 €

QuotaA = 44.917,49 x 7,32% = 3.287,96 €
QuotaA mensile su 13 = 3.287,96 / 13 = 252,92 €
```

---

## 6. Calcolo Quota B

### 6.1 Problema

La Quota B è la parte più incerta perché richiede dati storici 1993-1995 che quasi nessun utente possiede.

Dati ideali:

- retribuzione pensionabile 1993;
- retribuzione pensionabile 1994;
- retribuzione pensionabile 1995;
- criteri di rivalutazione;
- anzianità utile del periodo 1993-1995.

### 6.2 Soluzione proposta

Usare un approccio ibrido:

1. Stima automatica prudenziale da imponibile 1996;
2. coefficiente di rivalutazione ISTAT applicato di default pari a **0%**;
3. possibilità di modifica manuale della percentuale di rivalutazione;
4. modalità esperto per inserire dati reali 1993, 1994, 1995;
5. possibilità di inserire direttamente una Quota B manuale già calcolata.

---

## 7. Stima automatica Quota B da imponibile 1996

### 7.1 Dato di partenza

Usare il primo imponibile affidabile disponibile dal 1996 in poi.

Priorità:

```text
1. imponibile 1996
2. imponibile 1997
3. imponibile 1998
4. valore manuale
```

Se manca il 1996 e si usa un anno successivo, l'app deve indicare affidabilità più bassa.

### 7.2 Coefficienti ISTAT

Inserire nel motore almeno questi coefficienti:

```ts
const coefficientiIstatFoi2023: Record<number, number> = {
  1993: 1.911,
  1994: 1.839,
  1995: 1.745,
  1996: 1.680,
  2023: 1.000,
};
```

È consigliabile inserire l'intera tabella 1861-2023, ma per la Quota B bastano almeno 1993-1996.

### 7.3 Formula di ricostruzione storica

Se si parte da un imponibile noto del 1996:

```text
RetribuzioneStimataAnnoX =
Retribuzione1996 x coefficiente1996 / coefficienteAnnoX
```

Dove `AnnoX` è 1993, 1994 o 1995.

### 7.4 Esempio con 20.000 € nel 1996

Coefficienti:

```text
1993 = 1,911
1994 = 1,839
1995 = 1,745
1996 = 1,680
```

Calcoli:

```text
R1993 = 20.000 x 1,680 / 1,911 = 17.582,42 €
R1994 = 20.000 x 1,680 / 1,839 = 18.270,80 €
R1995 = 20.000 x 1,680 / 1,745 = 19.255,01 €
```

Media nominale:

```text
MediaB nominale =
(17.582,42 + 18.270,80 + 19.255,01) / 3
= 18.369,41 €
```

---

## 8. Rivalutazione Quota B

### 8.1 Scelta prudenziale

Per impostazione predefinita:

```text
percentualeRivalutazioneQuotaB = 0
```

Significa che la Quota B viene calcolata usando la media nominale stimata.

L'utente può modificare manualmente questo valore:

```text
0% = nessuna rivalutazione, massimo criterio prudenziale
50% = rivalutazione parziale
100% = rivalutazione ISTAT piena a valori 2023
```

### 8.2 Formula con rivalutazione modulabile

Per ciascun anno:

```text
RetribuzioneRivalutataPienaAnno =
RetribuzioneNominaleAnno x coefficienteIstatAnno
```

Poi applicare solo una quota della rivalutazione piena:

```text
RetribuzioneFinaleAnno =
RetribuzioneNominaleAnno
+ (RetribuzioneRivalutataPienaAnno - RetribuzioneNominaleAnno)
  x percentualeRivalutazioneQuotaB
```

Dove:

```text
percentualeRivalutazioneQuotaB = 0   -> nessuna rivalutazione
percentualeRivalutazioneQuotaB = 0,5 -> metà rivalutazione
percentualeRivalutazioneQuotaB = 1   -> rivalutazione piena
```

### 8.3 Formula media B

```text
MediaB =
media(RetribuzioneFinale1993, RetribuzioneFinale1994, RetribuzioneFinale1995)
```

### 8.4 Formula Quota B

```text
anniQuotaB = anni utili maturati dal 01/01/1993 al 31/12/1995

aliquotaQuotaB = anniQuotaB x 0,0244

QuotaB = MediaB x aliquotaQuotaB
```

### 8.5 Esempio senza rivalutazione

```text
MediaB = 18.369,41 €
anniQuotaB = 3
aliquotaQuotaB = 3 x 2,44% = 7,32%

QuotaB = 18.369,41 x 7,32% = 1.344,64 €
QuotaB mensile su 13 = 1.344,64 / 13 = 103,43 €
```

### 8.6 Esempio con rivalutazione piena

I valori stimati dal 1996, se rivalutati a valori 2023, tornano tutti circa al valore reale 2023 equivalente:

```text
R1993 rivalutato = 17.582,42 x 1,911 ≈ 33.600 €
R1994 rivalutato = 18.270,80 x 1,839 ≈ 33.600 €
R1995 rivalutato = 19.255,01 x 1,745 ≈ 33.600 €
```

Quindi:

```text
MediaB rivalutata piena ≈ 33.600 €

QuotaB rivalutata piena =
33.600 x 7,32% = 2.459,52 €
```

Default consigliato: usare 0%, quindi **1.344,64 €** nell'esempio, non 2.459,52 €.

---

## 9. Calcolo Quota C

### 9.1 Dati necessari

- Retribuzioni/imponibili previdenziali dal 1996;
- aliquota di computo 33%;
- coefficienti di rivalutazione montante;
- coefficiente di trasformazione in base all'età alla decorrenza;
- eventuali contributi futuri stimati.

### 9.2 Formula

```text
contributoAnno = imponibileAnno x 0,33
```

Montante:

```text
montante = somma dei contributi annui rivalutati
```

Quota C:

```text
QuotaC = montanteFinale x coefficienteTrasformazione
```

### 9.3 Attenzione

Se l'estratto INPS contenesse già un montante finale rivalutato, non bisogna rivalutarlo una seconda volta.

Se invece l'app legge retribuzioni annue e applica il 33%, l'attuale logica è coerente come stima.

---

## 10. Sei scatti

### 10.1 Regola prudenziale

Nel sistema misto, i sei scatti non devono essere semplicemente sommati per intero alla pensione retributiva annua.

La Circolare INPS n. 44/2022 indica che i sei aumenti periodici devono essere rapportati all'aliquota annua del 2,44%.

### 10.2 Formula parte retributiva

```text
seiScattiBase = ultimoImponibileAnnuo x 0,15
```

Effetto retributivo:

```text
effettoSeiScattiRetributivo =
seiScattiBase x anniUtiliAl31121995 x 0,0244
```

Oppure, se si vuole separarli:

```text
effettoSeiScattiQuotaA =
seiScattiBase x anniQuotaA x 0,0244

effettoSeiScattiQuotaB =
seiScattiBase x anniQuotaB x 0,0244
```

### 10.3 Formula parte contributiva

Per la parte contributiva:

```text
seiScattiMontanteFigurativo =
seiScattiBase x 0,33
```

Poi:

```text
effettoSeiScattiQuotaC =
seiScattiMontanteFigurativo x coefficienteTrasformazione
```

### 10.4 Impostazione consigliata

Aggiungere un'opzione:

```text
applicaSeiScatti = true/false
```

Default: `true`, ma con nota esplicativa.

Nel report indicare chiaramente se sono stati applicati e con quale criterio.

---

## 11. Moltiplicatore

### 11.1 Regola

Il moltiplicatore si applica solo per pensione per limiti di età ordinamentali, non per pensione anticipata a domanda.

Formula:

```text
moltiplicatoreMontante =
ultimoImponibileAnnuo x 5 x 0,33
```

Effetto pensione annua:

```text
quotaMoltiplicatore =
moltiplicatoreMontante x coefficienteTrasformazione
```

### 11.2 Report

Nel report mostrare separatamente:

```text
Moltiplicatore sul montante
Effetto annuo del moltiplicatore
```

---

## 12. Netto fiscale e 13 mensilità

### 12.1 Calcolo lordo

```text
pensioneLordaAnnua =
QuotaA
+ QuotaB
+ QuotaC
+ effetti benefici
```

### 12.2 IRPEF

Usare gli scaglioni configurati nel motore:

```text
fino a 28.000 € -> 23%
28.001 - 50.000 € -> 33% o 35%, secondo anno simulato
oltre 50.000 € -> 43%
```

Nota: se il calcolo riguarda anni 2024/2025, la seconda aliquota dovrebbe essere 35%; se riguarda 2026+, secondo la documentazione interna, 33%.

### 12.3 Detrazioni pensione

Formule da reddito da pensione:

```text
reddito <= 8.500:
detrazione = 1.955

8.500 < reddito <= 28.000:
detrazione = 700 + 1.255 x (28.000 - reddito) / 19.500

28.000 < reddito <= 50.000:
detrazione = 700 x (50.000 - reddito) / 22.000

bonus +50 per redditi tra 25.001 e 29.000
```

### 12.4 Addizionali

```text
addizionaliAnnue =
pensioneLordaAnnua x
(addizionaleRegionalePercentuale + addizionaleComunalePercentuale)
```

### 12.5 Netto

```text
impostaNettaAnnua =
max(irpefLordaAnnua - detrazioniAnnue + addizionaliAnnue, 0)

pensioneNettaAnnua =
max(pensioneLordaAnnua - impostaNettaAnnua, 0)
```

### 12.6 Mensile su 13

```text
pensioneLordaMensileMedia =
pensioneLordaAnnua / 13

pensioneNettaMensileMedia =
pensioneNettaAnnua / 13
```

Etichetta consigliata:

```text
Pensione netta mensile media su 13 mensilità
```

---

## 13. Nuovi campi dati consigliati

### 13.1 Input

Aggiungere/modificare i seguenti campi:

```ts
interface PensioneMistoInput {
  dataAssunzione: Date;
  dataDecorrenza: Date;

  retribuzionePensionabileFinale: number;

  imponibile1996?: number;
  imponibile1993Manuale?: number;
  imponibile1994Manuale?: number;
  imponibile1995Manuale?: number;

  percentualeRivalutazioneQuotaB: number; // default 0

  quotaAManuale?: number;
  quotaBManuale?: number;
  quotaRetributivaManuale?: number;

  montanteContributivo?: number;
  contributiAnnuali?: ContributoAnnuale[];

  coefficienteTrasformazione: number;

  ultimoImponibileAnnuo: number;
  applicaSeiScatti: boolean;
  applicaMoltiplicatore: boolean;
}
```

### 13.2 Output

```ts
interface DettaglioQuoteMiste {
  anniQuotaA: number;
  anniQuotaB: number;
  anniAnte1996: number;

  aliquotaQuotaA: number;
  aliquotaQuotaB: number;
  aliquotaTotaleAnte1996: number;

  retribuzionePensionabileFinale: number;

  retribuzione1993Stimata: number;
  retribuzione1994Stimata: number;
  retribuzione1995Stimata: number;

  retribuzione1993Finale: number;
  retribuzione1994Finale: number;
  retribuzione1995Finale: number;

  mediaQuotaB: number;
  percentualeRivalutazioneQuotaB: number;

  quotaAAnnua: number;
  quotaBAnnua: number;
  quotaCAnnua: number;

  effettoSeiScattiQuotaA?: number;
  effettoSeiScattiQuotaB?: number;
  effettoSeiScattiQuotaC?: number;

  moltiplicatoreMontante?: number;
  effettoMoltiplicatoreAnnua?: number;

  metodoQuotaB: 'manuale' | 'stimata_da_1996' | 'stimata_da_altro_anno' | 'non_disponibile';
  affidabilitaQuotaB: 'alta' | 'media' | 'bassa';
}
```

---

## 14. UI consigliata

### 14.1 Sezione sistema misto

Mostrare:

```text
Sistema pensionistico rilevato: Misto
```

Poi:

```text
Quota A stimata da ultima busta paga/CU
Quota B stimata automaticamente
Quota C stimata da estratto contributivo INPS
```

### 14.2 Quota B

Campo default:

```text
Rivalutazione ISTAT applicata alla quota B: 0%
```

Tooltip:

```text
Per prudenza la rivalutazione della quota B è disattivata. Puoi aumentarla manualmente se vuoi applicare parzialmente o totalmente i coefficienti ISTAT.
```

Pulsante/modalità esperto:

```text
Ho i dati reali 1993-1995
```

Se attivo, mostrare:

```text
Imponibile 1993
Imponibile 1994
Imponibile 1995
```

Pulsante alternativo:

```text
Inserisci quota B già calcolata
```

### 14.3 Disclaimer

Testo consigliato:

```text
La quota B è stimata in modo prudenziale in assenza delle retribuzioni storiche 1993-1995.
Il calcolo può differire dal valore liquidato dall'INPS, che utilizza dati retributivi e contributivi completi.
```

---

## 15. Report risultati

Nel Markdown/PDF dei risultati aggiungere una sezione:

```text
## Dettaglio sistema misto

- Quota A annua: ...
- Quota B annua stimata: ...
- Quota C annua: ...
- Totale pensione lorda annua: ...
- Metodo Quota B: stimata da imponibile 1996
- Rivalutazione ISTAT Quota B applicata: 0%
- Affidabilità Quota B: media
```

E una nota:

```text
Gli importi mensili sono medie su 13 mensilità.
```

---

## 16. Test da realizzare

### 16.1 Test coefficienti ISTAT

```text
1993 = 1.911
1994 = 1.839
1995 = 1.745
1996 = 1.680
```

### 16.2 Test stima da 1996

Input:

```text
imponibile1996 = 20.000
```

Output atteso:

```text
R1993 = 17.582,42
R1994 = 18.270,80
R1995 = 19.255,01
MediaB nominale = 18.369,41
```

### 16.3 Test Quota B senza rivalutazione

Input:

```text
mediaB = 18.369,41
anniQuotaB = 3
aliquota annua = 2,44%
```

Output:

```text
QuotaB = 1.344,64
QuotaB mensile su 13 = 103,43
```

### 16.4 Test Quota A

Input:

```text
retribuzionePensionabileFinale = 44.917,49
anniQuotaA = 3
```

Output:

```text
QuotaA = 3.287,96
QuotaA mensile su 13 = 252,92
```

### 16.5 Test Quota A + B

Input:

```text
QuotaA = 3.287,96
QuotaB = 1.344,64
```

Output:

```text
Totale retributivo annuo = 4.632,60
Totale retributivo mensile su 13 = 356,35
```

### 16.6 Test rivalutazione 100%

Input:

```text
imponibile1996 = 20.000
percentualeRivalutazioneQuotaB = 1
anniQuotaB = 3
```

Output atteso:

```text
MediaB rivalutata ≈ 33.600
QuotaB ≈ 2.459,52
```

### 16.7 Test rivalutazione 0%

Input:

```text
percentualeRivalutazioneQuotaB = 0
```

Output atteso:

```text
usare valori nominali stimati
```

### 16.8 Test sei scatti nel misto

Input:

```text
ultimoImponibileAnnuo = 40.000
anniAnte1996 = 6
```

Calcolo:

```text
seiScattiBase = 40.000 x 15% = 6.000
effettoRetributivo = 6.000 x 6 x 2,44% = 878,40
```

Non sommare 6.000 € interamente alla pensione annua.

---

## 17. Priorità implementative

### Priorità 1

- Inserire coefficienti ISTAT;
- aggiungere calcolo Quota A;
- aggiungere calcolo Quota B stimata da 1996;
- default rivalutazione Quota B = 0%;
- separare report A/B/C.

### Priorità 2

- Aggiungere modalità esperto con imponibili 1993-1995;
- aggiungere quota B manuale;
- aggiungere affidabilità Quota B.

### Priorità 3

- Raffinare sei scatti nel misto;
- separare effetto sei scatti A/B/C;
- migliorare gestione aliquote IRPEF per anno.

---

## 18. Conclusione

La modifica più importante è trasformare l'attuale `quotaRetributivaAnnua` generica in un dettaglio più trasparente:

```text
Quota Retributiva Annua =
Quota A
+ Quota B
```

dove:

```text
Quota A = retribuzione finale x anni fino 1992 x 2,44%
Quota B = media stimata 1993-1995 x anni 1993-1995 x 2,44%
```

La Quota B deve essere prudenziale:

```text
rivalutazione ISTAT default = 0%
```

ma modificabile dall'utente.

Questo consente all'app di restare semplice, prudente e coerente con il sistema misto della Polizia di Stato, migliorando molto la trasparenza della simulazione senza pretendere di sostituire il calcolo ufficiale INPS.
