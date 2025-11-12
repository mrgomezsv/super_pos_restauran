import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

console.info('[SuperPOS] Bootstrapping Angular application...');

bootstrapApplication(AppComponent, appConfig)
  .then(() => console.info('[SuperPOS] Angular application bootstrapped'))
  .catch((err) => console.error('[SuperPOS] Bootstrap error:', err));
