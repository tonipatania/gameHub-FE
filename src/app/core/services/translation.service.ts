import { Injectable, signal } from '@angular/core';
import { en } from '../i18n/en';
import { it } from '../i18n/it';

export type LangCode = 'en' | 'it';

const STORAGE_KEY = 'gamehub_lang';
const SUPPORTED_LANGS: LangCode[] = ['en', 'it'];
const DICTIONARIES: Record<LangCode, Record<string, string>> = { en, it };

function isSupported(value: string | null | undefined): value is LangCode {
  return !!value && (SUPPORTED_LANGS as string[]).includes(value);
}

// browser/OS locale is used as a proxy for geographic location: no external geo-IP lookup is
// involved, so this works offline and raises no privacy concerns
function detectBrowserLang(): LangCode {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of candidates) {
    const primary = raw?.split('-')[0]?.toLowerCase();
    if (isSupported(primary)) return primary;
  }
  return 'en';
}

function readStoredLang(): LangCode | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return isSupported(stored) ? stored : null;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly availableLanguages: { code: LangCode; labelKey: string }[] = [
    { code: 'it', labelKey: 'settings.languageItalian' },
    { code: 'en', labelKey: 'settings.languageEnglish' },
  ];

  readonly lang = signal<LangCode>(readStoredLang() ?? detectBrowserLang());

  setLang(lang: LangCode): void {
    this.lang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const dict = DICTIONARIES[this.lang()];
    let text = dict[key] ?? DICTIONARIES.en[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  }
}
