import { useTranslation } from 'react-i18next'
import { getDirection } from '../i18n'

/**
 * Custom hook for RTL (Right-to-Left) language detection
 * @returns {Object} RTL utilities
 * @returns {boolean} isRTL - Whether the current language is RTL
 * @returns {string} direction - The current direction ('ltr' or 'rtl')
 * @returns {Function} getRTLClass - Function to get conditional RTL classes
 */
export const useRTL = () => {
  const { i18n } = useTranslation()
  const isRTL = getDirection(i18n.language) === 'rtl'
  const direction = getDirection(i18n.language)

  /**
   * Get conditional RTL classes
   * @param baseClasses - Base CSS classes
   * @param rtlClasses - Classes to apply when RTL is active
   * @param ltrClasses - Classes to apply when LTR is active (optional)
   * @returns Combined classes string
   */
  const getRTLClass = (baseClasses: string, rtlClasses: string, ltrClasses?: string) => {
    if (isRTL) {
      return `${baseClasses} ${rtlClasses}`.trim()
    }
    return `${baseClasses} ${ltrClasses || ''}`.trim()
  }

  /**
   * Get flex direction classes for RTL
   * @param baseClasses - Base CSS classes
   * @returns Classes with appropriate flex direction
   */
  const getFlexDirection = (baseClasses: string) => {
    return getRTLClass(baseClasses, 'flex-row-reverse', 'flex-row')
  }

  /**
   * Get margin/padding classes for RTL
   * @param baseClasses - Base CSS classes
   * @param rtlMargin - RTL margin/padding classes
   * @param ltrMargin - LTR margin/padding classes
   * @returns Classes with appropriate margins/padding
   */
  const getMargin = (baseClasses: string, rtlMargin: string, ltrMargin: string) => {
    return getRTLClass(baseClasses, rtlMargin, ltrMargin)
  }

  return {
    isRTL,
    direction,
    getRTLClass,
    getFlexDirection,
    getMargin
  }
}
