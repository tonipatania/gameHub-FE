import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'games/:name',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile/:username',
    renderMode: RenderMode.Client,
  },
  {
    path: 'home',
    renderMode: RenderMode.Client,
  },
  {
    path: 'games',
    renderMode: RenderMode.Client,
  },
  {
    path: 'wishlist',
    renderMode: RenderMode.Client,
  },
  {
    path: 'friends',
    renderMode: RenderMode.Client,
  },
  {
    // come le altre pagine autenticate: prerenderizzata finirebbe dietro l'authGuard lato server,
    // dove non c'e' sessione, e un ricaricamento porterebbe sempre al login
    path: 'settings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'signup',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
