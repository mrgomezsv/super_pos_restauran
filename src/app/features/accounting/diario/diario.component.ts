import { Component } from '@angular/core';

@Component({
  selector: 'app-accounting-diario',
  standalone: true,
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Libro Diario</h1>
        <p class="subtitle">Vista preliminar. Pronto: filtros por fecha, origen y exportación.</p>
      </header>
      <div class="page-content">
        <p>Diseño inicial del Libro Diario. Aquí mostraremos pólizas y partidas.</p>
      </div>
    </section>
  `
})
export class AccountingDiarioComponent {}


