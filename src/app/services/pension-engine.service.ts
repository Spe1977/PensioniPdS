import { Injectable } from '@angular/core';
import {
  AffidabilitaStima,
  ContributoAnnuale,
  DettaglioQuoteMiste,
  Durata,
  MetodoQuotaB,
  PensioneNettaBaseInput,
  PensioneNettaAnzianitaInput,
  PensioneNettaEtaAnzianitaInput,
  PensioneNettaLimitiEtaInput,
  PensioneNettaResult,
  PensionResult,
  QuoteMisteInput,
  RequisitiAnzianita,
} from './pension-engine.models';

interface CalcoloQuoteRetributive {
  quotaRetributivaBase: number;
  dettaglio?: DettaglioQuoteMiste;
}

interface RequisitiAnnualiAggiornabili {
  mesiExtra: number;
}

/** Motore di calcolo pensionistico. */
@Injectable({ providedIn: 'root' })
export class PensionEngineService {
  private readonly aliquotaComputo = 0.33;
  private readonly quotaSeiScatti = 0.15;
  private readonly mensilitaPensione = 13;
  private readonly ultimoAnnoRivalutazioneUfficiale = 2025;
  /**
   * Aliquota retributiva annua per il sistema misto (art. 54 DPR 1092/1973,
   * Circ. INPS n. 44/2022): 2,44% per ogni anno utile maturato al 31/12/1995
   * per il personale delle Forze di polizia a ordinamento civile con
   * anzianità contributiva al 31/12/1995 inferiore a 18 anni.
   */
  private readonly aliquotaRetributivaAnnuaMisto = 0.0244;

  /**
   * Coefficienti ISTAT FOI(nt) - generale al netto dei tabacchi - a valori 2023.
   * Usati per la ricostruzione storica delle retribuzioni pensionabili
   * 1993-1995 ai fini della Quota B nel sistema misto.
   * Fonte: ISTAT FOI 2023.
   */
  private readonly coefficientiIstatFoi2023: Record<number, number> = {
    1993: 1.911,
    1994: 1.839,
    1995: 1.745,
    1996: 1.68,
    2023: 1,
  };
  private readonly aliquoteIrpef2026 = [
    { finoA: 28_000, aliquota: 0.23 },
    { finoA: 50_000, aliquota: 0.33 },
    { finoA: Number.POSITIVE_INFINITY, aliquota: 0.43 },
  ];

  /** Coefficienti di rivalutazione del montante da penps.md Cap. 8. */
  private readonly coefficientiRivalutazioneMontante: Record<number, number> = {
    1996: 1.062608,
    1997: 1.055871,
    1998: 1.053597,
    1999: 1.056503,
    2000: 1.051781,
    2001: 1.047781,
    2002: 1.043698,
    2003: 1.041614,
    2004: 1.039272,
    2005: 1.040506,
    2006: 1.035386,
    2007: 1.033937,
    2008: 1.034625,
    2009: 1.033201,
    2010: 1.017935,
    2011: 1.016165,
    2012: 1.011344,
    2013: 1.001643,
    2014: 1,
    2015: 1.005058,
    2016: 1.004684,
    2017: 1.005205,
    2018: 1.013478,
    2019: 1.018254,
    2020: 1.019199,
    2021: 1,
    2022: 1.009756,
    2023: 1.023082,
    2024: 1.036622,
    2025: 1.040445,
  };

