import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  imports: [AuthShellComponent],
  template: `<app-auth-shell [brand]="brand" headingPrefix="Join" subtitle="Tagline"
    ><form id="f"></form
  ></app-auth-shell>`,
})
class HostComponent {
  brand = true;
}

describe('AuthShellComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('shows the logo, the brand title with its prefix, the subtitle and the projected form', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('🎮');
    expect(text).toContain('Join');
    expect(text).toContain('GameHub');
    expect(text).toContain('Tagline');
    expect(fixture.nativeElement.querySelector('#f')).not.toBeNull();
  });

  it('keeps only the logo when the brand title is switched off', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.brand = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('🎮');
  });
});
