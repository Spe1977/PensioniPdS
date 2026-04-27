import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home.page';
import { SimulationStateService } from '../services/simulation-state.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let state: SimulationStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();

    state = TestBed.inject(SimulationStateService);
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form correctly', () => {
    expect(component.homeForm.contains('dataNascita')).toBeTruthy();
    expect(component.homeForm.contains('dataAssunzione')).toBeTruthy();
  });

  it('should mark form as invalid when empty', () => {
    expect(component.homeForm.valid).toBeFalsy();
  });

  it('should save data to state on onAvanti when form is valid', () => {
    component.homeForm.patchValue({
      dataNascita: '1980-01-01',
      dataAssunzione: '2000-01-01',
    });
    component.onAvanti();
    expect(state.dataNascita()).toBe('1980-01-01');
    expect(state.dataAssunzione()).toBe('2000-01-01');
  });

  it('should clear form and state when onCancella is called', () => {
    component.homeForm.patchValue({
      dataNascita: '1980-01-01',
      dataAssunzione: '2000-01-01',
    });
    expect(component.homeForm.valid).toBeTruthy();

    component.onCancella();

    expect(component.homeForm.value.dataNascita).toBe('');
    expect(component.homeForm.value.dataAssunzione).toBe('');
    expect(component.homeForm.valid).toBeFalsy();
    expect(state.dataNascita()).toBe('');
    expect(state.dataAssunzione()).toBe('');
  });
});