  /** Coefficienti di trasformazione da penps.md Cap. 9, espressi come fattori. */
  private readonly coefficientiTrasformazione: Record<
    number,
    {
      l335_1996_2009?: number;
      l247_2010_2012?: number;
      dm2012_2013_2015?: number;
      dm2015_2016_2018?: number;
      dm2018_2019_2020?: number;
      dm2020_2021_2022?: number;
      dm2022_2023_2024?: number;
      dm2024_dal_2025?: number;
    }
  > = {
    57: this.creaCoefficientiTrasformazione(4.72, 4.419, 4.304, 4.246, 4.2, 4.186, 4.27, 4.204),
    58: this.creaCoefficientiTrasformazione(4.86, 4.538, 4.416, 4.354, 4.304, 4.289, 4.378, 4.308),
    59: this.creaCoefficientiTrasformazione(5.006, 4.664, 4.535, 4.468, 4.414, 4.399, 4.493, 4.419),
    60: this.creaCoefficientiTrasformazione(5.136, 4.798, 4.661, 4.589, 4.532, 4.515, 4.615, 4.536),
    61: this.creaCoefficientiTrasformazione(5.334, 4.94, 4.796, 4.719, 4.657, 4.639, 4.744, 4.661),
    62: this.creaCoefficientiTrasformazione(5.514, 5.093, 4.94, 4.856, 4.79, 4.77, 4.882, 4.795),
    63: this.creaCoefficientiTrasformazione(5.706, 5.257, 5.094, 5.002, 4.932, 4.91, 5.028, 4.936),
    64: this.creaCoefficientiTrasformazione(5.911, 5.432, 5.259, 5.159, 5.083, 5.06, 5.184, 5.088),
    65: this.creaCoefficientiTrasformazione(6.136, 5.62, 5.435, 5.326, 5.245, 5.22, 5.352, 5.25),
    66: this.creaCoefficientiTrasformazione(
      undefined,
      undefined,
      5.624,
      5.506,
      5.419,
      5.391,
      5.531,
      5.423,
    ),
    67: this.creaCoefficientiTrasformazione(
      undefined,
      undefined,
      5.826,
      5.7,
      5.604,
      5.575,
      5.723,
      5.608,
    ),
    68: this.creaCoefficientiTrasformazione(
      undefined,
      undefined,
      6.046,
      5.91,
      5.804,
      5.772,
      5.931,
      5.808,
    ),
    69: this.creaCoefficientiTrasformazione(
      undefined,
      undefined,
      6.283,
      6.135,
      6.021,
      5.985,
      6.154,
      6.024,
    ),
    70: this.creaCoefficientiTrasformazione(
      undefined,
      undefined,
      6.541,
      6.378,
      6.257,
      6.215,
      6.395,
      6.258,
    ),
    71: this.creaCoefficientiTrasformazione(
      undefined,
      undefined,
      undefined,
      undefined,
      6.513,
      6.466,
      6.655,
      6.51,
    ),
  };

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

  getCoefficienteRivalutazioneMontante(anno: number): number | undefined {
    return this.coefficientiRivalutazioneMontante[anno];
  }

  getCoefficienteTrasformazione(eta: number, annoDecorrenza: number): number | undefined {
    const coefficientiEta = this.coefficientiTrasformazione[eta];
    if (!coefficientiEta) return undefined;

    if (annoDecorrenza <= 2009) return coefficientiEta.l335_1996_2009;
    if (annoDecorrenza <= 2012) return coefficientiEta.l247_2010_2012;
    if (annoDecorrenza <= 2015) return coefficientiEta.dm2012_2013_2015;
    if (annoDecorrenza <= 2018) return coefficientiEta.dm2015_2016_2018;
    if (annoDecorrenza <= 2020) return coefficientiEta.dm2018_2019_2020;
    if (annoDecorrenza <= 2022) return coefficientiEta.dm2020_2021_2022;
    if (annoDecorrenza <= 2024) return coefficientiEta.dm2022_2023_2024;
    return coefficientiEta.dm2024_dal_2025;
  }

  getCoefficienteTrasformazionePerData(
    dataNascita: Date,
    dataDecorrenza: Date,
  ): number | undefined {
    return this.getCoefficienteTrasformazione(
      this.etaAnniCompiuti(dataNascita, dataDecorrenza),
      dataDecorrenza.getFullYear(),
    );
  }

