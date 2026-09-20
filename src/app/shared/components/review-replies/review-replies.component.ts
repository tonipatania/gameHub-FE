import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReviewReply } from '../../../core/models/review.model';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { relativeTime } from '../../utils/relative-time';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

const MAX_REPLY_LENGTH = 500;

/**
 * Il thread di risposte sotto una recensione: elenco in ordine cronologico e, se `canReply`, il
 * campo per rispondere. Il thread e' piatto (non si risponde a una risposta); chi ha scritto la
 * recensione lo legge ma non ha il campo (`canReply` falso), e ogni autore puo' eliminare le
 * proprie risposte.
 */
@Component({
  selector: 'app-review-replies',
  imports: [ReactiveFormsModule, RouterLink, LoadingSpinnerComponent],
  template: `
    <div class="mt-4 border-t border-slate-800 pt-4">
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        @if (replies().length === 0) {
          <p class="text-sm text-slate-500">{{ i18n.t('replies.empty') }}</p>
        } @else {
          <ul class="space-y-3">
            @for (reply of replies(); track reply.id) {
              <li class="flex gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {{ initials(reply.username) }}
                </div>
                <div class="min-w-0 flex-1 rounded-lg bg-slate-800/60 px-3 py-2">
                  <div class="flex flex-wrap items-center gap-x-2 text-xs">
                    <a [routerLink]="['/profile', reply.username]" class="font-semibold gh-link">
                      {{ reply.username }}
                    </a>
                    <span class="text-slate-500">{{ timeAgo(reply.createdAt) }}</span>
                    @if (reply.username === me) {
                      <button
                        type="button"
                        (click)="remove(reply)"
                        class="ml-auto cursor-pointer text-slate-500 transition hover:text-rose-400"
                      >
                        {{ i18n.t('replies.delete') }}
                      </button>
                    }
                  </div>
                  <p class="mt-1 whitespace-pre-line break-words text-sm text-slate-200">
                    {{ reply.comment }}
                  </p>
                </div>
              </li>
            }
          </ul>
        }

        @if (canReply()) {
          <!-- (submit) con preventDefault e non (ngSubmit): senza un [formGroup] sul form Angular non
               lo intercetta e il browser ricaricherebbe la pagina -->
          <form (submit)="onSubmit($event)" class="mt-4">
            <textarea
              [formControl]="control"
              rows="2"
              [attr.maxlength]="maxLength"
              [placeholder]="i18n.t('replies.placeholder')"
              class="gh-input resize-none text-sm"
            ></textarea>
            <div class="mt-2 flex items-center justify-between gap-3">
              <span class="text-xs text-slate-500">
                {{ control.value.length }}/{{ maxLength }}
              </span>
              <button
                type="submit"
                [disabled]="control.invalid || submitting()"
                class="gh-btn gh-btn-primary gh-btn-sm"
              >
                {{ i18n.t('replies.submit') }}
              </button>
            </div>
          </form>
        }
      }
    </div>
  `,
})
export class ReviewRepliesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly reviewId = input.required<string>();
  /** falso per l'autore della recensione: puo' leggere le risposte ma non darne */
  readonly canReply = input(false);
  /** il numero totale di risposte dopo un'aggiunta o una cancellazione */
  readonly countChange = output<number>();

  readonly maxLength = MAX_REPLY_LENGTH;
  readonly me = this.auth.getUsername();

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly replies = signal<ReviewReply[]>([]);

  readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_REPLY_LENGTH)],
  });

  ngOnInit(): void {
    this.reviewService.getReplies(this.reviewId()).subscribe({
      next: (replies) => {
        this.replies.set(replies);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  submit(): void {
    const comment = this.control.value.trim();
    if (!comment || this.control.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.reviewService.createReply(this.reviewId(), comment).subscribe({
      next: (reply) => {
        this.submitting.set(false);
        this.control.reset('');
        this.replies.update((list) => [...list, reply]);
        this.countChange.emit(this.replies().length);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('replies.error'));
      },
    });
  }

  remove(reply: ReviewReply): void {
    this.reviewService.deleteReply(reply.id).subscribe({
      next: () => {
        this.replies.update((list) => list.filter((r) => r.id !== reply.id));
        this.countChange.emit(this.replies().length);
      },
      error: () => this.toast.error(this.i18n.t('replies.error')),
    });
  }

  initials(username: string): string {
    return username.slice(0, 2).toUpperCase();
  }

  timeAgo(iso: string): string {
    return relativeTime(iso, this.i18n);
  }
}
