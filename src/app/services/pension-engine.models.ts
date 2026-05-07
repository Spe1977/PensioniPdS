/** Modelli per il motore di calcolo pensionistico. */

/** Rappresentazione di una durata in anni, mesi e giorni */
export interface Durata {
  anni: number;
  mesi: number;
  giorni: number;
}

/** Tipo di simulazione selezionabile */
export type TipoSimulazione = 'anzianita' | 'eta_anzianita' | 'limiti_eta';

/** Scenario di calcolo della quota pensionistica */
export type ScenarioCalcoloPensione = 'retributivo_pro_rata' | 'misto' | 'contributivo_puro';

/** Contributo annuo già espresso come montante contributivo, non come retribuzione lorda */
export interface ContributoAnnuale {
  anno: number;
  importo: number;
}

/** Coefficiente ipotetico da usare quando manca il dato ufficiale di rivalutazione */
export interface TassoRivalutazioneManuale {
  anno: number;
  tassoPercentuale: number;
}

/** Dati comuni necessari al calcolo netto della pensione */
export interface PensioneNettaBaseInput {
  scenario: ScenarioCalcoloPensione;
  quotaRetributivaAnnua?: number;
  montanteContributivo?: number;
  annoBaseMontante?: number;
  annoCalcolo?: number;
  contributiAnnuali?: ContributoAnnuale[];
  contributiFuturi?: ContributoAnnuale[];
  tassiRivalutazioneManuali?: TassoRivalutazioneManuale[];
  coefficienteTrasformazione?: number;
  ultimoImponibileAnnuo: number;
  detrazioniAnnue?: number;
  addizionaleRegionalePercentuale?: number;
  addizionaleComunalePercentuale?: number;
  carichiFamiliariDetrazioniAnnue?: number;
  applicaSeiScatti?: boolean;
  /** Dati per il calcolo dettagliato delle Quote A/B nel sistema misto */
  quoteMiste?: QuoteMisteInput;
}

/**
 * Dati di input opzionali per il calcolo separato delle Quote A e B
 * del sistema misto (retributivo art. 54 DPR 1092/1973, aliquota 2,44% annua).
 *
 * Se forniti, sostituiscono il valore manuale di `quotaRetributivaAnnua`
 * con la somma calcolata Quota A + Quota B.
 */
export interface QuoteMisteInput {
  /**
   * Retribuzione pensionabile finale stimata (base della Quota A).
   * Tipicamente ricavata da ultima busta paga o CU.
   */
  retribuzionePensionabileFinale?: number;
  /** Anni utili maturati fino al 31/12/1992 (Quota A). */
  anniQuotaA?: number;
  /** Anni utili maturati dal 01/01/1993 al 31/12/1995 (Quota B). */
  anniQuotaB?: number;
  /**
   * Imponibile pensionabile 1996 usato come base per la stima
   * delle retribuzioni storiche 1993-1995 tramite coefficienti ISTAT FOI.
   */
  imponibile1996?: number;
  /** Anno di riferimento dell'imponibile fornito (default 1996). */
  annoImponibileBase?: number;
  /** Retribuzione pensionabile reale 1993 (modalità esperto). */
  imponibile1993Manuale?: number;
  /** Retribuzione pensionabile reale 1994 (modalità esperto). */
  imponibile1994Manuale?: number;
  /** Retribuzione pensionabile reale 1995 (modalità esperto). */
  imponibile1995Manuale?: number;
  /**
   * Percentuale di rivalutazione ISTAT applicata alla Quota B (0..1).
   * Default 0 = nessuna rivalutazione (criterio prudenziale).
   */
  percentualeRivalutazioneQuotaB?: number;
  /** Quota A annua già calcolata, prevale sul calcolo automatico. */
  quotaAManuale?: number;
  /** Quota B annua già calcolata, prevale sul calcolo automatico. */
  quotaBManuale?: number;
}

/** Dati manuali necessari al calcolo netto della pensione di anzianità */
export interface PensioneNettaAnzianitaInput extends PensioneNettaBaseInput {}

/** Dati manuali necessari al calcolo netto della pensione con requisito età + anzianità */
export interface PensioneNettaEtaAnzianitaInput extends PensioneNettaBaseInput {}