  calcolaMontanteContributivoRivalutato(
    contributiAnnuali: ContributoAnnuale[],
    annoCalcolo = this.ultimoAnnoRivalutazioneUfficiale,
    tassiRivalutazioneManuali: PensioneNettaBaseInput['tassiRivalutazioneManuali'] = [],
  ): number {
    const contributiPerAnno = this.raggruppaContributiAnnuali(contributiAnnuali);
    const anniConContributi = Object.keys(contributiPerAnno).map(Number);
    if (anniConContributi.length === 0) return 0;

    const primoAnno = Math.min(...anniConContributi);
    const ultimoAnno = Math.max(annoCalcolo, ...anniConContributi);
    let montante = 0;

    for (let anno = primoAnno; anno <= ultimoAnno; anno++) {
      montante =
        montante * this.coefficienteRivalutazioneDaUsare(anno, tassiRivalutazioneManuali) +
        (contributiPerAnno[anno] ?? 0);
    }

    return this.arrotondaEuro(montante);
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
    const calcoloQuote = this.determinaQuoteRetributive(input);
    const quotaRetributivaBase =
      input.scenario === 'contributivo_puro' ? 0 : calcoloQuote.quotaRetributivaBase;
    const montanteContributivo = this.calcolaMontanteContributivoDaInput(input);
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

    const annoCalcolo = input.annoCalcolo ?? new Date().getFullYear();
    const irpefLordaAnnua = this.calcolaIrpefLorda(pensioneLordaAnnua, annoCalcolo);
    const detrazioniPensione = this.calcolaDetrazioniPensione(pensioneLordaAnnua);
    const carichiFamiliari = this.soloPositivi(input.carichiFamiliariDetrazioniAnnue);

    const detrazioniAnnue = Math.min(irpefLordaAnnua, detrazioniPensione + carichiFamiliari);
    const addizionaliAnnue =
      pensioneLordaAnnua *
      (this.daPercentuale(input.addizionaleRegionalePercentuale ?? 0) +
        this.daPercentuale(input.addizionaleComunalePercentuale ?? 0));
    const impostaNettaAnnua = Math.max(irpefLordaAnnua - detrazioniAnnue + addizionaliAnnue, 0);
    const pensioneNettaAnnua = Math.max(pensioneLordaAnnua - impostaNettaAnnua, 0);

    const dettaglioQuoteMiste = this.componiDettaglioQuoteMiste(
      calcoloQuote.dettaglio,
      input.scenario,
      quotaContributivaAnnua,
    );

    return {
      scenario: input.scenario,
      montanteContributivoBase: this.arrotondaEuro(montanteContributivo),
      montanteContributivoFinale: this.arrotondaEuro(montanteFinale),
      coefficienteTrasformazione,
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
      dettaglioQuoteMiste,
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
    const calcoloQuote = this.determinaQuoteRetributive(input);
    const quotaRetributivaBase =
      input.scenario === 'contributivo_puro' ? 0 : calcoloQuote.quotaRetributivaBase;
    const montanteContributivoBase = this.calcolaMontanteContributivoDaInput(input);
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

    const annoCalcolo = input.annoCalcolo ?? new Date().getFullYear();
    const irpefLordaAnnua = this.calcolaIrpefLorda(pensioneLordaAnnua, annoCalcolo);
    const detrazioniPensione = this.calcolaDetrazioniPensione(pensioneLordaAnnua);
    const carichiFamiliari = this.soloPositivi(input.carichiFamiliariDetrazioniAnnue);

    const detrazioniAnnue = Math.min(irpefLordaAnnua, detrazioniPensione + carichiFamiliari);
    const addizionaliAnnue =
      pensioneLordaAnnua *
      (this.daPercentuale(input.addizionaleRegionalePercentuale ?? 0) +
        this.daPercentuale(input.addizionaleComunalePercentuale ?? 0));
    const impostaNettaAnnua = Math.max(irpefLordaAnnua - detrazioniAnnue + addizionaliAnnue, 0);
    const pensioneNettaAnnua = Math.max(pensioneLordaAnnua - impostaNettaAnnua, 0);

    return {
      scenario: input.scenario,
      montanteContributivoBase: this.arrotondaEuro(montanteContributivoBase),
      montanteContributivoFinale: this.arrotondaEuro(montanteFinale),
      coefficienteTrasformazione,
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
        'Le addizionali regionali e comunali sono stimate e possono variare in caso di cambio di residenza.',
      ],
      dettaglioQuoteMiste: this.componiDettaglioQuoteMiste(
        calcoloQuote.dettaglio,
        input.scenario,
        quotaContributivaAnnua,
      ),
    };
  }

