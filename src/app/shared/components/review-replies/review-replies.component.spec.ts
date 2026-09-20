import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ReviewRepliesComponent } from './review-replies.component';
import { ReviewReply } from '../../../core/models/review.model';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

const reply = (id: string, username: string, comment = 'Hello'): ReviewReply => ({
  id,
  reviewId: 'r1',
  username,
  comment,
  createdAt: new Date().toISOString(),
});

describe('ReviewRepliesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('gamehub_user', 'toni');
    TestBed.configureTestingModule({
      imports: [ReviewRepliesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  function create(canReply = true, replies: ReviewReply[] = []) {
    const fixture = TestBed.createComponent(ReviewRepliesComponent);
    fixture.componentRef.setInput('reviewId', 'r1');
    fixture.componentRef.setInput('canReply', canReply);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/review/replies`);
    expect(req.request.params.get('reviewId')).toBe('r1');
    req.flush(replies);
    fixture.detectChanges();
    return fixture;
  }

  it('loads and renders the thread in the order received', () => {
    const fixture = create(true, [reply('p1', 'anna', 'First!'), reply('p2', 'bob', 'Second')]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.indexOf('First!')).toBeGreaterThan(-1);
    expect(text.indexOf('First!')).toBeLessThan(text.indexOf('Second'));
  });

  it('says so when nobody has replied yet', () => {
    const fixture = create();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No replies yet');
  });

  it('shows the reply box only when replying is allowed', () => {
    const allowed = create(true);
    expect((allowed.nativeElement as HTMLElement).querySelector('textarea')).toBeTruthy();

    const denied = create(false);
    expect((denied.nativeElement as HTMLElement).querySelector('textarea')).toBeNull();
  });

  it('posts a trimmed reply, appends it and reports the new total', () => {
    const fixture = create(true, [reply('p1', 'anna')]);
    const emitted: number[] = [];
    fixture.componentInstance.countChange.subscribe((n) => emitted.push(n));

    fixture.componentInstance.control.setValue('  Agreed!  ');
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/review/reply`);
    expect(req.request.body).toEqual({ reviewId: 'r1', comment: 'Agreed!' });
    req.flush(reply('p2', 'toni', 'Agreed!'));

    expect(fixture.componentInstance.replies().map((r) => r.id)).toEqual(['p1', 'p2']);
    expect(fixture.componentInstance.control.value).toBe('');
    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(emitted).toEqual([2]);
  });

  it('submitting the form posts the reply without a native form submit (no page reload)', () => {
    const fixture = create();
    fixture.componentInstance.control.setValue('Agreed!');
    fixture.detectChanges();

    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    const event = new Event('submit', { cancelable: true });
    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    httpMock.expectOne(`${environment.apiUrl}/review/reply`).flush(reply('p9', 'toni', 'Agreed!'));
  });

  it('does not post an empty or whitespace-only reply', () => {
    const fixture = create();

    fixture.componentInstance.control.setValue('   ');
    fixture.componentInstance.submit();

    httpMock.expectNone(`${environment.apiUrl}/review/reply`);
  });

  it('does not post a reply over the length limit', () => {
    const fixture = create();

    fixture.componentInstance.control.setValue('x'.repeat(501));
    fixture.componentInstance.submit();

    httpMock.expectNone(`${environment.apiUrl}/review/reply`);
  });

  it('shows an error toast and keeps the text when posting fails', () => {
    const fixture = create();
    const toastError = vi.spyOn(TestBed.inject(ToastService), 'error');

    fixture.componentInstance.control.setValue('Agreed!');
    fixture.componentInstance.submit();
    httpMock
      .expectOne(`${environment.apiUrl}/review/reply`)
      .flush('nope', { status: 403, statusText: 'Forbidden' });

    expect(toastError).toHaveBeenCalled();
    expect(fixture.componentInstance.control.value).toBe('Agreed!');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it("offers deletion only on the user's own replies", () => {
    const fixture = create(true, [reply('p1', 'anna'), reply('p2', 'toni')]);
    const deletes = (fixture.nativeElement as HTMLElement).querySelectorAll('li button');

    expect(deletes.length).toBe(1);
    expect(deletes[0].textContent).toContain('Delete');
  });

  it('deleting a reply removes it and reports the new total', () => {
    const fixture = create(true, [reply('p1', 'anna'), reply('p2', 'toni')]);
    const emitted: number[] = [];
    fixture.componentInstance.countChange.subscribe((n) => emitted.push(n));

    fixture.componentInstance.remove(fixture.componentInstance.replies()[1]);
    const req = httpMock.expectOne(`${environment.apiUrl}/review/reply/p2`);
    expect(req.request.method).toBe('DELETE');
    req.flush('reply deleted');

    expect(fixture.componentInstance.replies().map((r) => r.id)).toEqual(['p1']);
    expect(emitted).toEqual([1]);
  });
});
