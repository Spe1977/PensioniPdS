import { Injectable } from '@angular/core';
import {
  Durata,
  PensioneNettaAnzianitaInput,
  PensioneNettaEtaAnzianitaInput,
  PensioneNettaLimitiEtaInput,
  PensioneNettaResult,
  PensionResult,
  RequisitiAnzianita,
} from './pension-engine.models';

interface RequisitiAnnualiAggiornabili {
  mesiExtra: number;
}

/** Motore di calcolo pensionistico. */
@Injectable({ providedIn: 'root' })
export class PensionEngineService {
  private readonly aliquotaComputo = 0.33;
  private readonly quotaSeiScatti = 0.15;
  private readonly mensilitaPensione = 13;
  private readonly aliquoteIrpef2026 = [
    { finoA: 28_000, aliquota: 0.23 },
    { finoA: 50_000, aliquota: 0.33 },
    { finoA: Number.POSITIVE_INFINITY, aliquota: 0.43 },
  ];

  /**
   * Tabella requisiti certi per anno.
   *
   * Fonte: app.md Fase 3.4, penps.md Cap. 9 e Circolare INPS n. 28/2026.
   * Per il 2029+ resta aggiornabile: l'incremento aggiuntivo specifico del comparto
   * non viene applicato finché mancano DPCM attuativi e istruzioni INPS.
   */
  private readonly requisitiPerAnno: Record<number, RequisitiAnnualiAggiornabili> = {
    2027: { mesiExtra: 1 },
    2028: { mesiExtra: 3 },
  };

  /** Ultimo anno con requisiti certi */
  private readonly ultimoAnnoCerto = 2028;

  /**
   * Restituisce i requisiti normativi per la pensione di anzianità
   * nell'anno di maturazione specificato.
   */
  getRequisitiAnzianita(annoMaturazione: number): RequisitiAnzianita {
    // Per anni <= 2026 non ci sono adeguamenti
    if (annoMaturazione <= 2026) {
      return {
        tipo: 'anzianita',
        anno: annoMaturazione,
        anniRichiesti: 41,
        mesiExtra: 0,
        finestraMobileMesi: 15,
      };
    }

    const mesiExtra = this.mesiExtraSperanzaVita(annoMaturazione);
    if (annoMaturazione <= this.ultimoAnnoCerto) {
      return {
        tipo: 'anzianita',
        anno: annoMaturazione,
        anniRichiesti: 41,
        mesiExtra,
        finestraMobileMesi: 15,
      };
    }

    return {
      tipo: 'anzianita',
      anno: annoMaturazione,
      anniRichiesti: 41,
      mesiExtra,
      finestraMobileMesi: 15,
    };
  }

  /**
   * Restituisce i requisiti per la pensione di anzianità con requisito misto
   * età + servizio utile.
   */
  getRequisitiEtaAnzianita(annoMaturazione: number): RequisitiAnzianita {
    if (annoMaturazione <= 2026) {
      return {
        tipo: 'eta_anzianita',
        anno: annoMaturazione,
        anniRichiesti: 35,
        mesiExtra: 0,
        etaAnniRichiesti: 58,
        etaMesiExtra: 0,
        finestraMobileMesi: 12,
      };
    }

    const mesiExtra = this.mesiExtraSperanzaVita(annoMaturazione);
    if (annoMaturazione <= this.ultimoAnnoCerto) {
      return {
        tipo: 'eta_anzianita',
        anno: annoMaturazione,
        anniRichiesti: 35,
        mesiExtra: 0,
        etaAnniRichiesti: 58,
        etaMesiExtra: mesiExtra,
        finestraMobileMesi: 12,
      };
    }

    return {
      tipo: 'eta_anzianita',
      anno: annoMaturazione,
      anniRichiesti: 35,
      mesiExtra: 0,
      etaAnniRichiesti: 58,
      etaMesiExtra: mesiExtra,
      finestraMobileMesi: 12,
    };
  }