  calcolaIrpefLorda(redditoAnnuo: number, annoCalcolo = 2026): number {
    const reddito = this.soloPositivi(redditoAnnuo);
    let residuo = reddito;
    let limitePrecedente = 0;
    let imposta = 0;

    const aliquoteIrpef =
      annoCalcolo < 2026
        ? [
            { finoA: 28_000, aliquota: 0.23 },
            { finoA: 50_000, aliquota: 0.35 },
            { finoA: Number.POSITIVE_INFINITY, aliquota: 0.43 },
          ]
        : [
            { finoA: 28_000, aliquota: 0.23 },
            { finoA: 50_000, aliquota: 0.33 },
            { finoA: Number.POSITIVE_INFINITY, aliquota: 0.43 },
          ];

    for (const scaglione of aliquoteIrpef) {
      const imponibileScaglione = Math.min(residuo, scaglione.finoA - limitePrecedente);
      if (imponibileScaglione <= 0) break;

      imposta += imponibileScaglione * scaglione.aliquota;
      residuo -= imponibileScaglione;
      limitePrecedente = scaglione.finoA;
    }

    return this.arrotondaEuro(imposta);
  }

  calcolaDetrazioniPensione(redditoAnnuo: number): number {
    const reddito = this.soloPositivi(redditoAnnuo);
    if (reddito <= 8500) {
      return 1955;
    }

    let detrazione = 0;
    if (reddito <= 28000) {
      detrazione = 700 + 1255 * ((28000 - reddito) / 19500);
    } else if (reddito <= 50000) {
      detrazione = 700 * ((50000 - reddito) / 22000);
    }

    if (reddito > 25000 && reddito <= 29000) {
      detrazione += 50;
    }

    return this.arrotondaEuro(Math.max(detrazione, 0));
  }

  /**
   * Restituisce il coefficiente ISTAT FOI(nt) per ricostruire una retribuzione
   * dell'anno indicato a valori 2023.
   */
  getCoefficienteIstatFoi2023(anno: number): number | undefined {
    return this.coefficientiIstatFoi2023[anno];
  }

  /**
   * Calcola la Quota A retributiva (servizio fino al 31/12/1992) con aliquota
   * art. 54 DPR 1092/1973 (Circ. INPS 44/2022).
   */
  calcolaQuotaA(retribuzionePensionabileFinale: number, anniQuotaA: number): number {
    const retribuzione = this.soloPositivi(retribuzionePensionabileFinale);
    const anni = this.soloPositivi(anniQuotaA);
    return retribuzione * anni * this.aliquotaRetributivaAnnuaMisto;
  }

  /**
   * Stima le retribuzioni 1993, 1994, 1995 a partire da un imponibile noto
   * di un anno base (tipicamente 1996), usando i coefficienti ISTAT FOI(nt).
   *
   * Formula: RetribuzioneAnnoX = imponibileBase × coeffBase / coeffAnnoX
   */
  stimaRetribuzioniQuotaB(
    imponibileBase: number,
    annoBase = 1996,
  ): { retribuzione1993: number; retribuzione1994: number; retribuzione1995: number } {
    const valore = this.soloPositivi(imponibileBase);
    const coeffBase =
      this.coefficientiIstatFoi2023[annoBase] ?? this.coefficientiIstatFoi2023[1996];

    return {
      retribuzione1993: this.proiettaRetribuzioneStorica(valore, coeffBase, 1993),
      retribuzione1994: this.proiettaRetribuzioneStorica(valore, coeffBase, 1994),
      retribuzione1995: this.proiettaRetribuzioneStorica(valore, coeffBase, 1995),
    };
  }

