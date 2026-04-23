import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface UseFocusTrapOptions {
  isActive: boolean
  onEscape?: () => void
}

/**
 * Focus trap hook for modals and dialogs
 * Traps focus within the container when active
 * Returns focus to previously focused element when deactivated
 */
export function useFocusTrap({ isActive, onEscape }: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Store the previously focused element when becoming active
  useEffect(() => {
    if (isActive) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
    } else if (previouslyFocusedRef.current) {
      // Return focus when deactivated
      previouslyFocusedRef.current.focus()
      previouslyFocusedRef.current = null
    }
  }, [isActive])

  // Focus first focusable element when becoming active
  useEffect(() => {
    if (isActive && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      if (focusableElements.length > 0) {
        // Small delay to ensure modal is fully rendered
        setTimeout(() => {
          focusableElements[0].focus()
        }, 50)
      }
    }
  }, [isActive])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive || !containerRef.current) return

    // Handle Escape key
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
      return
    }

    // Handle Tab key for focus trap
    if (e.key === 'Tab') {
      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab from first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // Tab from last element -> go to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }, [isActive, onEscape])

  // Add/remove event listener
  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isActive, handleKeyDown])

  return containerRef
}

export default useFocusTrap
