/* ═══════════════════════════════════════════
   DebtLens — news.js
   ニュースウィジェット（RSS2JSON API経由・GitHub Actions不要）
   ═══════════════════════════════════════════ */

'use strict';

(function () {
  const MAX_ITEMS = 5;

  // Google News RSS（借金・返済関連）
  const RSS_URL = 'https://news.google.com/rss/search?q=%E5%80%9F%E9%87%91+%E8%BF%94%E6%B8%88+%E3%83%AA%E3%83%9C%E6%89%95%E3%81%84&hl=ja&gl=JP&ceid=JP:ja';

  // 無料CORSプロキシ（RSS→JSON変換）
  const API = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(RSS_URL) + '&count=' + MAX_ITEMS;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  async function loadNews() {
    const container = document.getElementById('news-widget');
    if (!container) return;

    // ローディング表示
    container.innerHTML = '<p style="font-size:12px;color:var(--c-gray-400);padding:8px 0">読み込み中...</p>';

    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        container.style.display = 'none';
        return;
      }

      let html = '<div class="news-list">';
      data.items.forEach(item => {
        const title = escapeHTML(item.title || '');
        const url   = escapeHTML(item.link  || '#');
        const src   = escapeHTML(item.author || '');
        const date  = formatDate(item.pubDate);

        html += `
          <div class="news-item">
            <a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>
            <span class="source">${src}</span>
            ${date ? `<span style="font-size:11px;color:var(--c-gray-400);white-space:nowrap">${date}</span>` : ''}
          </div>`;
      });
      html += '</div>';
      html += '<p class="news-note">※ 見出しのみ自動取得。記事内容は各メディアの著作物です。</p>';

      container.innerHTML = html;

    } catch (e) {
      // 取得失敗時はセクションごと非表示
      const section = container.closest('section');
      if (section) section.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNews);
  } else {
    loadNews();
  }
})();
