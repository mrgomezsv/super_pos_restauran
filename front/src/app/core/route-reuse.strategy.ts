import { Injectable, isDevMode } from '@angular/core';
import {
  RouteReuseStrategy,
  DetachedRouteHandle,
  ActivatedRouteSnapshot
} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AppRouteReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();
  private readonly excludedRoutes = new Set<string>(['login']);

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getRouteKey(route);
    const should = !!key && !this.excludedRoutes.has(key);
    this.log('shouldDetach', key, should);
    return should;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = this.getRouteKey(route);
    if (!key || !handle) {
      return;
    }
    this.storedRoutes.set(key, handle);
    this.log('store', key, true);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getRouteKey(route);
    const should = !!key && this.storedRoutes.has(key);
    this.log('shouldAttach', key, should);
    return should;
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    if (!key) {
      return null;
    }
    const handle = this.storedRoutes.get(key) ?? null;
    this.log('retrieve', key, !!handle);
    return handle;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (!future.routeConfig || !curr.routeConfig) {
      return false;
    }
    return future.routeConfig === curr.routeConfig;
  }

  clearStoredRoutes(): void {
    this.storedRoutes.forEach(handle => {
      if (typeof (handle as any)?.componentRef?.destroy === 'function') {
        (handle as any).componentRef.destroy();
      }
    });
    this.storedRoutes.clear();
    this.log('clearStoredRoutes', null, true);
  }

  removeStoredRoute(path: string): void {
    const handle = this.storedRoutes.get(path);
    if (handle && typeof (handle as any)?.componentRef?.destroy === 'function') {
      (handle as any).componentRef.destroy();
    }
    this.storedRoutes.delete(path);
    this.log('removeStoredRoute', path, true);
  }

  private getRouteKey(route: ActivatedRouteSnapshot): string | null {
    const path = route.routeConfig?.path;
    if (!path) {
      return null;
    }
    return path;
  }

  private log(action: string, key: string | null, result: boolean): void {
    if (!isDevMode()) {
      return;
    }
    console.debug(`[RouteReuse:${action}]`, { key, result, cachedRoutes: Array.from(this.storedRoutes.keys()) });
  }
}

