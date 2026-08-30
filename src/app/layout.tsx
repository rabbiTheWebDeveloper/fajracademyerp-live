import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://app.fajracademy.io'),
  title: {
    default: 'Fajr Academy ERP - Comprehensive EdTech Platform',
    template: '%s | Fajr Academy ERP',
  },
  description: 'Manage students, teachers, courses, and operations efficiently with Fajr Academy ERP. The best EdTech platform for modern educational institutions.',
  keywords: ['Fajr Academy', 'ERP', 'EdTech', 'School Management', 'Learning Management System', 'LMS', 'Student Portal', 'Teacher Portal'],
  authors: [{ name: 'Fajr Academy' }],
  creator: 'Fajr Academy',
  publisher: 'Fajr Academy',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fajr Academy',
    startupImage: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://app.fajracademy.io',
    title: 'Fajr Academy ERP - Comprehensive EdTech Platform',
    description: 'Manage students, teachers, courses, and operations efficiently with Fajr Academy ERP.',
    siteName: 'Fajr Academy',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Fajr Academy Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fajr Academy ERP',
    description: 'The best EdTech platform for modern educational institutions.',
    images: ['/logo.png'],
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1931',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fajr Academy" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
      </head>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased min-h-screen" suppressHydrationWarning>
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if (!('serviceWorker' in navigator)) return;

  var isProd = ${process.env.NODE_ENV === 'production'};

  if (!isProd) {
    // Dev: unregister all SWs and clear caches so stale pages never interfere
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var r of registrations) r.unregister();
    });
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (var n of names) caches.delete(n);
      });
    }
    return;
  }

  // ── Production: register SW + handle updates ─────────────────────────────
  function showUpdateBanner(reg) {
    // Avoid duplicate banners
    if (document.getElementById('pwa-update-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9999', 'display:flex', 'align-items:center', 'gap:12px',
      'background:#1e1b4b', 'color:#fff', 'padding:12px 18px',
      'border-radius:16px', 'box-shadow:0 8px 32px rgba(0,0,0,0.35)',
      'font-family:inherit', 'font-size:14px', 'font-weight:600',
      'max-width:calc(100vw - 32px)', 'width:360px',
      'animation:pwa-slide-up 0.35s cubic-bezier(.16,1,.3,1) both',
    ].join(';');

    // Inject keyframe once
    if (!document.getElementById('pwa-kf')) {
      var s = document.createElement('style');
      s.id = 'pwa-kf';
      s.textContent = '@keyframes pwa-slide-up{from{opacity:0;transform:translateX(-50%) translateY(24px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
      document.head.appendChild(s);
    }

    var icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a5b4fc" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
    var text = document.createElement('span');
    text.style.cssText = 'flex:1;line-height:1.4';
    text.innerHTML = icon + ' <span style="margin-left:6px">App update available!</span>';

    var btn = document.createElement('button');
    btn.textContent = 'Update Now';
    btn.style.cssText = [
      'background:#6366f1', 'color:#fff', 'border:none', 'border-radius:10px',
      'padding:7px 14px', 'font-size:13px', 'font-weight:700',
      'cursor:pointer', 'white-space:nowrap', 'flex-shrink:0',
      'transition:background .15s',
    ].join(';');
    btn.onmouseover = function() { btn.style.background = '#4f46e5'; };
    btn.onmouseout  = function() { btn.style.background = '#6366f1'; };
    btn.onclick = function() {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      banner.remove();
    };

    var dismiss = document.createElement('button');
    dismiss.textContent = '\u2715';
    dismiss.title = 'Dismiss';
    dismiss.style.cssText = [
      'background:transparent', 'border:none', 'color:#a5b4fc',
      'font-size:16px', 'cursor:pointer', 'padding:2px 4px', 'flex-shrink:0',
    ].join(';');
    dismiss.onclick = function() { banner.remove(); };

    banner.appendChild(text);
    banner.appendChild(btn);
    banner.appendChild(dismiss);
    document.body.appendChild(banner);
  }

  function trackInstalling(worker, reg) {
    worker.addEventListener('statechange', function() {
      if (worker.state === 'installed') {
        showUpdateBanner(reg);
      }
    });
  }

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('[SW] registered scope:', reg.scope);

      // There is already a waiting SW (update downloaded before this page load)
      if (reg.waiting) {
        showUpdateBanner(reg);
      }

      // A new SW starts installing
      reg.addEventListener('updatefound', function() {
        if (reg.installing) {
          trackInstalling(reg.installing, reg);
        }
      });

      // Reload the page when a new SW takes control
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // Listen for SW_ACTIVATED broadcast (informational)
      navigator.serviceWorker.addEventListener('message', function(evt) {
        if (evt.data && evt.data.type === 'SW_ACTIVATED') {
          console.log('[SW] new version active:', evt.data.version);
        }
      });

      // Check for updates every 5 minutes while the tab is open
      setInterval(function() { reg.update(); }, 5 * 60 * 1000);
    }).catch(function(err) {
      console.warn('[SW] registration failed:', err);
    });
  });
})();
            `,
          }}
        />
      </body>
    </html>
  );
}
