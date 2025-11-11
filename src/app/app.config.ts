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
import { provideFirebaseApp } from '@angular/fire/app';
import { initializeApp } from 'firebase/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
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