import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageLayoutComponent } from './page-layout.component';

@Component({
  imports: [PageLayoutComponent],
  template: `<app-page-layout><p id="content">hello</p></app-page-layout>`,
})
class HostComponent {}

describe('PageLayoutComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => sessionStorage.clear());

  it('renders the shared toolbar above the page content', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-navbar')).not.toBeNull();
    expect(root.querySelector('main #content')?.textContent).toBe('hello');
  });

  it('gives the content the same full-width gutter as the toolbar, with no max-width cap', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const main = root.querySelector('main')!;
    const nav = root.querySelector('nav')!;
    expect(main.className).toContain('gh-gutter');
    expect(nav.className).toContain('gh-gutter');
    expect(main.className).not.toMatch(/max-w-/);
    expect(nav.className).not.toMatch(/max-w-/);
  });
});
