"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button'; // Assuming a Button component exists

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant={i18n.language === 'en' ? 'default' : 'outline'}
        onClick={() => changeLanguage('en')}
        disabled={i18n.language === 'en'}
      >
        English
      </Button>
      <Button
        variant={i18n.language === 'ar' ? 'default' : 'outline'}
        onClick={() => changeLanguage('ar')}
        disabled={i18n.language === 'ar'}
      >
        Arabic
      </Button>
    </div>
  );
}
