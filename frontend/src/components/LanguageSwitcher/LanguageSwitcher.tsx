import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { LANGUAGES, getDirection } from '../../i18n'

interface LanguageSwitcherProps {
  className?: string
  variant?: 'dropdown' | 'inline'
  showFlag?: boolean
  showNativeName?: boolean
}

export function LanguageSwitcher({ 
  className = '',
  variant = 'dropdown',
  showFlag = true,
  showNativeName = true
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0]
  const direction = getDirection(i18n.language)

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {LANGUAGES.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${i18n.language === language.code
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {showFlag && <span className="text-lg">{language.flag}</span>}
            <span>{showNativeName ? language.nativeName : language.name}</span>
            {i18n.language === language.code && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200 text-sm font-medium min-w-[120px]"
        aria-label={t('language.select')}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        {showFlag && <span className="text-lg">{currentLanguage.flag}</span>}
        <span className="flex-1 text-left">
          {showNativeName ? currentLanguage.nativeName : currentLanguage.name}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute z-50 mt-2 w-full min-w-[200px] bg-background border border-border rounded-lg shadow-lg overflow-hidden
                ${direction === 'rtl' ? 'right-0' : 'left-0'}
              `}
            >
              <div className="py-1">
                {LANGUAGES.map((language, index) => (
                  <motion.button
                    key={language.code}
                    initial={{ opacity: 0, x: direction === 'rtl' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.05 }}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150
                      ${direction === 'rtl' ? 'text-right' : 'text-left'}
                      ${i18n.language === language.code
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted/50'
                      }
                    `}
                  >
                    {showFlag && (
                      <span className="text-lg flex-shrink-0">{language.flag}</span>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {showNativeName ? language.nativeName : language.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {showNativeName ? language.name : language.nativeName}
                      </div>
                    </div>
                    {i18n.language === language.code && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Language info */}
              <div className="border-t border-border px-4 py-2">
                <div className="text-xs text-muted-foreground">
                  {t('direction.ltr')}: {t('direction.rtl')}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LanguageSwitcher
