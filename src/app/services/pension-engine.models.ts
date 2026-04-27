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

/** Dati manuali necessari al calcolo netto della pensione di anzianità */
export interface PensioneNettaAnzianitaInput {
  scenario: ScenarioCalcoloPensione;
  quotaRetributivaAnnua?: number;
  montanteContributivo?: number;
  coefficienteTrasformazione?: number;
  ultimoImponibileAnnuo: number;
  detrazioniAnnue?: number;
  addizionaleRegionalePercentuale?: number;
  addizionaleComunalePercentuale?: number;
  carichiFamiliariDetrazioniAnnue?: number;
  applicaSeiScatti?: boolean;
}

/** Dati manuali necessari al calcolo netto della pensione con requisito età + anzianità */
export interface PensioneNettaEtaAnzianitaInput {
  scenario: ScenarioCalcoloPensione;
  quotaRetributivaAnnua?: number;
  montanteContributivo?: number;
  coefficienteTrasformazione?: number;
  ultimoImponibileAnnuo: number;
  detrazioniAnnue?: number;
  addizionaleRegionalePercentuale?: number;
  addizionaleComunalePercentuale?: number;
  carichiFamiliariDetrazioniAnnue?: number;
  applicaSeiScatti?: boolean;
}

/** Dati manuali necessari al calcolo netto della pensione per limiti di età */
export interface PensioneNettaLimitiEtaInput {
  scenario: ScenarioCalcoloPensione;
  quotaRetributivaAnnua?: number;
  montanteContributivo?: number;
  coefficienteTrasformazione?: number;
  ultimoImponibileAnnuo: number;
  detrazioniAnnue?: number;
  addizionaleRegionalePercentuale?: number;
  addizionaleComunalePercentuale?: number;
  carichiFamiliariDetrazioniAnnue?: number;
  applicaSeiScatti?: boolean;
  applicaMoltiplicatore?: boolean;
}

/** Risultato del calcolo lordo/netto per la pensione */
export interface PensioneNettaResult {
  scenario: ScenarioCalcoloPensione;
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
