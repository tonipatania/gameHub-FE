import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Review, ReviewCreate } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getByGameTitle(title: string): Observable<Review[]> {
    const params = new HttpParams().set('title', title);
    return this.http
      .get<Review[] | string>(
        `${environment.apiUrl}/review/gameSelected/searchByGameTitle`,
        { params },
      )
      .pipe(map((result) => (Array.isArray(result) ? result : [])));
  }

  create(review: ReviewCreate): Observable<string> {
    return this.http.post(`${environment.apiUrl}/review/gameSelected/create`, review, {
      responseType: 'text',
    });
  }

  likeReview(username: string, reviewId: string): Observable<string> {
    const params = new HttpParams()
      .set('username', username)
      .set('id', reviewId);
    return this.http.post(
      `${environment.apiUrl}/user/reviewSelected/addLikeReview`,
      null,
      { params, responseType: 'text' },
    );
  }
}