  /**
   * Calcola la Quota B (servizio 1993-1995) usando la media delle retribuzioni
   * pensionabili stimate o reali e l'aliquota 2,44% × anni di Quota B.
   */
  calcolaQuotaB(mediaRetribuzioniQuotaB: number, anniQuotaB: number): number {
    const media = this.soloPositivi(mediaRetribuzioniQuotaB);
    const anni = this.soloPositivi(anniQuotaB);
    return media * anni * this.aliquotaRetributivaAnnuaMisto;
  }

  /**
   * Determina la quota retributiva base e, se ci sono dati sufficienti,
   * il dettaglio Quote A/B del sistema misto.
   *
   * Logica:
   * - se l'utente fornisce `quoteMiste` con `quotaAManuale`/`quotaBManuale`
   *   o anni e retribuzioni, calcola le quote A e B separatamente;
   * - in mancanza di dati, ricade sul valore manuale `quotaRetributivaAnnua`
   *   esistente, mantenendo la retro-compatibilità.
   */
  private determinaQuoteRetributive(input: PensioneNettaBaseInput): CalcoloQuoteRetributive {
    const fallback = this.soloPositivi(input.quotaRetributivaAnnua);
    const quoteMiste = input.quoteMiste;
    if (!quoteMiste) {
      return { quotaRetributivaBase: fallback };
    }

    const anniQuotaA = this.soloPositivi(quoteMiste.anniQuotaA);
    const anniQuotaB = this.soloPositivi(quoteMiste.anniQuotaB);
    const retribuzioneFinale = this.soloPositivi(quoteMiste.retribuzionePensionabileFinale);
    const percentualeRivalutazione = this.normalizzaPercentuale(
      quoteMiste.percentualeRivalutazioneQuotaB ?? 0,
    );

    const haDatiManuali =
      quoteMiste.quotaAManuale !== undefined || quoteMiste.quotaBManuale !== undefined;
    const haAnni = anniQuotaA > 0 || anniQuotaB > 0;
    const haDatiB = this.haDatiPerStimaQuotaB(quoteMiste);
    if (!haDatiManuali && !haAnni && !haDatiB) {
      return { quotaRetributivaBase: fallback };
    }

    const stima = this.stimaRetribuzioniPerQuotaB(quoteMiste);
    const finali = this.applicaRivalutazioneQuotaB(stima, percentualeRivalutazione);
    const mediaQuotaB =
      anniQuotaB > 0
        ? (finali.retribuzione1993 + finali.retribuzione1994 + finali.retribuzione1995) / 3
        : 0;

    const quotaACalcolata = this.calcolaQuotaA(retribuzioneFinale, anniQuotaA);
    const quotaBCalcolata = this.calcolaQuotaB(mediaQuotaB, anniQuotaB);

    const quotaAFinale =
      quoteMiste.quotaAManuale !== undefined
        ? this.soloPositivi(quoteMiste.quotaAManuale)
        : quotaACalcolata;
    const quotaBFinale =
      quoteMiste.quotaBManuale !== undefined
        ? this.soloPositivi(quoteMiste.quotaBManuale)
        : quotaBCalcolata;

    const quotaRetributivaBase = quotaAFinale + quotaBFinale;
    const metodoQuotaB = this.determinaMetodoQuotaB(quoteMiste, anniQuotaB);
    const affidabilitaQuotaB = this.determinaAffidabilitaQuotaB(quoteMiste, metodoQuotaB);

    return {
      quotaRetributivaBase,
      dettaglio: {
        anniQuotaA,
        anniQuotaB,
        aliquotaQuotaA: anniQuotaA * this.aliquotaRetributivaAnnuaMisto,
        aliquotaQuotaB: anniQuotaB * this.aliquotaRetributivaAnnuaMisto,
        retribuzionePensionabileFinale: this.arrotondaEuro(retribuzioneFinale),
        retribuzione1993Stimata: this.arrotondaEuro(stima.retribuzione1993),
        retribuzione1994Stimata: this.arrotondaEuro(stima.retribuzione1994),
        retribuzione1995Stimata: this.arrotondaEuro(stima.retribuzione1995),
        retribuzione1993Finale: this.arrotondaEuro(finali.retribuzione1993),
        retribuzione1994Finale: this.arrotondaEuro(finali.retribuzione1994),
        retribuzione1995Finale: this.arrotondaEuro(finali.retribuzione1995),
        mediaQuotaB: this.arrotondaEuro(mediaQuotaB),
        percentualeRivalutazioneQuotaB: percentualeRivalutazione,
        quotaAAnnua: this.arrotondaEuro(quotaAFinale),
        quotaBAnnua: this.arrotondaEuro(quotaBFinale),
        quotaCAnnua: 0,
        metodoQuotaB,
        affidabilitaQuotaB,
      },
    };
  }

