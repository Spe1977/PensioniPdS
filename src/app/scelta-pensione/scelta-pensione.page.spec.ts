import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SceltaPensionePage } from './scelta-pensione.page';
import { provideRouter } from '@angular/router';

describe('SceltaPensionePage', () => {
  let component: SceltaPensionePage;
  let fixture: ComponentFixture<SceltaPensionePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceltaPensionePage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SceltaPensionePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an invalid form initially', () => {
    expect(component.sceltaForm.valid).toBeFalsy();
  });

  it('should make form valid when type is anzianita', () => {
    component.sceltaForm.controls['tipoSimulazione'].setValue('anzianita');
    expect(component.sceltaForm.valid).toBeTruthy();
  });

  it('should make form valid when type is eta_anzianita', () => {
    component.sceltaForm.controls['tipoSimulazione'].setValue('eta_anzianita');
    expect(component.sceltaForm.valid).toBeTruthy();
  });

  it('should require limiteOrdinamentale when type is limiti_eta', () => {
    component.sceltaForm.controls['tipoSimulazione'].setValue('limiti_eta');
    expect(component.sceltaForm.valid).toBeFalsy();

    component.sceltaForm.controls['limiteOrdinamentale'].setValue('60');
    expect(component.sceltaForm.valid).toBeTruthy();
  });

  it('should clear limiteOrdinamentale validator when switching away from limiti_eta', () => {
    component.sceltaForm.controls['tipoSimulazione'].setValue('limiti_eta');
    component.sceltaForm.controls['limiteOrdinamentale'].setValue('60');
    expect(component.sceltaForm.valid).toBeTruthy();

    component.sceltaForm.controls['tipoSimulazione'].setValue('anzianita');
    expect(component.sceltaForm.controls['limiteOrdinamentale'].value).toBe('');
    expect(component.sceltaForm.valid).toBeTruthy();
  });
});
