import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReviewCreate } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly likedReviewIds = signal<ReadonlySet<string>>(new Set());
  private likedLoadedFor: string | null = null;

  create(review: ReviewCreate): Observable<string> {
    return this.http.post(`${environment.apiUrl}/review/gameSelected/create`, review, {
      responseType: 'text',
    });
  }

  hasLiked(reviewId: string): boolean {
    return this.likedReviewIds().has(reviewId);
  }

  // Fetches the reviews the user already liked, once per user, so the hearts
  // stay filled after a reload instead of letting them like the same review twice.
  loadLikedReviews(username: string): void {
    if (this.likedLoadedFor === username) return;

    this.likedLoadedFor = username;
    this.likedReviewIds.set(new Set());
    this.http
      .get<string[]>(`${environment.apiUrl}/user/reviewSelected/likedReviews`, {
        params: new HttpParams().set('username', username),
      })
      .subscribe({
        next: (ids) => this.likedReviewIds.set(new Set(ids)),
        error: () => (this.likedLoadedFor = null),
      });
  }

  // Resolves to true only when the backend actually registered a new like:
  // the LIKE relationship is merged, so repeated calls never bump likeCount.
  likeReview(username: string, reviewId: string): Observable<boolean> {
    return this.http
      .post(`${environment.apiUrl}/user/reviewSelected/addLikeReview`, null, {
        params: this.likeParams(username, reviewId),
        responseType: 'text',
      })
      .pipe(
        map((result) => result.trim() === 'added like'),
        tap((applied) => {
          if (applied) this.markLiked(reviewId, true);
        }),
      );
  }

  // Resolves to true only when a like was actually removed.
  unlikeReview(username: string, reviewId: string): Observable<boolean> {
    return this.http
      .post(`${environment.apiUrl}/user/reviewSelected/removeLikeReview`, null, {
        params: this.likeParams(username, reviewId),
        responseType: 'text',
      })
      .pipe(
        map((result) => result.trim() === 'removed like'),
        tap((applied) => {
          if (applied) this.markLiked(reviewId, false);
        }),
      );
  }

  private likeParams(username: string, reviewId: string): HttpParams {
    return new HttpParams().set('username', username).set('id', reviewId);
  }

  private markLiked(reviewId: string, liked: boolean): void {
    this.likedReviewIds.update((ids) => {
      const updated = new Set(ids);
      if (liked) {
        updated.add(reviewId);
      } else {
        updated.delete(reviewId);
      }
      return updated;
    });
  }
}