  /**
   * Restituisce i requisiti per la pensione per limiti di età ordinamentali.
   *
   * L'adeguamento alla speranza di vita si applica solo se al compimento
   * del limite ordinamentale non sono già presenti 35 anni di servizio utile.
   */
  getRequisitiLimitiEta(
    annoMaturazione: number,
    limiteOrdinamentale: number,
    applicaAdeguamento: boolean,
  ): RequisitiAnzianita {
    const mesiExtra = applicaAdeguamento ? this.mesiAdeguamentoSperanzaVita(annoMaturazione) : 0;

    return {
      tipo: 'limiti_eta',
      anno: annoMaturazione,
      anniRichiesti: 35,
      mesiExtra: 0,
      etaAnniRichiesti: limiteOrdinamentale,
      etaMesiExtra: mesiExtra,
      limiteOrdinamentale,
      servizioMinimoAnni: 20,
      finestraMobileMesi: 12,
    };
  }

  /**
   * Calcola la maggiorazione 1/5 del servizio.
   *
   * Regola: 1 anno figurativo ogni 5 anni di servizio effettivo.
   * Cap: massimo 5 anni dal 01/01/1998 (Art. 3 L. 284/1977, D.Lgs. 165/1997).
   */
  calcolaMaggiorazione(dataAssunzione: Date, dataRiferimento: Date): Durata {
    const totMesiEffettivi = this.diffInMesi(dataAssunzione, dataRiferimento);
    // 1/5 del servizio: ogni 5 mesi → 1 mese figurativo
    const mesiMaggiorazione = Math.floor(totMesiEffettivi / 5);

    // Cap: max 60 mesi (5 anni) dal 01/01/1998
    const mesiCappati = Math.min(mesiMaggiorazione, 60);

    return {
      anni: Math.floor(mesiCappati / 12),
      mesi: mesiCappati % 12,
      giorni: 0,
    };
  }

  /**
   * Calcola il servizio effettivo come Durata.
   */
  calcolaServizioEffettivo(dataAssunzione: Date, dataRiferimento: Date): Durata {
    const mesi = this.diffInMesi(dataAssunzione, dataRiferimento);
    return { anni: Math.floor(mesi / 12), mesi: mesi % 12, giorni: 0 };
  }

  /**
   * Calcola il servizio utile (effettivo + maggiorazione).
   */
  calcolaServizioUtile(
    dataAssunzione: Date,
    dataRiferimento: Date,
  ): { servizioEffettivo: Durata; maggiorazione: Durata; servizioUtile: Durata } {
    const servizioEffettivo = this.calcolaServizioEffettivo(dataAssunzione, dataRiferimento);
    const maggiorazione = this.calcolaMaggiorazione(dataAssunzione, dataRiferimento);

    const totMesiEffettivi = servizioEffettivo.anni * 12 + servizioEffettivo.mesi;
    const totMesiMagg = maggiorazione.anni * 12 + maggiorazione.mesi;
    const totMesiUtili = totMesiEffettivi + totMesiMagg;

    return {
      servizioEffettivo,
      maggiorazione,
      servizioUtile: {
        anni: Math.floor(totMesiUtili / 12),
        mesi: totMesiUtili % 12,
        giorni: 0,
      },
    };
  }

