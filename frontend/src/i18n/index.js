import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.js';
import bn from './locales/bn.js';

const getInitialLanguage = () => {
  const stored = localStorage.getItem('language');
  if (stored === 'en' || stored === 'bn') return stored;
  const browser = navigator.language?.toLowerCase() || '';
  return browser.startsWith('bn') ? 'bn' : 'en';
};

const language = getInitialLanguage();
document.documentElement.lang = language;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    bn: { translation: bn },
  },
  lng: language,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lng) => {
  if (lng !== 'en' && lng !== 'bn') return;
  localStorage.setItem('language', lng);
  document.documentElement.lang = lng;
  i18n.changeLanguage(lng);
};

export default i18n;