  private componiDettaglioQuoteMiste(
    dettaglio: DettaglioQuoteMiste | undefined,
    scenario: PensioneNettaBaseInput['scenario'],
    quotaContributivaAnnua: number,
  ): DettaglioQuoteMiste | undefined {
    if (!dettaglio) return undefined;

    const isContributivoPuro = scenario === 'contributivo_puro';
    return {
      ...dettaglio,
      quotaAAnnua: isContributivoPuro ? 0 : dettaglio.quotaAAnnua,
      quotaBAnnua: isContributivoPuro ? 0 : dettaglio.quotaBAnnua,
      quotaCAnnua: this.arrotondaEuro(quotaContributivaAnnua),
    };
  }

  private haDatiPerStimaQuotaB(quoteMiste: QuoteMisteInput): boolean {
    return (
      this.soloPositivi(quoteMiste.imponibile1996) > 0 ||
      this.soloPositivi(quoteMiste.imponibile1993Manuale) > 0 ||
      this.soloPositivi(quoteMiste.imponibile1994Manuale) > 0 ||
      this.soloPositivi(quoteMiste.imponibile1995Manuale) > 0
    );
  }

  private stimaRetribuzioniPerQuotaB(quoteMiste: QuoteMisteInput): {
    retribuzione1993: number;
    retribuzione1994: number;
    retribuzione1995: number;
  } {
    const imponibileBase = this.soloPositivi(quoteMiste.imponibile1996);
    const annoBase = quoteMiste.annoImponibileBase ?? 1996;

    const stimaDaBase =
      imponibileBase > 0
        ? this.stimaRetribuzioniQuotaB(imponibileBase, annoBase)
        : { retribuzione1993: 0, retribuzione1994: 0, retribuzione1995: 0 };

    const valoreReale1993 = this.soloPositivi(quoteMiste.imponibile1993Manuale);
    const valoreReale1994 = this.soloPositivi(quoteMiste.imponibile1994Manuale);
    const valoreReale1995 = this.soloPositivi(quoteMiste.imponibile1995Manuale);

    return {
      retribuzione1993: valoreReale1993 > 0 ? valoreReale1993 : stimaDaBase.retribuzione1993,
      retribuzione1994: valoreReale1994 > 0 ? valoreReale1994 : stimaDaBase.retribuzione1994,
      retribuzione1995: valoreReale1995 > 0 ? valoreReale1995 : stimaDaBase.retribuzione1995,
    };
  }

