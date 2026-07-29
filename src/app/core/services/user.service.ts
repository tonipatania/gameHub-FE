import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Game, Page } from '../models/game.model';
import { SuggestedUser, UserNeo4j } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUser(username: string): Observable<UserNeo4j | null> {
    const params = new HttpParams().set('username', username);
    return this.http
      .get<UserNeo4j | string>(`${environment.apiUrl}/user/getUser`, { params })
      .pipe(
        map((result) =>
          typeof result === 'object' && result !== null && 'username' in result
            ? result
            : null,
        ),
      );
  }

  getWishlist(username: string, friendUsername = ''): Observable<Game[]> {
    let params = new HttpParams().set('username', username);
    if (friendUsername) {
      params = params.set('friendUsername', friendUsername);
    }
    return this.http
      .get<Game[] | string>(
        `${environment.apiUrl}/user/userSelected/wishlist`,
        { params },
      )
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }

  addToWishlist(username: string, gameName: string): Observable<string> {
    const params = new HttpParams().set('username', username).set('name', gameName);
    return this.http.post(
      `${environment.apiUrl}/user/wishlist/addWishlistGame`,
      null,
      { params, responseType: 'text' },
    );
  }

  removeFromWishlist(username: string, gameName: string): Observable<string> {
    const params = new HttpParams().set('username', username).set('name', gameName);
    return this.http.post(
      `${environment.apiUrl}/user/wishlist/deleteWishlistGame`,
      null,
      { params, responseType: 'text' },
    );
  }

  getFollowedUsers(username: string): Observable<UserNeo4j[]> {
    const params = new HttpParams().set('username', username);
    return this.http
      .get<UserNeo4j[] | string>(`${environment.apiUrl}/user/followedUser`, {
        params,
      })
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }

  getFollowedUsersPage(username: string, page = 0, size = 20): Observable<Page<UserNeo4j>> {
    const params = new HttpParams()
      .set('username', username)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<UserNeo4j>>(`${environment.apiUrl}/user/followedUser/page`, {
      params,
    });
  }

  searchUsers(query: string, username: string): Observable<UserNeo4j[]> {
    const params = new HttpParams().set('query', query).set('username', username);
    return this.http
      .get<UserNeo4j[] | string>(`${environment.apiUrl}/user/search`, { params })
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }

  getSuggestedFriends(username: string): Observable<SuggestedUser[]> {
    const params = new HttpParams().set('username', username);
    return this.http
      .get<SuggestedUser[] | string>(`${environment.apiUrl}/user/SuggestFriends`, {
        params,
      })
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }

  followUser(followerUsername: string, followedUsername: string): Observable<string> {
    const params = new HttpParams()
      .set('followerUsername', followerUsername)
      .set('followedUsername', followedUsername);
    return this.http.post(`${environment.apiUrl}/user/userSelected/follow`, null, {
      params,
      responseType: 'text',
    });
  }

  unfollowUser(followerUsername: string, followedUsername: string): Observable<string> {
    const params = new HttpParams()
      .set('followerUsername', followerUsername)
      .set('followedUsername', followedUsername);
    return this.http.post(`${environment.apiUrl}/user/userSelected/unfollow`, null, {
      params,
      responseType: 'text',
    });
  }

  updateUsername(username: string, newUsername: string): Observable<string> {
    const params = new HttpParams()
      .set('username', username)
      .set('newUsername', newUsername);
    return this.http.patch(`${environment.apiUrl}/user/updateUser`, null, {
      params,
      responseType: 'text',
    });
  }
}