  /**
   * Calcolo principale: data di pensionamento con solo requisito di anzianità.
   *
   * Algoritmo iterativo:
   * 1. Stima iniziale: dataAssunzione + 41 anni (ipotesi base senza speranza di vita)
   * 2. Calcola il servizio utile alla data stimata
   * 3. Verifica i requisiti dell'anno di maturazione (che possono includere mesi extra)
   * 4. Se il servizio utile ≥ requisito → data trovata
   * 5. Altrimenti aggiusta e reitera
   * 6. Applica finestra mobile di 15 mesi
   */
  calcolaDataPensionamento(dataNascita: Date, dataAssunzione: Date): PensionResult {
    // Stima iniziale: servizio effettivo necessario.
    // Con magg. 1/5, per avere 41 anni utili servono ~34.17 anni effettivi (41 * 5/6)
    // Usiamo un approccio iterativo mese per mese per precisione
    const mesiMinEffettivi = Math.ceil((41 * 12 * 5) / 6); // ~410 mesi

    let dataProva = this.aggiungiMesi(dataAssunzione, mesiMinEffettivi);

    // Iterazione: cerchiamo la prima data in cui il servizio utile soddisfa il requisito
    let trovato = false;
    let maxIterazioni = 120; // Sicurezza: max 10 anni di aggiustamento

    let servizioCalcolato = this.calcolaServizioUtile(dataAssunzione, dataProva);
    let requisiti = this.getRequisitiAnzianita(dataProva.getFullYear());

    while (!trovato && maxIterazioni > 0) {
      servizioCalcolato = this.calcolaServizioUtile(dataAssunzione, dataProva);
      requisiti = this.getRequisitiAnzianita(dataProva.getFullYear());

      const mesiUtili =
        servizioCalcolato.servizioUtile.anni * 12 + servizioCalcolato.servizioUtile.mesi;
      const mesiRichiesti = requisiti.anniRichiesti * 12 + requisiti.mesiExtra;

      if (mesiUtili >= mesiRichiesti) {
        trovato = true;
      } else {
        // Avanza di 1 mese
        dataProva = this.aggiungiMesi(dataProva, 1);
      }
      maxIterazioni--;
    }

    // Data di maturazione del diritto
    const dataMaturazione = new Date(dataProva);

    // Applica finestra mobile: 15 mesi
    const dataDecorrenza = this.aggiungiMesi(dataMaturazione, requisiti.finestraMobileMesi);

    // Avviso per anni post-2028
    let avviso: string | undefined;
    if (dataMaturazione.getFullYear() > this.ultimoAnnoCerto) {
      avviso =
        'Attenzione: i requisiti per gli anni successivi al 2028 non sono ancora definitivi. ' +
        'Sono stati utilizzati i parametri del 2028 in attesa dei DPCM attuativi e delle istruzioni INPS.';
    }

    return {
      dataMaturazioneDiritto: dataMaturazione,
      dataDecorrenza,
      servizioEffettivo: servizioCalcolato.servizioEffettivo,
      maggiorazione: servizioCalcolato.maggiorazione,
      servizioUtile: servizioCalcolato.servizioUtile,
      requisitiApplicati: requisiti,
      avviso,
    };
  }

  /**
   * Calcolo pensione di anzianità con requisito età + anzianità.
   *
   * Requisiti:
   * - fino al 2026: 58 anni di età + 35 anni di servizio utile;
   * - 2027: 58 anni e 1 mese + 35 anni di servizio utile;
   * - 2028: 58 anni e 3 mesi + 35 anni di servizio utile;
   * - finestra mobile: 12 mesi.
   */
  calcolaDataPensionamentoEtaAnzianita(dataNascita: Date, dataAssunzione: Date): PensionResult {
    const mesiServizioRichiesti = 35 * 12;
    const dataRequisitoServizio = this.trovaDataServizioUtile(
      dataAssunzione,
      mesiServizioRichiesti,
    );
    let dataMaturazione = this.maxData(
      this.aggiungiMesi(dataNascita, 58 * 12),
      dataRequisitoServizio,
    );
    let requisiti = this.getRequisitiEtaAnzianita(dataMaturazione.getFullYear());

    let maxIterazioni = 24;
    while (maxIterazioni > 0) {
      const dataRequisitoEta = this.aggiungiMesi(
        dataNascita,
        (requisiti.etaAnniRichiesti ?? 58) * 12 + (requisiti.etaMesiExtra ?? 0),
      );
      const candidato = this.maxData(dataRequisitoEta, dataRequisitoServizio);
      const requisitiAggiornati = this.getRequisitiEtaAnzianita(candidato.getFullYear());

      if (
        candidato.getTime() === dataMaturazione.getTime() &&
        requisitiAggiornati.etaMesiExtra === requisiti.etaMesiExtra
      ) {
        break;
      }

      dataMaturazione = candidato;
      requisiti = requisitiAggiornati;
      maxIterazioni--;
    }

    const servizioCalcolato = this.calcolaServizioUtile(dataAssunzione, dataMaturazione);
    const dataDecorrenza = this.aggiungiMesi(dataMaturazione, requisiti.finestraMobileMesi);

    let avviso: string | undefined;
    if (dataMaturazione.getFullYear() > this.ultimoAnnoCerto) {
      avviso =
        'Attenzione: i requisiti per gli anni successivi al 2028 non sono ancora definitivi. ' +
        'Sono stati utilizzati i parametri del 2028 in attesa dei DPCM attuativi e delle istruzioni INPS.';
    }

    return {
      dataMaturazioneDiritto: dataMaturazione,
      dataDecorrenza,
      servizioEffettivo: servizioCalcolato.servizioEffettivo,
      maggiorazione: servizioCalcolato.maggiorazione,
      servizioUtile: servizioCalcolato.servizioUtile,
      requisitiApplicati: requisiti,
      avviso,
    };
  }

