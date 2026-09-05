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

// A key with no translation must not render as text. i18n-js defaults to the
// "message" strategy, which emits the literal string `[missing "en.shotDNA"
// translation]` straight into the UI — that is how six of the Pro plan's feature
// bullets shipped onto the paywall as bracketed error text. "guess" humanizes the
// key instead ('shotDNA' → 'Shot DNA'), so the worst case is imperfect wording
// rather than something that reads as a crash.
i18n.missingBehavior = 'guess';

export default i18n;
