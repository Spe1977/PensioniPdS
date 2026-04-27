import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'scelta-pensione',
    loadComponent: () =>
      import('./scelta-pensione/scelta-pensione.page').then((m) => m.SceltaPensionePage),
  },
  {
    path: 'caricamento-dati',
    loadComponent: () =>
      import('./caricamento-dati/caricamento-dati.page').then((m) => m.CaricamentoDatiPage),
  },
  {
    path: 'risultati',
    loadComponent: () => import('./risultati/risultati.page').then((m) => m.RisultatiPage),
  },
];