  /** Restituisce il primo giorno del mese successivo */
  private primoGiornoMeseSuccessivo(data: Date): Date {
    return new Date(data.getFullYear(), data.getMonth() + 1, 1);
  }

  /**
   * Calcolo pensione per limiti di età ordinamentali.
   *
   * Requisiti:
   * - limite ordinamentale per qualifica: 60, 63 o 65 anni;
   * - almeno 20 anni di servizio utile;
   * - se al limite sono già presenti 35 anni utili, non si applica speranza di vita;
   * - se al limite non sono presenti 35 anni utili, si applica l'adeguamento anagrafico;
   * - finestra mobile ordinaria: 12 mesi (da conteggiare sui 35 anni).
   */
  calcolaDataPensionamentoLimitiEta(
    dataNascita: Date,
    dataAssunzione: Date,
    limiteOrdinamentale: number,
  ): PensionResult {
    const dataCompimentoEta = this.aggiungiMesi(dataNascita, limiteOrdinamentale * 12);
    const dataLimiteOrdinamentale = this.primoGiornoMeseSuccessivo(dataCompimentoEta);

    const servizioAlLimite = this.calcolaServizioUtile(dataAssunzione, dataLimiteOrdinamentale);
    const mesiUtiliAlLimite =
      servizioAlLimite.servizioUtile.anni * 12 + servizioAlLimite.servizioUtile.mesi;
    const haAnzianitaAlLimite = mesiUtiliAlLimite >= 35 * 12;

    const requisiti = this.getRequisitiLimitiEta(
      dataLimiteOrdinamentale.getFullYear(),
      limiteOrdinamentale,
      !haAnzianitaAlLimite,
    );

    let dataDecorrenza: Date;
    let dataMaturazione: Date;

    if (haAnzianitaAlLimite) {
      // Caso 1/2: Ha 35 anni al limite ordinamentale
      const data35Anni = this.trovaDataServizioUtile(dataAssunzione, 35 * 12);
      const dataScadenzaFinestra35 = this.aggiungiMesi(data35Anni, 12);

      dataMaturazione = dataLimiteOrdinamentale;
      dataDecorrenza = this.maxData(dataLimiteOrdinamentale, dataScadenzaFinestra35);
    } else {
      // Caso con adeguamento speranza di vita
      const dataAdeguata = this.aggiungiMesi(dataLimiteOrdinamentale, requisiti.etaMesiExtra ?? 0);
      const dataDecorrenzaLimite = this.aggiungiMesi(dataAdeguata, requisiti.finestraMobileMesi);

      const data35Anni = this.trovaDataServizioUtile(dataAssunzione, 35 * 12);
      const dataDecorrenza35 = this.aggiungiMesi(data35Anni, 12);

      if (dataDecorrenza35.getTime() < dataDecorrenzaLimite.getTime()) {
        dataDecorrenza = dataDecorrenza35;
        dataMaturazione = data35Anni;
      } else {
        dataDecorrenza = dataDecorrenzaLimite;
        dataMaturazione = dataAdeguata;
      }
    }

    const dataServizioMinimo = this.trovaDataServizioUtile(dataAssunzione, 20 * 12);
    if (dataDecorrenza.getTime() < dataServizioMinimo.getTime()) {
      dataDecorrenza = dataServizioMinimo;
      dataMaturazione = dataServizioMinimo;
    } else {
      dataDecorrenza = this.maxData(dataDecorrenza, dataServizioMinimo);
      dataMaturazione = this.maxData(dataMaturazione, dataServizioMinimo);
    }

    const servizioCalcolato = this.calcolaServizioUtile(dataAssunzione, dataDecorrenza);

    let avviso: string | undefined;
    if (dataDecorrenza.getFullYear() > this.ultimoAnnoCerto) {
      avviso =
        'Attenzione: i requisiti per gli anni successivi al 2028 non sono ancora definitivi. ' +
        'Sono stati utilizzati i parametri del 2028 in attesa dei DPCM attuativi e delle istruzioni INPS.';
    }

    return {
      dataMaturazioneDiritto: dataMaturazione,
      dataDecorrenza,
      servizioEffettivo: servizioCalcolato.servizioEffettivo,
      maggiorazione: servizioCalcolato.maggiorazione,
      servizioUtile: servizioCalcolato.servizioUtile,
      requisitiApplicati: requisiti,
      avviso,
    };
  }

