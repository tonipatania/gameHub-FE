import { TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  it('renders a spinner element', () => {
    TestBed.configureTestingModule({ imports: [LoadingSpinnerComponent] });
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const spinner = (fixture.nativeElement as HTMLElement).querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });
});
