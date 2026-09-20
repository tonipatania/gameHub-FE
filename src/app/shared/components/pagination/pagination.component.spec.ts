import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  function create(page: number, totalPages: number, disabled = false) {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    return { fixture, prev: buttons[0], next: buttons[1] };
  }

  beforeEach(() => {
    localStorage.setItem('gamehub_lang', 'en');
    TestBed.configureTestingModule({ imports: [PaginationComponent] });
  });

  afterEach(() => localStorage.clear());

  it('shows the 1-based page label', () => {
    const { fixture } = create(1, 5);
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 5');
  });

  it('disables "previous" on the first page and "next" on the last', () => {
    expect(create(0, 3).prev.disabled).toBe(true);
    expect(create(0, 3).next.disabled).toBe(false);
    expect(create(2, 3).next.disabled).toBe(true);
    expect(create(2, 3).prev.disabled).toBe(false);
  });

  it('disables both buttons while a page is loading', () => {
    const { prev, next } = create(1, 3, true);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });

  it('emits prev and next when the buttons are clicked', () => {
    const { fixture, prev, next } = create(1, 3);
    const onPrev = vi.fn();
    const onNext = vi.fn();
    fixture.componentInstance.prev.subscribe(onPrev);
    fixture.componentInstance.next.subscribe(onNext);

    prev.click();
    next.click();

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
