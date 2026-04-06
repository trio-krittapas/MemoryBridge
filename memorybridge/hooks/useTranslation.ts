'use client'

import { useLanguage } from '@/components/shared/LanguageContext';
import messages from '@/lib/i18n/messages.json';

type TranslationKey = string;

export function useTranslation() {
  const { language } = useLanguage();
  
  // Cast for easier lookup, fallback to English
  const dict = (messages as any)[language] || (messages as any)['en'];

  /**
   * Translate a key (e.g., 'dashboard.title')
   */
  const t = (key: TranslationKey) => {
    const keys = key.split('.');
    let result = dict;
    
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return key; // Fallback to raw key if not found
      }
    }
    
    return result;
  };

  return t;
}
