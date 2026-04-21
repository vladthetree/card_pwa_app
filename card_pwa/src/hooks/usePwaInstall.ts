import { useEffect, useState } from 'react'
import { supportsPwaInstallPrompt } from '../env'

type InstallPromptEvent = {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandaloneMode(): boolean {
  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  return standaloneMedia || iosStandalone
}

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function usePwaInstall() {
  const pwaSupported = supportsPwaInstallPrompt()
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    if (!pwaSupported) return true
    return isStandaloneMode()
  })
  const [isInstalling, setIsInstalling] = useState(false)
  const [isIos, setIsIos] = useState(() => (pwaSupported ? false : isIosDevice()))

  useEffect(() => {
    if (!pwaSupported) {
      setDeferredPrompt(null)
      setIsInstalled(true)
      setIsIos(isIosDevice())
      return
    }

    setIsIos(isIosDevice())

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as unknown as InstallPromptEvent)
      setIsInstalled(isStandaloneMode())
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [pwaSupported])

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt || isInstalling) return false

    try {
      setIsInstalling(true)
      await deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      const accepted = result.outcome === 'accepted'

      if (accepted) {
        setIsInstalled(true)
      }

      setDeferredPrompt(null)
      return accepted
    } finally {
      setIsInstalling(false)
    }
  }

  return {
    canInstall: pwaSupported && !isInstalled,
    isInstalled,
    hasNativePrompt: pwaSupported && Boolean(deferredPrompt),
    isIos,
    isInstalling,
    install,
  }
}
