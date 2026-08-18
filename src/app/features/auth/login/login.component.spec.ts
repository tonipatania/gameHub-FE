import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { environment } from '../../../../environments/environment';

describe('LoginComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = create();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('keeps the submit disabled while the form is invalid', () => {
    const fixture = create();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('does not call the API when submitted while invalid', () => {
    const fixture = create();
    fixture.componentInstance.onSubmit();
    httpMock.expectNone(() => true);
  });

  it('navigates to /home on a successful login', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'pw' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush({ success: true, errorMessage: '', username: 'toni', token: 'tok', role: null });

    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows the server error message and does not navigate on rejected credentials', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'wrong' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush({ success: false, errorMessage: 'Invalid credentials', username: null, token: null, role: null });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toBe('Invalid credentials');
  });

  it('shows a connection error message when the request fails', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'pw' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.error(new ProgressEvent('network error'));

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).not.toBe('');
  });
});