  private applicaRivalutazioneQuotaB(
    nominali: { retribuzione1993: number; retribuzione1994: number; retribuzione1995: number },
    percentualeRivalutazione: number,
  ): { retribuzione1993: number; retribuzione1994: number; retribuzione1995: number } {
    const quota = Math.min(Math.max(percentualeRivalutazione, 0), 1);

    const rivaluta = (valore: number, anno: 1993 | 1994 | 1995) => {
      const coeff = this.coefficientiIstatFoi2023[anno];
      if (!coeff || coeff <= 0 || valore <= 0) return valore;
      const piena = valore * coeff;
      return valore + (piena - valore) * quota;
    };

    return {
      retribuzione1993: rivaluta(nominali.retribuzione1993, 1993),
      retribuzione1994: rivaluta(nominali.retribuzione1994, 1994),
      retribuzione1995: rivaluta(nominali.retribuzione1995, 1995),
    };
  }

  private proiettaRetribuzioneStorica(
    imponibileBase: number,
    coeffBase: number,
    anno: 1993 | 1994 | 1995,
  ): number {
    const coeffAnno = this.coefficientiIstatFoi2023[anno];
    if (!coeffAnno || coeffAnno <= 0 || !coeffBase || coeffBase <= 0) return 0;
    return (imponibileBase * coeffBase) / coeffAnno;
  }

  private determinaMetodoQuotaB(quoteMiste: QuoteMisteInput, anniQuotaB: number): MetodoQuotaB {
    if (anniQuotaB <= 0) return 'non_disponibile';
    if (quoteMiste.quotaBManuale !== undefined) return 'manuale';

    const haTuttiImponibiliReali =
      this.soloPositivi(quoteMiste.imponibile1993Manuale) > 0 &&
      this.soloPositivi(quoteMiste.imponibile1994Manuale) > 0 &&
      this.soloPositivi(quoteMiste.imponibile1995Manuale) > 0;
    if (haTuttiImponibiliReali) return 'imponibili_reali_1993_1995';

    if (this.soloPositivi(quoteMiste.imponibile1996) > 0) return 'stimata_da_1996';
    return 'non_disponibile';
  }

