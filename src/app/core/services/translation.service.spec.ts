import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

function setNavigatorLanguages(languages: string[]) {
  Object.defineProperty(navigator, 'language', { value: languages[0], configurable: true });
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
}

describe('TranslationService', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function create(): TranslationService {
    TestBed.configureTestingModule({});
    return TestBed.inject(TranslationService);
  }

  it('detects a supported browser language when nothing is stored', () => {
    localStorage.clear();
    setNavigatorLanguages(['it-IT', 'en-US']);

    expect(create().lang()).toBe('it');
  });

  it('falls back to english when the browser language is unsupported', () => {
    localStorage.clear();
    setNavigatorLanguages(['fr-FR']);

    expect(create().lang()).toBe('en');
  });

  it('prefers a stored language over the browser language', () => {
    localStorage.setItem('gamehub_lang', 'it');
    setNavigatorLanguages(['en-US']);

    expect(create().lang()).toBe('it');
  });

  it('ignores an unsupported stored value and falls back to browser detection', () => {
    localStorage.setItem('gamehub_lang', 'fr');
    setNavigatorLanguages(['it-IT']);

    expect(create().lang()).toBe('it');
  });

  it('setLang updates the signal and persists the choice', () => {
    setNavigatorLanguages(['en-US']);
    const service = create();

    service.setLang('it');

    expect(service.lang()).toBe('it');
    expect(localStorage.getItem('gamehub_lang')).toBe('it');
  });

  it('t() returns the translation for the active language', () => {
    setNavigatorLanguages(['en-US']);
    const service = create();

    expect(service.t('common.free')).toBe('Free');

    service.setLang('it');
    expect(service.t('common.free')).toBe('Gratis');
  });

  it('t() returns the raw key when it exists in no dictionary', () => {
    const service = create();
    expect(service.t('totally.unknown.key')).toBe('totally.unknown.key');
  });

  it('t() interpolates params into the translation', () => {
    setNavigatorLanguages(['en-US']);
    const service = create();

    expect(service.t('common.pageOf', { current: 2, total: 5 })).toBe('Page 2 of 5');
  });

  it('availableLanguages lists italian and english', () => {
    const service = create();
    expect(service.availableLanguages.map((l) => l.code)).toEqual(['it', 'en']);
  });
});
