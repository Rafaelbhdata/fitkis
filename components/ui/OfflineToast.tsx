'use client'

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Toast that appears when the user goes offline
 * Fixed at bottom of screen, above mobile dock
 */
export function OfflineToast() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed bottom-28 md:bottom-8 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-slide-up">
      <div className="bg-ink text-paper rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-berry/20 flex items-center justify-center flex-shrink-0">
          <WifiOff className="w-4 h-4 text-berry" />
        </div>
        <div>
          <p className="font-medium text-sm">Sin conexion</p>
          <p className="text-xs text-paper/70">Los cambios se guardaran cuando vuelvas a estar en linea</p>
        </div>
      </div>
    </div>
  )
}

export default OfflineToast
