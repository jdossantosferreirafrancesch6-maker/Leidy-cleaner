"use client";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!localStorage.getItem('cookieConsent')) setShow(true);
  }, []);

  if (!show) return null;
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 flex flex-col md:flex-row items-center justify-between z-50">
      <span>{t('cookie.message')} <a href="/termos" className="underline">{t('cookie.learnMore')}</a>.</span>
      <button
        className="mt-2 md:mt-0 bg-green-600 px-4 py-2 rounded text-white ml-4"
        onClick={() => { localStorage.setItem('cookieConsent', 'true'); setShow(false); }}
      >
        {t('cookie.accept')}
      </button>
    </div>
  );
}
