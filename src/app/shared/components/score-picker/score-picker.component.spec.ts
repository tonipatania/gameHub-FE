import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ScorePickerComponent } from './score-picker.component';

@Component({
  imports: [ReactiveFormsModule, ScorePickerComponent],
  template: `<app-score-picker [formControl]="control" />`,
})
class HostComponent {
  readonly control = new FormControl<number | null>(8);
}

describe('ScorePickerComponent', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const ticks = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    return { fixture, el, ticks };
  }

  it('renders ten ticks and reflects the initial form value', () => {
    const { el, ticks } = create();

    expect(ticks().length).toBe(10);
    expect(ticks()[7].getAttribute('aria-checked')).toBe('true');
    expect(ticks()[0].getAttribute('aria-checked')).toBe('false');
    // il voto grande e il giudizio a parole
    expect(el.textContent).toContain('8');
    expect(el.textContent).toContain('Great');
  });

  it('clicking a tick writes that score into the form control', () => {
    const { fixture, ticks } = create();

    ticks()[9].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(10);
    expect(ticks()[9].getAttribute('aria-checked')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Masterpiece');
  });

  it('marks the control as touched once a score is picked', () => {
    const { fixture, ticks } = create();
    expect(fixture.componentInstance.control.touched).toBe(false);

    ticks()[2].click();

    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('follows programmatic changes of the control', () => {
    const { fixture, ticks } = create();

    fixture.componentInstance.control.setValue(3);
    fixture.detectChanges();

    expect(ticks()[2].getAttribute('aria-checked')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Poor');
  });

  it('previews the hovered score without changing the value', () => {
    const { fixture, ticks, el } = create();

    ticks()[0].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Awful');
    expect(fixture.componentInstance.control.value).toBe(8);

    el.querySelector('[role="radiogroup"]')!.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Great');
  });

  it('arrow keys move the score, clamped to 1..10', () => {
    const { fixture, ticks } = create();
    fixture.componentInstance.control.setValue(9);
    fixture.detectChanges();

    const press = (key: string) => {
      ticks()[0].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };

    press('ArrowRight');
    expect(fixture.componentInstance.control.value).toBe(10);
    press('ArrowRight');
    expect(fixture.componentInstance.control.value).toBe(10);
    press('ArrowLeft');
    expect(fixture.componentInstance.control.value).toBe(9);
    press('Home');
    expect(fixture.componentInstance.control.value).toBe(9);
  });

  it('does not accept clicks while disabled', () => {
    const { fixture, ticks } = create();
    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    ticks()[4].click();

    expect(fixture.componentInstance.control.value).toBe(8);
    expect(ticks()[4].disabled).toBe(true);
  });

  it('shows a prompt when there is no score yet', () => {
    const { fixture, el } = create();

    fixture.componentInstance.control.setValue(null);
    fixture.detectChanges();

    expect(el.textContent).toContain('Pick a score');
  });
});
