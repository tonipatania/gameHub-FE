import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

@Component({
  imports: [PageHeaderComponent],
  template: `<app-page-header title="Games" [subtitle]="subtitle"
    ><button>Filter</button></app-page-header
  >`,
})
class HostComponent {
  subtitle = 'Browse the catalog';
}

describe('PageHeaderComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('renders the title as the page h1 and the subtitle', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('Games');
    expect(h1.className).toContain('gh-page-title');
    expect(fixture.nativeElement.textContent).toContain('Browse the catalog');
  });

  it('projects actions next to the title', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Filter');
  });

  it('omits the subtitle paragraph when none is given', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.subtitle = '';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });
});