  /**
   * Calcola la pensione netta per la pensione di anzianità a domanda.
   *
   * Per questo scenario il moltiplicatore non spetta; la maggiorazione 1/5 resta fuori
   * dal montante contributivo. I sei scatti sono applicati sulle quote retributive
   * quando presenti e come incremento figurativo del montante per la quota contributiva.
   */
  calcolaPensioneNettaAnzianita(input: PensioneNettaAnzianitaInput): PensioneNettaResult {
    const ultimoImponibileAnnuo = this.soloPositivi(input.ultimoImponibileAnnuo);
    const quotaRetributivaBase =
      input.scenario === 'contributivo_puro' ? 0 : this.soloPositivi(input.quotaRetributivaAnnua);
    const montanteContributivo = this.soloPositivi(input.montanteContributivo);
    const coefficienteTrasformazione = this.normalizzaPercentuale(
      input.coefficienteTrasformazione ?? 0,
    );
    const applicaSeiScatti = input.applicaSeiScatti ?? true;
    const seiScattiBase = applicaSeiScatti ? ultimoImponibileAnnuo * this.quotaSeiScatti : 0;
    const seiScattiRetributiviAnnui = input.scenario === 'contributivo_puro' ? 0 : seiScattiBase;
    const seiScattiMontanteFigurativo = seiScattiBase * this.aliquotaComputo;
    const montanteFinale = montanteContributivo + seiScattiMontanteFigurativo;
    const quotaContributivaAnnua = montanteFinale * coefficienteTrasformazione;
    const quotaRetributivaAnnua = quotaRetributivaBase + seiScattiRetributiviAnnui;
    const pensioneLordaAnnua = quotaRetributivaAnnua + quotaContributivaAnnua;
    const irpefLordaAnnua = this.calcolaIrpefLorda(pensioneLordaAnnua);
    const detrazioniAnnue = Math.min(
      irpefLordaAnnua,
      this.soloPositivi(input.detrazioniAnnue) +
        this.soloPositivi(input.carichiFamiliariDetrazioniAnnue),
    );
    const addizionaliAnnue =
      pensioneLordaAnnua *
      (this.daPercentuale(input.addizionaleRegionalePercentuale ?? 0) +
        this.daPercentuale(input.addizionaleComunalePercentuale ?? 0));
    const impostaNettaAnnua = Math.max(irpefLordaAnnua - detrazioniAnnue + addizionaliAnnue, 0);
    const pensioneNettaAnnua = Math.max(pensioneLordaAnnua - impostaNettaAnnua, 0);

    return {
      scenario: input.scenario,
      quotaRetributivaAnnua: this.arrotondaEuro(quotaRetributivaAnnua),
      quotaContributivaAnnua: this.arrotondaEuro(quotaContributivaAnnua),
      seiScattiRetributiviAnnui: this.arrotondaEuro(seiScattiRetributiviAnnui),
      seiScattiMontanteFigurativo: this.arrotondaEuro(seiScattiMontanteFigurativo),
      moltiplicatoreMontante: 0,
      pensioneLordaAnnua: this.arrotondaEuro(pensioneLordaAnnua),
      pensioneLordaMensile: this.arrotondaEuro(pensioneLordaAnnua / this.mensilitaPensione),
      irpefLordaAnnua: this.arrotondaEuro(irpefLordaAnnua),
      detrazioniAnnue: this.arrotondaEuro(detrazioniAnnue),
      addizionaliAnnue: this.arrotondaEuro(addizionaliAnnue),
      impostaNettaAnnua: this.arrotondaEuro(impostaNettaAnnua),
      pensioneNettaAnnua: this.arrotondaEuro(pensioneNettaAnnua),
      pensioneNettaMensile: this.arrotondaEuro(pensioneNettaAnnua / this.mensilitaPensione),
      noteBenefici: [
        'Pensione di anzianità a domanda: moltiplicatore non applicato.',
        'Maggiorazione 1/5 usata per il diritto, non come incremento del montante contributivo.',
        applicaSeiScatti
          ? 'Sei scatti inclusi secondo lo scenario di calcolo selezionato.'
          : 'Sei scatti esclusi su scelta manuale.',
      ],
    };
  }

