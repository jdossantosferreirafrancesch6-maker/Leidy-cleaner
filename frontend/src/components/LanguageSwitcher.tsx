"use client";
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { useState } from 'react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const languages = [
    { code: 'pt-BR', name: 'Português (BR)' },
    { code: 'en', name: 'English' },
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setOpen(!open)}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">
          {i18n.language === 'pt-BR' ? 'PT' : 'EN'}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                i18n.language === lang.code ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              <span className="text-sm">{lang.name}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
