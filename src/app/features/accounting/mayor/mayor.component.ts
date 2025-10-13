import { Component } from '@angular/core';

@Component({
  selector: 'app-accounting-mayor',
  standalone: true,
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Libro Mayor</h1>
        <p class="subtitle">Saldos acumulados por cuenta. Pronto: filtros y exportación.</p>
      </header>
      <div class="page-content">
        <p>Diseño inicial del Libro Mayor. Aquí mostraremos saldos por cuenta.</p>
      </div>
    </section>
  `
})
export class AccountingMayorComponent {}