  /**
   * Fase 4.2: Calcolo della pensione netta con requisito età + anzianità (Cessazione a domanda).
   * Identico al calcolo di sola anzianità: il moltiplicatore NON si applica.
   * I 6 scatti si calcolano e il 1/5 vale per il diritto.
   */
  calcolaPensioneNettaEtaAnzianita(input: PensioneNettaEtaAnzianitaInput): PensioneNettaResult {
    const result = this.calcolaPensioneNettaAnzianita(input);
    result.noteBenefici[0] = 'Pensione età+anzianità a domanda: moltiplicatore non applicato.';
    return result;
  }

  /**
   * Fase 4.3: Calcolo della pensione netta per limiti di età ordinamentali.
   *
   * Applica il moltiplicatore (se previsto) e i 6 scatti.
   * Il moltiplicatore incrementa il montante contributivo di:
   * 5 * ultimoImponibileAnnuo * aliquotaComputo (33%).
   */
  calcolaPensioneNettaLimitiEta(input: PensioneNettaLimitiEtaInput): PensioneNettaResult {
    const ultimoImponibileAnnuo = this.soloPositivi(input.ultimoImponibileAnnuo);
    const quotaRetributivaBase =
      input.scenario === 'contributivo_puro' ? 0 : this.soloPositivi(input.quotaRetributivaAnnua);
    const montanteContributivoBase = this.soloPositivi(input.montanteContributivo);
    const coefficienteTrasformazione = this.normalizzaPercentuale(
      input.coefficienteTrasformazione ?? 0,
    );

    const applicaSeiScatti = input.applicaSeiScatti ?? true;
    const seiScattiBase = applicaSeiScatti ? ultimoImponibileAnnuo * this.quotaSeiScatti : 0;
    const seiScattiRetributiviAnnui = input.scenario === 'contributivo_puro' ? 0 : seiScattiBase;
    const seiScattiMontanteFigurativo = seiScattiBase * this.aliquotaComputo;

    const applicaMoltiplicatore = input.applicaMoltiplicatore ?? true;
    const moltiplicatoreMontante = applicaMoltiplicatore
      ? ultimoImponibileAnnuo * 5 * this.aliquotaComputo
      : 0;

    const montanteFinale =
      montanteContributivoBase + seiScattiMontanteFigurativo + moltiplicatoreMontante;
    const quotaContributivaAnnua = montanteFinale * coefficienteTrasformazione;
    const quotaRetributivaAnnua = quotaRetributivaBase + seiScattiRetributiviAnnui;
    const pensioneLordaAnnua = quotaRetributivaAnnua + quotaContributivaAnnua;

    const irpefLordaAnnua = this.calcolaIrpefLorda(pensioneLordaAnnua);
    const detrazioniAnnue = Math.min(
      irpefLordaAnnua,
      this.soloPositivi(input.detrazioniAnnue) +
        this.soloPositivi(input.carichiFamiliariDetrazioniAnnue),
    );
    const addizionaliAnnue =
      pensioneLordaAnnua *
      (this.daPercentuale(input.addizionaleRegionalePercentuale ?? 0) +
        this.daPercentuale(input.addizionaleComunalePercentuale ?? 0));
    const impostaNettaAnnua = Math.max(irpefLordaAnnua - detrazioniAnnue + addizionaliAnnue, 0);
    const pensioneNettaAnnua = Math.max(pensioneLordaAnnua - impostaNettaAnnua, 0);

    return {
      scenario: input.scenario,
      quotaRetributivaAnnua: this.arrotondaEuro(quotaRetributivaAnnua),
      quotaContributivaAnnua: this.arrotondaEuro(quotaContributivaAnnua),
      seiScattiRetributiviAnnui: this.arrotondaEuro(seiScattiRetributiviAnnui),
      seiScattiMontanteFigurativo: this.arrotondaEuro(seiScattiMontanteFigurativo),
      moltiplicatoreMontante: this.arrotondaEuro(moltiplicatoreMontante),
      pensioneLordaAnnua: this.arrotondaEuro(pensioneLordaAnnua),
      pensioneLordaMensile: this.arrotondaEuro(pensioneLordaAnnua / this.mensilitaPensione),
      irpefLordaAnnua: this.arrotondaEuro(irpefLordaAnnua),
      detrazioniAnnue: this.arrotondaEuro(detrazioniAnnue),
      addizionaliAnnue: this.arrotondaEuro(addizionaliAnnue),
      impostaNettaAnnua: this.arrotondaEuro(impostaNettaAnnua),
      pensioneNettaAnnua: this.arrotondaEuro(pensioneNettaAnnua),
      pensioneNettaMensile: this.arrotondaEuro(pensioneNettaAnnua / this.mensilitaPensione),
      noteBenefici: [
        applicaMoltiplicatore
          ? 'Pensione limiti età: moltiplicatore applicato in misura piena sul montante.'
          : 'Pensione limiti età: moltiplicatore escluso su scelta manuale.',
        'Maggiorazione 1/5 rilevante per il diritto e, se misto, sulle quote retributive.',
        applicaSeiScatti
          ? 'Sei scatti inclusi (sia come incremento retributivo sia come figurativo per il montante).'
          : 'Sei scatti esclusi su scelta manuale.',
      ],
    };
  }

