/* ═══════════════════════════════════════════
   DebtLens — consent.js
   Cookie同意バナー・AdSense条件付き読み込み
   電気通信事業法 外部送信規律対応
   ═══════════════════════════════════════════ */

'use strict';

(function() {
  const CONSENT_KEY = 'debtlens_cookie_consent';
  const ADSENSE_ID = 'ca-pub-XXXXXXXXXX'; // ← AdSense IDに差し替え

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch(e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch(e) {}
  }

  function loadAdSense() {
    if (document.querySelector('script[data-ad-client]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-ad-client', ADSENSE_ID);
    document.head.appendChild(s);
  }

  function loadGA() {
    // Google Analytics 4 — consent連動
    if (document.querySelector('script[data-ga]')) return;
    const GA_ID = 'G-XXXXXXXXXX'; // ← GA4のIDに差し替え
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    s.setAttribute('data-ga', '1');
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function showBanner() {
    const existing = document.getElementById('cookie-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <p>当サイトではサービス向上のためCookieを使用します。
      「同意する」を選択するとGoogle AdSense・Google Analyticsの
      Cookieが有効になります。
      <a href="privacy.html" style="text-decoration:underline">プライバシーポリシー</a></p>
      <button class="btn-accept" id="cookie-accept">同意する</button>
      <button class="btn-decline" id="cookie-decline">同意しない</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('cookie-accept').addEventListener('click', () => {
      setConsent('accepted');
      banner.remove();
      loadAdSense();
      loadGA();
    });

    document.getElementById('cookie-decline').addEventListener('click', () => {
      setConsent('declined');
      banner.remove();
    });
  }

  // ── Init ──
  const consent = getConsent();
  if (consent === 'accepted') {
    loadAdSense();
    loadGA();
  } else if (!consent) {
    // 初回訪問 → バナー表示
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
  // consent === 'declined' → 何も読み込まない
})();
