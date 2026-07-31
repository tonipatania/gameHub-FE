# GameHub — Frontend

Angular frontend for **GameHub**, a social network for video games, backed by the Spring Boot
API in [`../LSMSD-Project`](../LSMSD-Project) (MongoDB + Neo4j).

## Stack

- Angular 22 (standalone components, SSR via `@angular/ssr`)
- TailwindCSS
- RxJS

## Features

- **Auth**: login and signup
- **Home**: review feed, recommended games, people to follow
- **Game catalog**: paginated browsing with search by name/genre
- **Game detail**: info, reviews, likes, writing reviews, wishlist toggle
- **Wishlist**: add/remove games to play
- **Community**: follow users, discover suggested friends (Neo4j-backed)
- **Profile / Settings**: public wishlist, username editing

## Prerequisites

1. The Spring Boot backend running on `http://localhost:8080` (see
   [`../LSMSD-Project`](../LSMSD-Project) for setup and database dumps).
2. MongoDB and Neo4j configured and populated as described there.

## Running

```bash
npm install
npm start
```

The app is available at `http://localhost:4200`. API calls go through the dev proxy
(`proxy.conf.json`), which forwards `/api/*` to `http://localhost:8080`.

## Test credentials

Use a user from the MongoDB dump, e.g.:

- Username: `Lunark`
- Password: `jrmag6azycv`

## Production build

```bash
npm run build
```

## Structure

```
src/app/
├── core/           # models, API services, guards, interceptors, i18n
├── shared/         # reusable components
└── features/       # pages: auth, home, games, wishlist, friends, profile, settings
```
