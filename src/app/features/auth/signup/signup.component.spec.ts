import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { SignupComponent } from './signup.component';
import { environment } from '../../../../environments/environment';

describe('SignupComponent', () => {
  let httpMock: HttpTestingController;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  function create() {
    const fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
    return fixture;
  }

  const validPayload = {
    name: 'A',
    surname: 'B',
    username: 'ab',
    email: 'a@b.com',
    password: 'pass',
  };

  it('should create with an invalid empty form', () => {
    const fixture = create();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('does not call the API when submitted while invalid', () => {
    const fixture = create();
    fixture.componentInstance.onSubmit();
    httpMock.expectNone(() => true);
  });

  it('rejects an invalid email and a too-short password', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ ...validPayload, email: 'not-an-email', password: 'ab' });
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('shows a success message and navigates to /login after a delay on success', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue(validPayload);

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/signup`);
    expect(req.request.body).toEqual(validPayload);
    req.flush('created');

    expect(fixture.componentInstance.success()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows the raw server error message when the backend returns text', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue(validPayload);

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/signup`);
    req.flush('username already taken', { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.error()).toBe('username already taken');
    expect(fixture.componentInstance.success()).toBe(false);
  });
});