/** Dati manuali necessari al calcolo netto della pensione per limiti di età */
export interface PensioneNettaLimitiEtaInput extends PensioneNettaBaseInput {
  applicaMoltiplicatore?: boolean;
}

/** Risultato del calcolo lordo/netto per la pensione */
export interface PensioneNettaResult {
  scenario: ScenarioCalcoloPensione;
  montanteContributivoBase?: number;
  montanteContributivoFinale?: number;
  coefficienteTrasformazione?: number;
  quotaRetributivaAnnua: number;
  quotaContributivaAnnua: number;
  seiScattiRetributiviAnnui: number;
  seiScattiMontanteFigurativo: number;
  moltiplicatoreMontante: number;
  pensioneLordaAnnua: number;
  pensioneLordaMensile: number;
  irpefLordaAnnua: number;
  detrazioniAnnue: number;
  addizionaliAnnue: number;
  impostaNettaAnnua: number;
  pensioneNettaAnnua: number;
  pensioneNettaMensile: number;
  noteBenefici: string[];
  /** Dettaglio del calcolo Quote A/B/C quando disponibile */
  dettaglioQuoteMiste?: DettaglioQuoteMiste;
}

/**
 * Provenienza della Quota B usata nel calcolo.
 *
 * - `manuale`: l'utente ha fornito direttamente l'importo annuo;
 * - `imponibili_reali_1993_1995`: calcolata da retribuzioni storiche reali;
 * - `stimata_da_1996`: ricostruita dall'imponibile 1996 con coefficienti ISTAT;
 * - `non_disponibile`: dati insufficienti, Quota B non determinata.
 */
export type MetodoQuotaB =
  | 'manuale'
  | 'imponibili_reali_1993_1995'
  | 'stimata_da_1996'
  | 'non_disponibile';

/** Livello di affidabilità della stima della Quota B */
export type AffidabilitaStima = 'alta' | 'media' | 'bassa';

/**
 * Dettaglio del calcolo separato delle quote retributive (A, B) e contributiva (C)
 * del sistema misto per la Polizia di Stato.
 */
export interface DettaglioQuoteMiste {
  anniQuotaA: number;
  anniQuotaB: number;
  aliquotaQuotaA: number;
  aliquotaQuotaB: number;
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
  metodoQuotaB: MetodoQuotaB;
  affidabilitaQuotaB: AffidabilitaStima;
}

/** Requisiti normativi applicati a una simulazione pensionistica */
export interface RequisitiAnzianita {
  /** Scenario di calcolo */
  tipo: TipoSimulazione;
  /** Anno di riferimento della normativa */
  anno: number;
  /** Anni di servizio utile richiesti */
  anniRichiesti: number;
  /** Mesi aggiuntivi sul servizio utile richiesto */
  mesiExtra: number;
  /** Età anagrafica richiesta, quando prevista */
  etaAnniRichiesti?: number;
  /** Mesi aggiuntivi sull'età per adeguamento speranza di vita */
  etaMesiExtra?: number;
  /** Limite ordinamentale selezionato per qualifica */
  limiteOrdinamentale?: number;
  /** Servizio utile minimo per pensione di vecchiaia ordinamentale */
  servizioMinimoAnni?: number;
  /** Durata della finestra mobile in mesi */
  finestraMobileMesi: number;
}

/** Risultato completo del calcolo pensionistico */
export interface PensionResult {
  /** Data in cui si maturano i requisiti */
  dataMaturazioneDiritto: Date;
  /** Data di effettiva decorrenza della pensione (dopo finestra mobile) */
  dataDecorrenza: Date;
  /** Dettaglio del servizio effettivo alla data di maturazione */
  servizioEffettivo: Durata;
  /** Dettaglio della maggiorazione 1/5 applicata */
  maggiorazione: Durata;
  /** Servizio utile totale (effettivo + maggiorazione) */
  servizioUtile: Durata;
  /** Requisiti normativi applicati al calcolo */
  requisitiApplicati: RequisitiAnzianita;
  /** Calcolo dell'importo netto quando disponibile */
  pensioneNetta?: PensioneNettaResult;
  /** Avviso per periodi post-2028 senza DPCM attuativi */
  avviso?: string;
}
