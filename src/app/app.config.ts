import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { provideNativeDateAdapter } from '@angular/material/core';
// import { provideNgxSpinner } from 'ngx-spinner';

import { routes } from './app.routes';
import { CompanyContextInterceptor } from './core/interceptors/company-context.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    provideNativeDateAdapter(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    // Configurar interceptor de contexto de compañía
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CompanyContextInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    // provideNgxSpinner({
    //   type: 'ball-scale-multiple'
    // })
  ]
};