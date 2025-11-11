import { ApplicationConfig } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { provideNativeDateAdapter } from '@angular/material/core';
// import { provideNgxSpinner } from 'ngx-spinner';

import { routes } from './app.routes';
import { CompanyContextInterceptor } from './core/interceptors/company-context.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AppRouteReuseStrategy } from './core/route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideNativeDateAdapter(),
    AppRouteReuseStrategy,
    {
      provide: RouteReuseStrategy,
      useExisting: AppRouteReuseStrategy
    },
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