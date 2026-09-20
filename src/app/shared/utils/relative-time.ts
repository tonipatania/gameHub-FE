import { TranslationService } from '../../core/services/translation.service';

/** "Proprio ora", "5m fa", "3h fa", "2g fa" a partire da un istante ISO-8601. */
export function relativeTime(iso: string, i18n: TranslationService): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return i18n.t('activityFeed.justNow');
  if (minutes < 60) return i18n.t('activityFeed.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('activityFeed.hoursAgo', { count: hours });
  return i18n.t('activityFeed.daysAgo', { count: Math.floor(hours / 24) });
}
