// i18n.js - Internationalization configuration
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { translations } from './translations';

// Initialize i18n
const i18n = new I18n(translations);

// Set the locale - handle cases where locale might be undefined or have region code
const deviceLocale = Localization.locale || Localization.locales?.[0] || 'en-US';
const languageCode = deviceLocale.split('-')[0]; // Get just 'en' from 'en-US'

// Set to 'en' or 'fr' based on device language, default to 'en'
i18n.locale = languageCode === 'fr' ? 'fr' : 'en';

// When a value is missing from a language it'll fall back to another language with the key present
i18n.enableFallback = true;

// Set default locale
i18n.defaultLocale = 'en';

export default i18n;