  calcolaIrpefLorda(redditoAnnuo: number): number {
    const reddito = this.soloPositivi(redditoAnnuo);
    let residuo = reddito;
    let limitePrecedente = 0;
    let imposta = 0;

    for (const scaglione of this.aliquoteIrpef2026) {
      const imponibileScaglione = Math.min(residuo, scaglione.finoA - limitePrecedente);
      if (imponibileScaglione <= 0) break;

      imposta += imponibileScaglione * scaglione.aliquota;
      residuo -= imponibileScaglione;
      limitePrecedente = scaglione.finoA;
    }

    return this.arrotondaEuro(imposta);
  }

  // ── Utility ──

  /** Differenza in mesi interi tra due date */
  diffInMesi(da: Date, a: Date): number {
    let mesi = (a.getFullYear() - da.getFullYear()) * 12 + (a.getMonth() - da.getMonth());

    if (this.aggiungiMesi(da, mesi).getTime() > a.getTime()) {
      mesi--;
    }

    return Math.max(mesi, 0);
  }

  /** Aggiunge N mesi a una data */
  aggiungiMesi(data: Date, mesi: number): Date {
    const risultato = new Date(data);
    const giornoOriginale = risultato.getDate();

    risultato.setDate(1);
    risultato.setMonth(risultato.getMonth() + mesi);

    const ultimoGiornoMese = new Date(
      risultato.getFullYear(),
      risultato.getMonth() + 1,
      0,
    ).getDate();
    risultato.setDate(Math.min(giornoOriginale, ultimoGiornoMese));

    return risultato;
  }

  private trovaDataServizioUtile(dataAssunzione: Date, mesiRichiesti: number): Date {
    let dataProva = this.aggiungiMesi(dataAssunzione, Math.max(mesiRichiesti - 60, 0));
    let maxIterazioni = 180;

    while (maxIterazioni > 0) {
      const servizio = this.calcolaServizioUtile(dataAssunzione, dataProva);
      const mesiUtili = servizio.servizioUtile.anni * 12 + servizio.servizioUtile.mesi;

      if (mesiUtili >= mesiRichiesti) {
        return dataProva;
      }

      dataProva = this.aggiungiMesi(dataProva, 1);
      maxIterazioni--;
    }

    return dataProva;
  }

  private maxData(prima: Date, seconda: Date): Date {
    return new Date(Math.max(prima.getTime(), seconda.getTime()));
  }

  private mesiAdeguamentoSperanzaVita(annoMaturazione: number): number {
    if (annoMaturazione <= 2026) {
      return 0;
    }

    return this.mesiExtraSperanzaVita(annoMaturazione);
  }

  private mesiExtraSperanzaVita(annoMaturazione: number): number {
    return (
      this.requisitiPerAnno[annoMaturazione]?.mesiExtra ??
      this.requisitiPerAnno[this.ultimoAnnoCerto].mesiExtra
    );
  }

  private normalizzaPercentuale(valore: number): number {
    const numero = this.soloPositivi(valore);
    return numero > 1 ? numero / 100 : numero;
  }

  private daPercentuale(valore: number): number {
    return this.soloPositivi(valore) / 100;
  }

  private soloPositivi(valore: number | null | undefined): number {
    return Math.max(Number(valore) || 0, 0);
  }

  private arrotondaEuro(valore: number): number {
    return Math.round((valore + Number.EPSILON) * 100) / 100;
  }
}
