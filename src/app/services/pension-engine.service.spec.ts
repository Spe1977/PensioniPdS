import { TestBed } from '@angular/core/testing';
import { PensionEngineService } from './pension-engine.service';

describe('PensionEngineService', () => {
  let service: PensionEngineService;

  const dataIso = (data: Date) =>
    `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
      data.getDate(),
    ).padStart(2, '0')}`;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PensionEngineService);
  });

  it('dovrebbe essere creato', () => {
    expect(service).toBeTruthy();
  });

  // ── Test: getRequisitiAnzianita ──

  describe('getRequisitiAnzianita', () => {
    it('dovrebbe restituire 41 anni senza mesi extra per il 2026', () => {
      const req = service.getRequisitiAnzianita(2026);
      expect(req.anniRichiesti).toBe(41);
      expect(req.mesiExtra).toBe(0);
      expect(req.finestraMobileMesi).toBe(15);
    });

    it('dovrebbe restituire 41 anni e 1 mese per il 2027', () => {
      const req = service.getRequisitiAnzianita(2027);
      expect(req.anniRichiesti).toBe(41);
      expect(req.mesiExtra).toBe(1);
      expect(req.finestraMobileMesi).toBe(15);
    });

    it('dovrebbe restituire 41 anni e 3 mesi per il 2028', () => {
      const req = service.getRequisitiAnzianita(2028);
      expect(req.anniRichiesti).toBe(41);
      expect(req.mesiExtra).toBe(3);
      expect(req.finestraMobileMesi).toBe(15);
    });

    it('dovrebbe usare i parametri 2028 per anni successivi al 2028', () => {
      const req2029 = service.getRequisitiAnzianita(2029);
      expect(req2029.mesiExtra).toBe(3); // Usa parametri 2028

      const req2035 = service.getRequisitiAnzianita(2035);
      expect(req2035.mesiExtra).toBe(3); // Idem
    });

    it('dovrebbe restituire 41 anni senza mesi extra per anni <= 2026', () => {
      const req = service.getRequisitiAnzianita(2024);
      expect(req.anniRichiesti).toBe(41);
      expect(req.mesiExtra).toBe(0);
    });
  });

  // ── Test: getRequisitiEtaAnzianita ──

  describe('getRequisitiEtaAnzianita', () => {
    it('dovrebbe restituire 58 anni e 35 anni utili senza mesi extra per il 2026', () => {
      const req = service.getRequisitiEtaAnzianita(2026);
      expect(req.tipo).toBe('eta_anzianita');
      expect(req.etaAnniRichiesti).toBe(58);
      expect(req.etaMesiExtra).toBe(0);
      expect(req.anniRichiesti).toBe(35);
      expect(req.mesiExtra).toBe(0);
      expect(req.finestraMobileMesi).toBe(12);
    });

    it('dovrebbe applicare +1 mese sul requisito anagrafico nel 2027', () => {
      const req = service.getRequisitiEtaAnzianita(2027);
      expect(req.etaAnniRichiesti).toBe(58);
      expect(req.etaMesiExtra).toBe(1);
      expect(req.anniRichiesti).toBe(35);
      expect(req.finestraMobileMesi).toBe(12);
    });

    it('dovrebbe applicare +3 mesi sul requisito anagrafico nel 2028', () => {
      const req = service.getRequisitiEtaAnzianita(2028);
      expect(req.etaAnniRichiesti).toBe(58);
      expect(req.etaMesiExtra).toBe(3);
      expect(req.anniRichiesti).toBe(35);
      expect(req.finestraMobileMesi).toBe(12);
    });

    it('dovrebbe usare i parametri 2028 per anni successivi al 2028', () => {
      const req = service.getRequisitiEtaAnzianita(2030);
      expect(req.etaMesiExtra).toBe(3);
      expect(req.anniRichiesti).toBe(35);
    });
  });

  // ── Test: getRequisitiLimitiEta ──

  describe('getRequisitiLimitiEta', () => {
    it('dovrebbe restituire limite ordinamentale, soglia 35 anni e finestra di 12 mesi', () => {
      const req = service.getRequisitiLimitiEta(2026, 60, false);

      expect(req.tipo).toBe('limiti_eta');
      expect(req.etaAnniRichiesti).toBe(60);
      expect(req.etaMesiExtra).toBe(0);
      expect(req.limiteOrdinamentale).toBe(60);
      expect(req.anniRichiesti).toBe(35);
      expect(req.servizioMinimoAnni).toBe(20);
      expect(req.finestraMobileMesi).toBe(12);
    });

    it('dovrebbe applicare +1 mese nel 2027 solo quando serve adeguamento', () => {
      const req = service.getRequisitiLimitiEta(2027, 63, true);

      expect(req.etaAnniRichiesti).toBe(63);
      expect(req.etaMesiExtra).toBe(1);
    });

    it('dovrebbe applicare +3 mesi nel 2028 e anni successivi quando serve adeguamento', () => {
      expect(service.getRequisitiLimitiEta(2028, 65, true).etaMesiExtra).toBe(3);
      expect(service.getRequisitiLimitiEta(2030, 65, true).etaMesiExtra).toBe(3);
    });
  });

  describe('coefficienti capitoli 8 e 9 penps.md', () => {
    it('espone i coefficienti ufficiali di rivalutazione del montante 1996-2025', () => {
      expect(service.getCoefficienteRivalutazioneMontante(1996)).toBe(1.062608);
      expect(service.getCoefficienteRivalutazioneMontante(2011)).toBe(1.016165);
      expect(service.getCoefficienteRivalutazioneMontante(2014)).toBe(1);
      expect(service.getCoefficienteRivalutazioneMontante(2016)).toBe(1.004684);
      expect(service.getCoefficienteRivalutazioneMontante(2017)).toBe(1.005205);
      expect(service.getCoefficienteRivalutazioneMontante(2021)).toBe(1);
      expect(service.getCoefficienteRivalutazioneMontante(2022)).toBe(1.009756);
      expect(service.getCoefficienteRivalutazioneMontante(2023)).toBe(1.023082);
      expect(service.getCoefficienteRivalutazioneMontante(2025)).toBe(1.040445);
    });

    it('calcola il montante contributivo con capitalizzazione composta annuale', () => {
      const montante = service.calcolaMontanteContributivoRivalutato(
        [
          { anno: 2022, importo: 10000 },
          { anno: 2023, importo: 10000 },
          { anno: 2024, importo: 10000 },
          { anno: 2025, importo: 10000 },
        ],
        2025,
      );

      expect(montante).toBe(42224.36);
    });

    it('seleziona i coefficienti di trasformazione per età e anno di decorrenza', () => {
      expect(service.getCoefficienteTrasformazione(60, 2025)).toBeCloseTo(0.04536, 5);
      expect(service.getCoefficienteTrasformazione(65, 2024)).toBeCloseTo(0.05352, 5);
      expect(service.getCoefficienteTrasformazione(71, 2022)).toBeCloseTo(0.06466, 5);
      expect(service.getCoefficienteTrasformazione(66, 2009)).toBeUndefined();
    });
  });

  // ── Test: calcolaMaggiorazione ──

  describe('calcolaMaggiorazione', () => {
    it('dovrebbe calcolare 1/5 del servizio effettivo', () => {
      // 20 anni effettivi → 4 anni di maggiorazione
      const assunzione = new Date(2000, 0, 1);
      const rif = new Date(2020, 0, 1);
      const magg = service.calcolaMaggiorazione(assunzione, rif);
      expect(magg.anni).toBe(4);
      expect(magg.mesi).toBe(0);
    });

    it('dovrebbe applicare il cap di 5 anni', () => {
      // 30 anni effettivi → 6 anni di maggiorazione, ma cap a 5
      const assunzione = new Date(1990, 0, 1);
      const rif = new Date(2020, 0, 1);
      const magg = service.calcolaMaggiorazione(assunzione, rif);
      expect(magg.anni).toBe(5);
      expect(magg.mesi).toBe(0);
    });

    it('dovrebbe calcolare la maggiorazione per servizio breve', () => {
      // 10 anni effettivi → 2 anni di maggiorazione
      const assunzione = new Date(2010, 0, 1);
      const rif = new Date(2020, 0, 1);
      const magg = service.calcolaMaggiorazione(assunzione, rif);
      expect(magg.anni).toBe(2);
      expect(magg.mesi).toBe(0);
    });
  });

  // ── Test: calcolaServizioUtile ──

  describe('calcolaServizioUtile', () => {
    it('dovrebbe calcolare servizio effettivo + maggiorazione', () => {
      // 20 anni effettivi + 4 anni magg = 24 anni utili
      const assunzione = new Date(2000, 0, 1);
      const rif = new Date(2020, 0, 1);
      const { servizioEffettivo, maggiorazione, servizioUtile } = service.calcolaServizioUtile(
        assunzione,
        rif,
      );

      expect(servizioEffettivo.anni).toBe(20);
      expect(maggiorazione.anni).toBe(4);
      expect(servizioUtile.anni).toBe(24);
    });

    it('dovrebbe rispettare il cap di 5 anni nella somma', () => {
      // 36 anni effettivi → magg cap 5 → 41 utili
      const assunzione = new Date(1990, 0, 1);
      const rif = new Date(2026, 0, 1);
      const { servizioEffettivo, maggiorazione, servizioUtile } = service.calcolaServizioUtile(
        assunzione,
        rif,
      );

      expect(servizioEffettivo.anni).toBe(36);
      expect(maggiorazione.anni).toBe(5);
      expect(servizioUtile.anni).toBe(41);
    });
  });

  // ── Test: calcolaDataPensionamento ──

  describe('calcolaDataPensionamento', () => {
    it('caso ordinario pre-2026: assunzione 01/01/1990, dovrebbe maturare con 41 anni utili', () => {
      const nascita = new Date(1970, 0, 1);
      const assunzione = new Date(1990, 0, 1);
      const result = service.calcolaDataPensionamento(nascita, assunzione);

      // 36 anni effettivi → max 5 anni magg → 41 utili
      // Servizio effettivo necessario: ~34.17 anni (410 mesi)
      // Assunzione 01/1990 + ~410 mesi = ~03/2024
      // Il servizio utile deve essere >= 41 anni (492 mesi)
      expect(result.servizioUtile.anni).toBeGreaterThanOrEqual(41);
      expect(result.requisitiApplicati.finestraMobileMesi).toBe(15);
      expect(result.avviso).toBeUndefined();

      // La data di decorrenza deve essere 15 mesi dopo la maturazione
      const diffMesi = service.diffInMesi(result.dataMaturazioneDiritto, result.dataDecorrenza);
      expect(diffMesi).toBe(15);
    });

    it('maturazione nel 2027: requisito 41 anni e 1 mese', () => {
      // Assunzione che produce maturazione nel 2027
      // Per maturare nel 2027 con 41 anni + 1 mese utili:
      // Servizio effettivo ~34.25 anni → assunzione ~07/1992
      const nascita = new Date(1972, 0, 1);
      const assunzione = new Date(1992, 6, 1); // Luglio 1992
      const result = service.calcolaDataPensionamento(nascita, assunzione);

      // Verifica che i mesi extra siano applicati
      if (result.dataMaturazioneDiritto.getFullYear() === 2027) {
        expect(result.requisitiApplicati.mesiExtra).toBe(1);
      }
      expect(result.servizioUtile.anni * 12 + result.servizioUtile.mesi).toBeGreaterThanOrEqual(
        41 * 12 + result.requisitiApplicati.mesiExtra,
      );
    });

    it('maturazione nel 2028: requisito 41 anni e 3 mesi', () => {
      const nascita = new Date(1973, 0, 1);
      const assunzione = new Date(1993, 6, 1);
      const result = service.calcolaDataPensionamento(nascita, assunzione);

      if (result.dataMaturazioneDiritto.getFullYear() === 2028) {
        expect(result.requisitiApplicati.mesiExtra).toBe(3);
      }
      expect(result.servizioUtile.anni * 12 + result.servizioUtile.mesi).toBeGreaterThanOrEqual(
        41 * 12 + result.requisitiApplicati.mesiExtra,
      );
    });

    it('applica esattamente la tabella 2028: 41 anni e 3 mesi utili + 15 mesi', () => {
      const result = service.calcolaDataPensionamento(new Date(1972, 0, 1), new Date(1992, 0, 1));

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2028-04-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2029-07-01');
      expect(result.requisitiApplicati.mesiExtra).toBe(3);
      expect(result.requisitiApplicati.finestraMobileMesi).toBe(15);
      expect(result.servizioUtile).toEqual({ anni: 41, mesi: 3, giorni: 0 });
    });

    it('maturazione post-2028: dovrebbe usare parametri 2028 e mostrare avviso', () => {
      const nascita = new Date(1978, 0, 1);
      const assunzione = new Date(1998, 0, 1); // Assunzione recente → maturazione lontana
      const result = service.calcolaDataPensionamento(nascita, assunzione);

      if (result.dataMaturazioneDiritto.getFullYear() > 2028) {
        expect(result.avviso).toBeDefined();
        expect(result.avviso).toContain('2028');
        expect(result.avviso).toContain('DPCM attuativi');
        expect(result.requisitiApplicati.mesiExtra).toBe(3);
      }
    });

    it('la finestra mobile deve essere sempre di 15 mesi', () => {
      const nascita = new Date(1965, 0, 1);
      const assunzione = new Date(1985, 0, 1);
      const result = service.calcolaDataPensionamento(nascita, assunzione);

      const diffMesi = service.diffInMesi(result.dataMaturazioneDiritto, result.dataDecorrenza);
      expect(diffMesi).toBe(15);
    });

    it('il servizio utile deve includere la maggiorazione 1/5', () => {
      const nascita = new Date(1970, 0, 1);
      const assunzione = new Date(1990, 0, 1);
      const result = service.calcolaDataPensionamento(nascita, assunzione);

      // La maggiorazione deve essere > 0
      const mesiMagg = result.maggiorazione.anni * 12 + result.maggiorazione.mesi;
      expect(mesiMagg).toBeGreaterThan(0);

      // Il servizio utile deve essere > servizio effettivo
      const mesiEff = result.servizioEffettivo.anni * 12 + result.servizioEffettivo.mesi;
      const mesiUtili = result.servizioUtile.anni * 12 + result.servizioUtile.mesi;
      expect(mesiUtili).toBe(mesiEff + mesiMagg);
    });
  });

  // ── Test: calcolaDataPensionamentoEtaAnzianita ──

  describe('calcolaDataPensionamentoEtaAnzianita', () => {
    it('matura nel 2026 con 58 anni, 35 anni utili e finestra mobile di 12 mesi', () => {
      const result = service.calcolaDataPensionamentoEtaAnzianita(
        new Date(1968, 0, 1),
        new Date(1996, 0, 1),
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2026-01-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2027-01-01');
      expect(result.requisitiApplicati.tipo).toBe('eta_anzianita');
      expect(result.requisitiApplicati.etaAnniRichiesti).toBe(58);
      expect(result.requisitiApplicati.etaMesiExtra).toBe(0);
      expect(result.requisitiApplicati.anniRichiesti).toBe(35);
      expect(result.requisitiApplicati.finestraMobileMesi).toBe(12);
      expect(result.servizioEffettivo).toEqual({ anni: 30, mesi: 0, giorni: 0 });
      expect(result.maggiorazione).toEqual({ anni: 5, mesi: 0, giorni: 0 });
      expect(result.servizioUtile).toEqual({ anni: 35, mesi: 0, giorni: 0 });
      expect(result.avviso).toBeUndefined();
    });

    it('usa la data in cui si perfeziona anche il servizio utile se l’età è già maturata', () => {
      const result = service.calcolaDataPensionamentoEtaAnzianita(
        new Date(1960, 0, 1),
        new Date(1996, 0, 1),
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2026-01-01');
      expect(result.servizioUtile.anni * 12 + result.servizioUtile.mesi).toBe(35 * 12);
    });

    it('usa la data in cui si perfeziona anche l’età se il servizio utile è già maturato', () => {
      const result = service.calcolaDataPensionamentoEtaAnzianita(
        new Date(1968, 5, 1),
        new Date(1990, 0, 1),
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2026-06-01');
      expect(result.requisitiApplicati.etaMesiExtra).toBe(0);
      expect(result.servizioUtile.anni * 12 + result.servizioUtile.mesi).toBeGreaterThanOrEqual(
        35 * 12,
      );
    });

    it('maturazione nel 2027: requisito 58 anni e 1 mese + 35 anni utili', () => {
      const result = service.calcolaDataPensionamentoEtaAnzianita(
        new Date(1969, 0, 1),
        new Date(1997, 1, 1),
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2027-02-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2028-02-01');
      expect(result.requisitiApplicati.etaMesiExtra).toBe(1);
      expect(result.servizioUtile.anni).toBe(35);
    });

    it('maturazione nel 2028: requisito 58 anni e 3 mesi + 35 anni utili', () => {
      const result = service.calcolaDataPensionamentoEtaAnzianita(
        new Date(1970, 0, 1),
        new Date(1998, 3, 1),
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2028-04-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2029-04-01');
      expect(result.requisitiApplicati.etaMesiExtra).toBe(3);
      expect(result.servizioUtile.anni).toBe(35);
    });

    it('maturazione post-2028: usa parametri 2028 e mostra avviso', () => {
      const result = service.calcolaDataPensionamentoEtaAnzianita(
        new Date(1972, 0, 1),
        new Date(2002, 3, 1),
      );

      expect(result.dataMaturazioneDiritto.getFullYear()).toBeGreaterThan(2028);
      expect(result.requisitiApplicati.etaMesiExtra).toBe(3);
      expect(result.requisitiApplicati.finestraMobileMesi).toBe(12);
      expect(result.avviso).toContain('2028');
      expect(result.avviso).toContain('DPCM attuativi');
    });
  });

  // ── Test: calcolaDataPensionamentoLimitiEta ──

  describe('calcolaDataPensionamentoLimitiEta', () => {
    it('matura al limite di 60 anni senza speranza di vita se ha già 35 anni utili', () => {
      const result = service.calcolaDataPensionamentoLimitiEta(
        new Date(1966, 0, 1),
        new Date(1996, 0, 1),
        60,
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2026-02-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2027-01-01');
      expect(result.requisitiApplicati.tipo).toBe('limiti_eta');
      expect(result.requisitiApplicati.limiteOrdinamentale).toBe(60);
      expect(result.requisitiApplicati.etaAnniRichiesti).toBe(60);
      expect(result.requisitiApplicati.etaMesiExtra).toBe(0);
      expect(result.requisitiApplicati.finestraMobileMesi).toBe(12);
      expect(result.servizioUtile).toEqual({ anni: 36, mesi: 0, giorni: 0 });
      expect(result.avviso).toBeUndefined();
    });

    it('applica +1 mese al limite ordinamentale nel 2027 se non ha 35 anni utili', () => {
      const result = service.calcolaDataPensionamentoLimitiEta(
        new Date(1967, 0, 1),
        new Date(2000, 0, 1),
        60,
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2027-03-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2028-03-01');
      expect(result.requisitiApplicati.etaMesiExtra).toBe(1);
      expect(result.servizioUtile.anni).toBeLessThan(35);
    });

    it('applica +3 mesi al limite ordinamentale nel 2028 se non ha 35 anni utili', () => {
      const result = service.calcolaDataPensionamentoLimitiEta(
        new Date(1968, 0, 1),
        new Date(2001, 0, 1),
        60,
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2028-05-01');
      expect(dataIso(result.dataDecorrenza)).toBe('2029-05-01');
      expect(result.requisitiApplicati.etaMesiExtra).toBe(3);
    });

    it('gestisce anche i limiti ordinamentali di 63 e 65 anni', () => {
      const limite63 = service.calcolaDataPensionamentoLimitiEta(
        new Date(1964, 0, 1),
        new Date(1997, 0, 1),
        63,
      );
      const limite65 = service.calcolaDataPensionamentoLimitiEta(
        new Date(1962, 0, 1),
        new Date(1997, 0, 1),
        65,
      );

      expect(dataIso(limite63.dataMaturazioneDiritto)).toBe('2027-02-01');
      expect(limite63.requisitiApplicati.etaMesiExtra).toBe(0);
      expect(limite63.requisitiApplicati.limiteOrdinamentale).toBe(63);
      expect(dataIso(limite65.dataMaturazioneDiritto)).toBe('2027-02-01');
      expect(limite65.requisitiApplicati.limiteOrdinamentale).toBe(65);
    });

    it('post-2028 usa i parametri 2028 e mostra avviso', () => {
      const result = service.calcolaDataPensionamentoLimitiEta(
        new Date(1970, 0, 1),
        new Date(2005, 0, 1),
        60,
      );

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2030-05-01');
      expect(result.requisitiApplicati.etaMesiExtra).toBe(3);
      expect(result.avviso).toContain('2028');
    });

    it('rispetta almeno 20 anni di servizio utile nei casi di assunzione tardiva', () => {
      const result = service.calcolaDataPensionamentoLimitiEta(
        new Date(1966, 0, 1),
        new Date(2012, 0, 1),
        60,
      );
      const mesiUtili = result.servizioUtile.anni * 12 + result.servizioUtile.mesi;

      expect(dataIso(result.dataMaturazioneDiritto)).toBe('2028-09-01');
      expect(mesiUtili).toBeGreaterThanOrEqual(20 * 12);
    });
  });

  // ── Test: calcolaPensioneNettaAnzianita ──

  describe('calcolaPensioneNettaAnzianita', () => {
    it('calcola lo scenario A retributivo pro-rata senza moltiplicatore', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'retributivo_pro_rata',
        quotaRetributivaAnnua: 22000,
        montanteContributivo: 220000,
        coefficienteTrasformazione: 5.2,
        ultimoImponibileAnnuo: 40000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
      });

      expect(result.scenario).toBe('retributivo_pro_rata');
      expect(result.quotaRetributivaAnnua).toBe(28000);
      expect(result.quotaContributivaAnnua).toBe(11542.96);
      expect(result.seiScattiRetributiviAnnui).toBe(6000);
      expect(result.seiScattiMontanteFigurativo).toBe(1980);
      expect(result.moltiplicatoreMontante).toBe(0);
      expect(result.pensioneLordaAnnua).toBe(39542.96);
      expect(result.pensioneNettaMensile).toBeCloseTo(2202, 2);
      expect(result.noteBenefici.join(' ')).toContain('moltiplicatore non applicato');
    });

    it('calcola lo scenario B misto con quota retributiva e contributiva', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        quotaRetributivaAnnua: 9000,
        montanteContributivo: 350000,
        coefficienteTrasformazione: 0.052,
        ultimoImponibileAnnuo: 35000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
      });

      expect(result.scenario).toBe('misto');
      expect(result.quotaRetributivaAnnua).toBe(14250);
      expect(result.quotaContributivaAnnua).toBe(18290.09);
      expect(result.pensioneLordaAnnua).toBe(32540.09);
      expect(result.irpefLordaAnnua).toBe(7938.23);
      expect(result.pensioneNettaMensile).toBeCloseTo(1871.86, 2);
    });

    it('calcola lo scenario C contributivo puro ignorando quote retributive manuali', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'contributivo_puro',
        quotaRetributivaAnnua: 99999,
        montanteContributivo: 400000,
        coefficienteTrasformazione: 5.2,
        ultimoImponibileAnnuo: 35000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
      });

      expect(result.scenario).toBe('contributivo_puro');
      expect(result.quotaRetributivaAnnua).toBe(0);
      expect(result.seiScattiRetributiviAnnui).toBe(0);
      expect(result.seiScattiMontanteFigurativo).toBe(1732.5);
      expect(result.quotaContributivaAnnua).toBe(20890.09);
      expect(result.pensioneNettaMensile).toBeCloseTo(1285.73, 2);
    });

    it('applica gli scaglioni IRPEF 2026 al lordo annuo', () => {
      expect(service.calcolaIrpefLorda(28000)).toBe(6440);
      expect(service.calcolaIrpefLorda(50000)).toBe(13700);
      expect(service.calcolaIrpefLorda(60000)).toBe(18000);
    });

    it('calcola correttamente le detrazioni da reddito da pensione', () => {
      // <= 8500
      expect(service.calcolaDetrazioniPensione(8000)).toBe(1955);

      // 8501 - 28000 (Formula: 700 + 1255 * (28000 - reddito) / 19500)
      expect(service.calcolaDetrazioniPensione(15000)).toBe(1536.67);

      // 25001 - 28000 (con bonus +50)
      expect(service.calcolaDetrazioniPensione(26000)).toBe(878.72);

      // 28001 - 29000 (Formula: 700 * (50000 - reddito) / 22000 + 50)
      expect(service.calcolaDetrazioniPensione(28500)).toBe(734.09);

      // 29001 - 50000 (Formula: 700 * (50000 - reddito) / 22000)
      expect(service.calcolaDetrazioniPensione(35000)).toBe(477.27);

      // > 50000
      expect(service.calcolaDetrazioniPensione(55000)).toBe(0);
    });
  });

  // ── Test: calcolaPensioneNettaEtaAnzianita ──

  describe('calcolaPensioneNettaEtaAnzianita', () => {
    it('calcola lo scenario A retributivo pro-rata senza moltiplicatore', () => {
      const result = service.calcolaPensioneNettaEtaAnzianita({
        scenario: 'retributivo_pro_rata',
        quotaRetributivaAnnua: 22000,
        montanteContributivo: 220000,
        coefficienteTrasformazione: 5.2,
        ultimoImponibileAnnuo: 40000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
      });

      expect(result.scenario).toBe('retributivo_pro_rata');
      expect(result.quotaRetributivaAnnua).toBe(28000);
      expect(result.quotaContributivaAnnua).toBe(11542.96);
      expect(result.seiScattiRetributiviAnnui).toBe(6000);
      expect(result.seiScattiMontanteFigurativo).toBe(1980);
      expect(result.moltiplicatoreMontante).toBe(0);
      expect(result.pensioneLordaAnnua).toBe(39542.96);
      expect(result.pensioneNettaMensile).toBeCloseTo(2202, 2);
      expect(result.noteBenefici.join(' ')).toContain(
        'età+anzianità a domanda: moltiplicatore non applicato',
      );
    });

    it('calcola lo scenario B misto con quota retributiva e contributiva', () => {
      const result = service.calcolaPensioneNettaEtaAnzianita({
        scenario: 'misto',
        quotaRetributivaAnnua: 9000,
        montanteContributivo: 350000,
        coefficienteTrasformazione: 0.052,
        ultimoImponibileAnnuo: 35000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
      });

      expect(result.scenario).toBe('misto');
      expect(result.pensioneNettaMensile).toBeCloseTo(1871.86, 2);
    });

    it('calcola lo scenario C contributivo puro ignorando quote retributive manuali', () => {
      const result = service.calcolaPensioneNettaEtaAnzianita({
        scenario: 'contributivo_puro',
        quotaRetributivaAnnua: 99999,
        montanteContributivo: 400000,
        coefficienteTrasformazione: 5.2,
        ultimoImponibileAnnuo: 35000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
      });

      expect(result.scenario).toBe('contributivo_puro');
      expect(result.pensioneNettaMensile).toBeCloseTo(1285.73, 2);
    });
  });

  // ── Test: calcolaPensioneNettaLimitiEta ──

  describe('calcolaPensioneNettaLimitiEta', () => {
    it('calcola lo scenario A retributivo pro-rata con moltiplicatore', () => {
      const result = service.calcolaPensioneNettaLimitiEta({
        scenario: 'retributivo_pro_rata',
        quotaRetributivaAnnua: 22000,
        montanteContributivo: 220000,
        coefficienteTrasformazione: 5.2,
        ultimoImponibileAnnuo: 40000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
        applicaMoltiplicatore: true,
      });

      expect(result.scenario).toBe('retributivo_pro_rata');
      expect(result.quotaRetributivaAnnua).toBe(28000);
      expect(result.seiScattiMontanteFigurativo).toBe(1980);
      expect(result.moltiplicatoreMontante).toBe(66000);
      expect(result.quotaContributivaAnnua).toBeCloseTo(14974.96, 2);
      expect(result.pensioneLordaAnnua).toBeCloseTo(42974.96, 2);
      expect(result.noteBenefici[0]).toContain(
        'moltiplicatore applicato in misura piena sul montante',
      );
    });

    it('calcola lo scenario B misto con quota retributiva e contributiva e moltiplicatore', () => {
      const result = service.calcolaPensioneNettaLimitiEta({
        scenario: 'misto',
        quotaRetributivaAnnua: 9000,
        montanteContributivo: 350000,
        coefficienteTrasformazione: 0.052,
        ultimoImponibileAnnuo: 35000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
        applicaMoltiplicatore: true,
      });

      expect(result.scenario).toBe('misto');
      expect(result.seiScattiMontanteFigurativo).toBe(1732.5);
      expect(result.moltiplicatoreMontante).toBe(57750);
      expect(result.quotaContributivaAnnua).toBeCloseTo(21293.09, 2);
      expect(result.quotaRetributivaAnnua).toBe(14250);
      expect(result.pensioneLordaAnnua).toBeCloseTo(35543.09, 2);
    });

    it('calcola lo scenario C contributivo puro ignorando quote retributive e applicando moltiplicatore', () => {
      const result = service.calcolaPensioneNettaLimitiEta({
        scenario: 'contributivo_puro',
        quotaRetributivaAnnua: 99999,
        montanteContributivo: 400000,
        coefficienteTrasformazione: 5.2,
        ultimoImponibileAnnuo: 35000,
        detrazioniAnnue: 1955,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
        applicaMoltiplicatore: true,
      });

      expect(result.scenario).toBe('contributivo_puro');
      expect(result.quotaRetributivaAnnua).toBe(0);
      expect(result.seiScattiMontanteFigurativo).toBe(1732.5);
      expect(result.moltiplicatoreMontante).toBe(57750);
      expect(result.quotaContributivaAnnua).toBeCloseTo(23893.09, 2);
      expect(result.pensioneLordaAnnua).toBeCloseTo(23893.09, 2);
    });

    it('calcola lo scenario con moltiplicatore e sei scatti esclusi manualmente', () => {
      const result = service.calcolaPensioneNettaLimitiEta({
        scenario: 'misto',
        quotaRetributivaAnnua: 10000,
        montanteContributivo: 300000,
        coefficienteTrasformazione: 4.5,
        ultimoImponibileAnnuo: 30000,
        applicaMoltiplicatore: false,
        applicaSeiScatti: false,
      });

      expect(result.quotaRetributivaAnnua).toBe(10000);
      expect(result.moltiplicatoreMontante).toBe(0);
      expect(result.seiScattiMontanteFigurativo).toBe(0);
      expect(result.quotaContributivaAnnua).toBeCloseTo(13500, 2);
      expect(result.noteBenefici[0]).toContain('moltiplicatore escluso su scelta manuale');
      expect(result.noteBenefici[2]).toContain('Sei scatti esclusi su scelta manuale');
    });
  });

  // ── Test: sistema misto Polizia di Stato (Quote A/B/C) ──

  describe('sistema misto Polizia di Stato', () => {
    it('espone i coefficienti ISTAT FOI(nt) 2023 per gli anni di Quota B', () => {
      expect(service.getCoefficienteIstatFoi2023(1993)).toBe(1.911);
      expect(service.getCoefficienteIstatFoi2023(1994)).toBe(1.839);
      expect(service.getCoefficienteIstatFoi2023(1995)).toBe(1.745);
      expect(service.getCoefficienteIstatFoi2023(1996)).toBe(1.68);
      expect(service.getCoefficienteIstatFoi2023(2023)).toBe(1);
    });

    it('calcola la Quota A: retribuzione finale × anni × 2,44%', () => {
      // Spec §5.4: 44.917,49 × 3 × 2,44% = 3.287,96
      const quotaA = service.calcolaQuotaA(44917.49, 3);
      expect(quotaA).toBeCloseTo(3287.96, 2);
    });

    it('stima le retribuzioni 1993-1995 a partire dall’imponibile 1996', () => {
      // Spec §7.4: 20.000 nel 1996 → 17.582,42 / 18.270,80 / 19.255,01
      const stima = service.stimaRetribuzioniQuotaB(20000, 1996);
      expect(stima.retribuzione1993).toBeCloseTo(17582.42, 2);
      expect(stima.retribuzione1994).toBeCloseTo(18270.8, 2);
      expect(stima.retribuzione1995).toBeCloseTo(19255.01, 2);
    });

    it('calcola la Quota B con media nominale e aliquota 2,44%', () => {
      // Spec §8.5: media 18.369,41 × 3 × 2,44% = 1.344,64
      const mediaB = (17582.42 + 18270.8 + 19255.01) / 3;
      const quotaB = service.calcolaQuotaB(mediaB, 3);
      expect(quotaB).toBeCloseTo(1344.64, 2);
    });

    it('integra Quota A + B nel calcolo netto con scenario misto e rivalutazione 0% di default', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        montanteContributivo: 350000,
        coefficienteTrasformazione: 0.052,
        ultimoImponibileAnnuo: 35000,
        addizionaleRegionalePercentuale: 1.73,
        addizionaleComunalePercentuale: 0.8,
        applicaSeiScatti: false,
        quoteMiste: {
          retribuzionePensionabileFinale: 44917.49,
          anniQuotaA: 3,
          anniQuotaB: 3,
          imponibile1996: 20000,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(dettaglio.quotaAAnnua).toBeCloseTo(3287.96, 2);
      expect(dettaglio.quotaBAnnua).toBeCloseTo(1344.64, 2);
      expect(dettaglio.percentualeRivalutazioneQuotaB).toBe(0);
      expect(dettaglio.metodoQuotaB).toBe('stimata_da_1996');
      expect(dettaglio.affidabilitaQuotaB).toBe('media');
      // La quotaRetributivaAnnua nel result include anche i sei scatti retributivi
      expect(result.quotaRetributivaAnnua).toBeCloseTo(3287.96 + 1344.64, 2);
    });

    it('applica la rivalutazione ISTAT al 100% sulla Quota B se richiesto', () => {
      // Spec §8.6: con rivalutazione piena MediaB ≈ 33.600 → QuotaB ≈ 2.459,52
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        ultimoImponibileAnnuo: 35000,
        applicaSeiScatti: false,
        quoteMiste: {
          retribuzionePensionabileFinale: 44917.49,
          anniQuotaA: 0,
          anniQuotaB: 3,
          imponibile1996: 20000,
          percentualeRivalutazioneQuotaB: 1,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(dettaglio.quotaBAnnua).toBeCloseTo(2459.52, 0);
    });

    it('preferisce gli imponibili reali 1993-1995 quando forniti (modalità esperto)', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        ultimoImponibileAnnuo: 35000,
        applicaSeiScatti: false,
        quoteMiste: {
          retribuzionePensionabileFinale: 0,
          anniQuotaA: 0,
          anniQuotaB: 3,
          imponibile1993Manuale: 18000,
          imponibile1994Manuale: 19000,
          imponibile1995Manuale: 20000,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(dettaglio.metodoQuotaB).toBe('imponibili_reali_1993_1995');
      expect(dettaglio.affidabilitaQuotaB).toBe('alta');
      expect(dettaglio.mediaQuotaB).toBeCloseTo((18000 + 19000 + 20000) / 3, 2);
    });

    it('usa la quota B manuale quando fornita', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        ultimoImponibileAnnuo: 35000,
        applicaSeiScatti: false,
        quoteMiste: {
          anniQuotaB: 3,
          quotaBManuale: 1500,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(dettaglio.metodoQuotaB).toBe('manuale');
      expect(dettaglio.quotaBAnnua).toBe(1500);
    });

    it('azzera Quote A e B nello scenario contributivo puro mantenendo Quota C', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'contributivo_puro',
        montanteContributivo: 400000,
        coefficienteTrasformazione: 0.052,
        ultimoImponibileAnnuo: 35000,
        applicaSeiScatti: false,
        quoteMiste: {
          retribuzionePensionabileFinale: 44917.49,
          anniQuotaA: 3,
          anniQuotaB: 3,
          imponibile1996: 20000,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(dettaglio.quotaAAnnua).toBe(0);
      expect(dettaglio.quotaBAnnua).toBe(0);
      expect(dettaglio.quotaCAnnua).toBeGreaterThan(0);
      expect(result.quotaRetributivaAnnua).toBe(0);
    });

    it('mantiene la retro-compatibilità: senza quoteMiste usa quotaRetributivaAnnua manuale', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        quotaRetributivaAnnua: 9000,
        montanteContributivo: 350000,
        coefficienteTrasformazione: 0.052,
        ultimoImponibileAnnuo: 35000,
        applicaSeiScatti: true,
      });

      expect(result.dettaglioQuoteMiste).toBeUndefined();
      expect(result.quotaRetributivaAnnua).toBe(14250); // 9000 + 5250 sei scatti
    });

    it('rapporta i sei scatti retributivi al 2,44% × anni quando il dettaglio è presente', () => {
      // Spec §10.2: ultimoImponibileAnnuo 40.000, anni ante-1996 totali 6
      // → seiScattiBase 6.000, effetto retributivo 6.000 × 6 × 2,44% = 878,40
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        ultimoImponibileAnnuo: 40000,
        coefficienteTrasformazione: 0.052,
        applicaSeiScatti: true,
        quoteMiste: {
          retribuzionePensionabileFinale: 44917.49,
          anniQuotaA: 3,
          anniQuotaB: 3,
          imponibile1996: 20000,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(result.seiScattiRetributiviAnnui).toBeCloseTo(878.4, 2);
      expect(dettaglio.effettoSeiScattiQuotaA).toBeCloseTo(439.2, 2);
      expect(dettaglio.effettoSeiScattiQuotaB).toBeCloseTo(439.2, 2);
      // effettoC = seiScattiBase × 33% × coeff = 6.000 × 0,33 × 0,052 = 102,96
      expect(dettaglio.effettoSeiScattiQuotaC).toBeCloseTo(102.96, 2);
    });

    it('azzera l’effetto sei scatti su Quota A/B se applicaSeiScatti è false', () => {
      const result = service.calcolaPensioneNettaAnzianita({
        scenario: 'misto',
        ultimoImponibileAnnuo: 40000,
        applicaSeiScatti: false,
        quoteMiste: {
          retribuzionePensionabileFinale: 44917.49,
          anniQuotaA: 3,
          anniQuotaB: 3,
          imponibile1996: 20000,
        },
      });

      const dettaglio = result.dettaglioQuoteMiste!;
      expect(result.seiScattiRetributiviAnnui).toBe(0);
      expect(dettaglio.effettoSeiScattiQuotaA).toBe(0);
      expect(dettaglio.effettoSeiScattiQuotaB).toBe(0);
      expect(dettaglio.effettoSeiScattiQuotaC).toBe(0);
    });
  });

  // ── Test: IRPEF per anno ──

  describe('IRPEF per anno di calcolo', () => {
    it('applica gli scaglioni 2024/2025 (35% sul secondo scaglione) per annoCalcolo < 2026', () => {
      // 35.000 → 28.000×23% + 7.000×35% = 6.440 + 2.450 = 8.890
      expect(service.calcolaIrpefLorda(35000, 2024)).toBe(8890);
      expect(service.calcolaIrpefLorda(35000, 2025)).toBe(8890);
    });

    it('applica gli scaglioni 2026 (33% sul secondo scaglione) per annoCalcolo >= 2026', () => {
      // 35.000 → 28.000×23% + 7.000×33% = 6.440 + 2.310 = 8.750
      expect(service.calcolaIrpefLorda(35000, 2026)).toBe(8750);
      expect(service.calcolaIrpefLorda(35000, 2030)).toBe(8750);
    });
  });

  // ── Test: utility ──

  describe('Utility', () => {
    it('diffInMesi dovrebbe calcolare la differenza corretta', () => {
      const da = new Date(2020, 0, 1);
      const a = new Date(2022, 6, 1);
      expect(service.diffInMesi(da, a)).toBe(30);
    });

    it('diffInMesi dovrebbe contare solo i mesi completati rispettando il giorno', () => {
      expect(service.diffInMesi(new Date(2020, 0, 31), new Date(2020, 1, 27))).toBe(0);
      expect(service.diffInMesi(new Date(2020, 0, 31), new Date(2020, 1, 29))).toBe(1);
      expect(service.diffInMesi(new Date(2021, 0, 15), new Date(2021, 1, 14))).toBe(0);
    });

    it('aggiungiMesi dovrebbe aggiungere mesi correttamente', () => {
      const data = new Date(2020, 0, 1);
      const risultato = service.aggiungiMesi(data, 15);
      expect(risultato.getFullYear()).toBe(2021);
      expect(risultato.getMonth()).toBe(3); // Aprile (0-indexed)
    });

    it('aggiungiMesi dovrebbe preservare il giorno o usare il fine mese valido', () => {
      expect(dataIso(service.aggiungiMesi(new Date(2020, 0, 31), 1))).toBe('2020-02-29');
      expect(dataIso(service.aggiungiMesi(new Date(2021, 0, 31), 1))).toBe('2021-02-28');
      expect(dataIso(service.aggiungiMesi(new Date(2021, 0, 31), 2))).toBe('2021-03-31');
    });
  });
});
