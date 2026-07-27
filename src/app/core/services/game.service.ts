import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Game,
  GameNeo4j,
  GameSearchFilter,
  Page,
} from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);

  getAll(page = 0, size = 24): Observable<Page<Game>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<Game>>(`${environment.apiUrl}/game/getAll`, {
      params,
    });
  }

  searchFilter(filter: GameSearchFilter, page = 0, size = 24): Observable<Page<Game>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (filter.name) params = params.set('name', filter.name);
    if (filter.genres?.length) {
      for (const genre of filter.genres) params = params.append('genres', genre);
    }
    if (filter.avgScore != null) params = params.set('avgScore', filter.avgScore.toString());

    return this.http.get<Page<Game>>(`${environment.apiUrl}/game/searchFilter`, { params });
  }

  getGenres(): Observable<string[]> {
    return this.http
      .get<string[] | string>(`${environment.apiUrl}/game/genres`)
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }

  suggestGames(username: string): Observable<GameNeo4j[]> {
    return this.http
      .get<GameNeo4j[] | string>(
        `${environment.apiUrl}/game/suggestGames/${encodeURIComponent(username)}`,
      )
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }
}
