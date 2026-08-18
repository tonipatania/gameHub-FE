import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { BackButtonComponent } from './back-button.component';

describe('BackButtonComponent', () => {
  let locationBackSpy: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    locationBackSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [BackButtonComponent],
      providers: [provideRouter([]), { provide: Location, useValue: { back: locationBackSpy } }],
    });

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function create() {
    const fixture = TestBed.createComponent(BackButtonComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('goes back through Location when there is browser history', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    const fixture = create();

    fixture.componentInstance.goBack();

    expect(locationBackSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates to the fallback route when there is no browser history', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    const fixture = create();
    fixture.componentRef.setInput('fallback', '/games');

    fixture.componentInstance.goBack();

    expect(locationBackSpy).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/games']);
  });

  it('defaults the fallback route to /home', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    const fixture = create();

    fixture.componentInstance.goBack();

    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
  });
});
