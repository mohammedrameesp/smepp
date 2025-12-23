'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSChrome, setIsIOSChrome] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(iOS);

    // Detect iOS Chrome (Chrome on iOS doesn't support PWA installation)
    const isChromeIOS = iOS && /crios/.test(userAgent);
    setIsIOSChrome(isChromeIOS);

    // Don't show if already installed
    if (isInStandaloneMode) {
      return;
    }

    // For iOS Safari, show install prompt manually
    if (iOS && !isChromeIOS) {
      // Show iOS installation instructions after a short delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 2000);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Listen for install prompt (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Save the event for later
      setDeferredPrompt(e);
      // Show install button
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // For iOS, show instructions instead
    if (isIOS && !deferredPrompt) {
      return; // Instructions are already shown in the UI
    }

    if (!deferredPrompt) {
      toast.info('Installation not available on this browser');
      return;
    }

    // Show the install prompt (Android/Desktop)
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('App installed successfully!');
      setShowInstallPrompt(false);
    } else {
      toast.info('You can install the app anytime from the menu');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) {
    return null;
  }

  // iOS Chrome warning
  if (isIOSChrome) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-2xl border-2 border-slate-200 p-4 z-50 animate-in slide-in-from-bottom">
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Install in Safari</h3>
            <p className="text-sm text-gray-600 mb-2">
              To install this app on iOS, please open it in <strong>Safari</strong> browser instead of Chrome.
            </p>
            <p className="text-xs text-gray-500">
              Chrome on iOS doesn&apos;t support app installation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-2xl border-2 border-slate-200 p-4 z-50 animate-in slide-in-from-bottom">
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Install Validator App</h3>
            <p className="text-sm text-gray-600 mb-3">
              Install for faster access and offline capability
            </p>

            <div className="bg-slate-50 rounded-lg p-3 mb-2">
              <div className="flex items-start gap-2 mb-2">
                <div className="bg-slate-600 rounded p-1 mt-0.5">
                  <Share className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">Step 1</p>
                  <p className="text-xs text-gray-600">Tap the Share button at the bottom</p>
                </div>
              </div>
              <div className="flex items-start gap-2 mb-2">
                <div className="bg-slate-600 rounded p-1 mt-0.5">
                  <Download className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">Step 2</p>
                  <p className="text-xs text-gray-600">Select &quot;Add to Home Screen&quot;</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-slate-600 rounded p-1 mt-0.5">
                  <span className="text-xs text-white font-bold">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">Step 3</p>
                  <p className="text-xs text-gray-600">Tap &quot;Add&quot; to install</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop Chrome
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-2xl border-2 border-slate-200 p-4 z-50 animate-in slide-in-from-bottom">
      <button
        onClick={() => setShowInstallPrompt(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Install Validator App</h3>
          <p className="text-sm text-gray-600 mb-3">
            Install for faster access and offline capability
          </p>

          <Button
            onClick={handleInstallClick}
            className="w-full bg-slate-600 hover:bg-slate-700"
            size="sm"
          >
            Install Now
          </Button>
        </div>
      </div>
    </div>
  );
}
