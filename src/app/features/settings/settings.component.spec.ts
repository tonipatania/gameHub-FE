import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { TranslationService } from '../../core/services/translation.service';

describe('SettingsComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  function create() {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('selecting a language updates TranslationService', () => {
    const fixture = create();
    const i18n = TestBed.inject(TranslationService);

    fixture.componentInstance.select('it');

    expect(i18n.lang()).toBe('it');
    expect(localStorage.getItem('gamehub_lang')).toBe('it');
  });

  it('renders a button per available language', () => {
    const fixture = create();
    // scoped to <section>: the page also renders a back button outside it
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('section button');
    expect(buttons.length).toBe(fixture.componentInstance.i18n.availableLanguages.length);
  });
});
