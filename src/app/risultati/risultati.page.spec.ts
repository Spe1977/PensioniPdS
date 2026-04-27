import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { RisultatiPage } from './risultati.page';
import { SimulationStateService } from '../services/simulation-state.service';

registerLocaleData(localeIt, 'it-IT');

describe('RisultatiPage', () => {
  let component: RisultatiPage;
  let fixture: ComponentFixture<RisultatiPage>;
  let state: SimulationStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RisultatiPage],
      providers: [provideRouter([])],
    }).compileComponents();

    state = TestBed.inject(SimulationStateService);
    fixture = TestBed.createComponent(RisultatiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show no results when state is empty', () => {
    expect(component.hasRisultato()).toBe(false);
  });

  it('should format durata correctly', () => {
    expect(component.formatDurata({ anni: 2, mesi: 3, giorni: 0 })).toBe('2 anni e 3 mesi');
    expect(component.formatDurata({ anni: 1, mesi: 0, giorni: 0 })).toBe('1 anno');
    expect(component.formatDurata({ anni: 0, mesi: 1, giorni: 0 })).toBe('1 mese');
    expect(component.formatDurata(null)).toBe('-');
  });

  it('should format euro and scenario labels', () => {
    expect(component.formatEuro(1346.99)).toContain('€');
    expect(component.formatEuro(1346.99)).toContain('1346,99');
    expect(component.scenarioLabel('retributivo_pro_rata')).toBe('A - Retributivo pro-rata');
    expect(component.scenarioLabel('misto')).toBe('B - Misto');
    expect(component.scenarioLabel('contributivo_puro')).toBe('C - Contributivo puro');
  });

  it('should show results when state has data', () => {
    state.risultato.set({
      dataMaturazioneDiritto: new Date(2026, 0, 1),
      dataDecorrenza: new Date(2027, 3, 1),
      servizioEffettivo: { anni: 36, mesi: 0, giorni: 0 },
      maggiorazione: { anni: 5, mesi: 0, giorni: 0 },
      servizioUtile: { anni: 41, mesi: 0, giorni: 0 },
      requisitiApplicati: {
        tipo: 'anzianita',
        anno: 2026,
        anniRichiesti: 41,
        mesiExtra: 0,
        finestraMobileMesi: 15,
      },
      pensioneNetta: {
        scenario: 'misto',
        quotaRetributivaAnnua: 14250,
        quotaContributivaAnnua: 18290.09,
        seiScattiRetributiviAnnui: 5250,
        seiScattiMontanteFigurativo: 1732.5,
        moltiplicatoreMontante: 0,
        pensioneLordaAnnua: 32540.09,
        pensioneLordaMensile: 2503.08,
        irpefLordaAnnua: 7938.23,
        detrazioniAnnue: 1955,
        addizionaliAnnue: 823.26,
        impostaNettaAnnua: 6806.49,
        pensioneNettaAnnua: 25733.6,
        pensioneNettaMensile: 1979.51,
        noteBenefici: ['Pensione di anzianità a domanda: moltiplicatore non applicato.'],
      },
    });
    fixture.detectChanges();
    expect(component.hasRisultato()).toBe(true);
    expect(component.pensioneNetta()?.scenario).toBe('misto');
  });

  it('should expose eta requirement when result is eta + anzianita', () => {
    state.risultato.set({
      dataMaturazioneDiritto: new Date(2027, 1, 1),
      dataDecorrenza: new Date(2028, 1, 1),
      servizioEffettivo: { anni: 30, mesi: 0, giorni: 0 },
      maggiorazione: { anni: 5, mesi: 0, giorni: 0 },
      servizioUtile: { anni: 35, mesi: 0, giorni: 0 },
      requisitiApplicati: {
        tipo: 'eta_anzianita',
        anno: 2027,
        anniRichiesti: 35,
        mesiExtra: 0,
        etaAnniRichiesti: 58,
        etaMesiExtra: 1,
        finestraMobileMesi: 12,
      },
    });
    fixture.detectChanges();
    expect(component.formatDurata(component.etaRichiesta())).toBe('58 anni e 1 mese');
  });

  it('should expose eta requirement when result is limiti eta', () => {
    state.risultato.set({
      dataMaturazioneDiritto: new Date(2027, 1, 1),
      dataDecorrenza: new Date(2028, 1, 1),
      servizioEffettivo: { anni: 27, mesi: 1, giorni: 0 },
      maggiorazione: { anni: 5, mesi: 0, giorni: 0 },
      servizioUtile: { anni: 32, mesi: 1, giorni: 0 },
      requisitiApplicati: {
        tipo: 'limiti_eta',
        anno: 2027,
        anniRichiesti: 35,
        mesiExtra: 0,
        etaAnniRichiesti: 60,
        etaMesiExtra: 1,
        limiteOrdinamentale: 60,
        servizioMinimoAnni: 20,
        finestraMobileMesi: 12,
      },
    });
    fixture.detectChanges();
    expect(component.formatDurata(component.etaRichiesta())).toBe('60 anni e 1 mese');
  });
});