  private determinaAffidabilitaQuotaB(
    quoteMiste: QuoteMisteInput,
    metodo: MetodoQuotaB,
  ): AffidabilitaStima {
    if (metodo === 'manuale' || metodo === 'imponibili_reali_1993_1995') return 'alta';
    if (metodo === 'stimata_da_1996') {
      const annoBase = quoteMiste.annoImponibileBase ?? 1996;
      return annoBase === 1996 ? 'media' : 'bassa';
    }
    return 'bassa';
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

  private calcolaMontanteContributivoDaInput(input: PensioneNettaBaseInput): number {
    const contributiAnnuali = this.sanitizzaContributiAnnuali(input.contributiAnnuali);
    const contributiFuturi = this.sanitizzaContributiAnnuali(input.contributiFuturi);
    const annoCalcolo = input.annoCalcolo ?? this.annoFinaleContributivo(input);

    if (contributiAnnuali.length > 0) {
      return this.calcolaMontanteContributivoRivalutato(
        [...contributiAnnuali, ...contributiFuturi],
        annoCalcolo,
        input.tassiRivalutazioneManuali,
      );
    }

    return this.calcolaMontanteManualeConFuturi(
      this.soloPositivi(input.montanteContributivo),
      input.annoBaseMontante ?? this.ultimoAnnoRivalutazioneUfficiale,
      annoCalcolo,
      contributiFuturi,
      input.tassiRivalutazioneManuali,
    );
  }

  private calcolaMontanteManualeConFuturi(
    montanteBase: number,
    annoBase: number,
    annoCalcolo: number,
    contributiFuturi: ContributoAnnuale[],
    tassiRivalutazioneManuali: PensioneNettaBaseInput['tassiRivalutazioneManuali'],
  ): number {
    const contributiPerAnno = this.raggruppaContributiAnnuali(contributiFuturi);
    const anniFuturi = Object.keys(contributiPerAnno).map(Number);
    const ultimoAnno = Math.max(annoCalcolo, ...anniFuturi, annoBase);
    let montante = montanteBase;

    for (let anno = annoBase + 1; anno <= ultimoAnno; anno++) {
      montante =
        montante * this.coefficienteRivalutazioneDaUsare(anno, tassiRivalutazioneManuali) +
        (contributiPerAnno[anno] ?? 0);
    }

    return this.arrotondaEuro(montante);
  }

  private annoFinaleContributivo(input: PensioneNettaBaseInput): number {
    const anni = [
      ...(input.contributiAnnuali ?? []).map((contributo) => contributo.anno),
      ...(input.contributiFuturi ?? []).map((contributo) => contributo.anno),
      input.annoCalcolo,
      input.annoBaseMontante,
    ].filter((anno): anno is number => Number.isFinite(anno));

    return anni.length ? Math.max(...anni) : this.ultimoAnnoRivalutazioneUfficiale;
  }

  private coefficienteRivalutazioneDaUsare(
    anno: number,
    tassiRivalutazioneManuali: PensioneNettaBaseInput['tassiRivalutazioneManuali'] = [],
  ): number {
    const tassoManuale = tassiRivalutazioneManuali.find((tasso) => tasso.anno === anno);
    if (tassoManuale) {
      return 1 + this.soloPositivi(tassoManuale.tassoPercentuale) / 100;
    }

    return this.coefficientiRivalutazioneMontante[anno] ?? 1;
  }

  private raggruppaContributiAnnuali(
    contributiAnnuali: ContributoAnnuale[],
  ): Record<number, number> {
    return contributiAnnuali.reduce<Record<number, number>>((perAnno, contributo) => {
      perAnno[contributo.anno] = (perAnno[contributo.anno] ?? 0) + contributo.importo;
      return perAnno;
    }, {});
  }

  private sanitizzaContributiAnnuali(
    contributiAnnuali: ContributoAnnuale[] | null | undefined,
  ): ContributoAnnuale[] {
    return (contributiAnnuali ?? [])
      .map((contributo) => ({
        anno: Math.trunc(Number(contributo.anno)),
        importo: this.soloPositivi(contributo.importo),
      }))
      .filter((contributo) => Number.isFinite(contributo.anno) && contributo.importo > 0);
  }

  private etaAnniCompiuti(dataNascita: Date, dataRiferimento: Date): number {
    let eta = dataRiferimento.getFullYear() - dataNascita.getFullYear();
    const compleannoAnno = new Date(
      dataRiferimento.getFullYear(),
      dataNascita.getMonth(),
      dataNascita.getDate(),
    );

    if (dataRiferimento.getTime() < compleannoAnno.getTime()) {
      eta--;
    }

    return eta;
  }

  private creaCoefficientiTrasformazione(
    l335_1996_2009?: number,
    l247_2010_2012?: number,
    dm2012_2013_2015?: number,
    dm2015_2016_2018?: number,
    dm2018_2019_2020?: number,
    dm2020_2021_2022?: number,
    dm2022_2023_2024?: number,
    dm2024_dal_2025?: number,
  ) {
    const toFactor = (value: number | undefined) => (value === undefined ? undefined : value / 100);

    return {
      l335_1996_2009: toFactor(l335_1996_2009),
      l247_2010_2012: toFactor(l247_2010_2012),
      dm2012_2013_2015: toFactor(dm2012_2013_2015),
      dm2015_2016_2018: toFactor(dm2015_2016_2018),
      dm2018_2019_2020: toFactor(dm2018_2019_2020),
      dm2020_2021_2022: toFactor(dm2020_2021_2022),
      dm2022_2023_2024: toFactor(dm2022_2023_2024),
      dm2024_dal_2025: toFactor(dm2024_dal_2025),
    };
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
