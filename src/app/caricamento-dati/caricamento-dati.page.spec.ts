import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaricamentoDatiPage } from './caricamento-dati.page';
import { provideRouter } from '@angular/router';
import { SimulationStateService } from '../services/simulation-state.service';

describe('CaricamentoDatiPage', () => {
  let component: CaricamentoDatiPage;
  let fixture: ComponentFixture<CaricamentoDatiPage>;
  let state: SimulationStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaricamentoDatiPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CaricamentoDatiPage);
    component = fixture.componentInstance;
    state = TestBed.inject(SimulationStateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form but valid (files are optional for UI test logic if not strictly required initially)', () => {
    expect(component.filesForm).toBeDefined();
    // Default form validity could be true since fields might not have Validators.required at the top level
    // depending on the exact logic (here they don't have required validators initially in the group)
    expect(component.filesForm.valid).toBeTruthy();
  });

  it('should add a new contributo futuro', () => {
    const initialLength = component.contributiFuturi.length;
    component.aggiungiContributoFuturo();
    expect(component.contributiFuturi.length).toBe(initialLength + 1);
  });

  it('should remove a contributo futuro', () => {
    component.aggiungiContributoFuturo();
    component.aggiungiContributoFuturo();
    const lengthAfterAdd = component.contributiFuturi.length;

    component.rimuoviContributoFuturo(0);
    expect(component.contributiFuturi.length).toBe(lengthAfterAdd - 1);
  });

  it('should validate contributo futuro fields correctly', () => {
    component.aggiungiContributoFuturo();
    const formGroup = component.contributiFuturi.at(0);

    // Initially invalid because empty
    expect(formGroup.valid).toBeFalsy();

    // Set valid values
    formGroup.patchValue({
      anno: 2026,
      importo: 5000,
      tassoRivalutazione: 1.05,
    });
    expect(formGroup.valid).toBeTruthy();

    // Test invalid year
    formGroup.patchValue({ anno: 1900 }); // min is 2020
    expect(formGroup.valid).toBeFalsy();
  });

  it('should update file name when a file is selected', () => {
    const mockFile = new File([''], 'test-inps.pdf', { type: 'application/pdf' });
    const event = {
      target: { files: [mockFile] },
    } as unknown as Event;

    component.onFileSelected(event, 'inps');
    expect(component.fileNames.inps).toBe('test-inps.pdf');
    expect(component.filesForm.get('inpsFile')?.value).toBe(mockFile);
  });

  it('should calculate anzianita result with net pension estimate from manual data', () => {
    state.dataNascita.set('1970-01-01');
    state.dataAssunzione.set('1990-01-01');
    state.tipoSimulazione.set('anzianita');
    component.filesForm.patchValue({
      scenarioPensione: 'contributivo_puro',
      montanteContributivo: 400000,
      coefficienteTrasformazione: 5.2,
      ultimoImponibileAnnuo: 35000,
    });

    component.onCalcola();

    const risultato = state.risultato();
    expect(risultato).toBeTruthy();
    expect(risultato?.requisitiApplicati.tipo).toBe('anzianita');
    expect(risultato?.pensioneNetta?.scenario).toBe('contributivo_puro');
    expect(risultato?.pensioneNetta?.pensioneNettaMensile).toBeGreaterThan(0);
  });

  it('should calculate eta + anzianita result from shared state', () => {
    state.dataNascita.set('1968-01-01');
    state.dataAssunzione.set('1996-01-01');
    state.tipoSimulazione.set('eta_anzianita');

    component.onCalcola();

    const risultato = state.risultato();
    expect(risultato).toBeTruthy();
    expect(risultato?.requisitiApplicati.tipo).toBe('eta_anzianita');
    expect(risultato?.requisitiApplicati.anniRichiesti).toBe(35);
    expect(risultato?.requisitiApplicati.etaAnniRichiesti).toBe(58);
    expect(risultato?.requisitiApplicati.finestraMobileMesi).toBe(12);
  });

  it('should preserve date-only input days when calculating shared-state dates', () => {
    state.dataNascita.set('1968-01-31');
    state.dataAssunzione.set('1996-01-31');
    state.tipoSimulazione.set('eta_anzianita');

    component.onCalcola();

    const risultato = state.risultato();
    expect(risultato?.dataMaturazioneDiritto.getFullYear()).toBe(2026);
    expect(risultato?.dataMaturazioneDiritto.getMonth()).toBe(0);
    expect(risultato?.dataMaturazioneDiritto.getDate()).toBe(31);
  });

  it('should calculate limiti eta result from shared state', () => {
    state.dataNascita.set('1966-01-01');
    state.dataAssunzione.set('1996-01-01');
    state.tipoSimulazione.set('limiti_eta');
    state.limiteOrdinamentale.set(60);

    component.onCalcola();

    const risultato = state.risultato();
    expect(risultato).toBeTruthy();
    expect(risultato?.requisitiApplicati.tipo).toBe('limiti_eta');
    expect(risultato?.requisitiApplicati.limiteOrdinamentale).toBe(60);
    expect(risultato?.requisitiApplicati.etaAnniRichiesti).toBe(60);
    expect(risultato?.requisitiApplicati.finestraMobileMesi).toBe(12);
  });
});
