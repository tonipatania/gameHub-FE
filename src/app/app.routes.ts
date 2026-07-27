import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/signup/signup.component').then((m) => m.SignupComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'games',
    loadComponent: () =>
      import('./features/games/games-list/games-list.component').then(
        (m) => m.GamesComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'games/:name',
    loadComponent: () =>
      import('./features/games/game-detail/game-detail.component').then(
        (m) => m.GameDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./features/wishlist/wishlist.component').then((m) => m.WishlistComponent),
    canActivate: [authGuard],
  },
  {
    path: 'friends',
    loadComponent: () =>
      import('./features/friends/friends.component').then((m) => m.FriendsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile/:username',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'home' },
];
