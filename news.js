/* ═══════════════════════════════════════════
   DebtLens — news.js
   ニュースウィジェット（GitHub Actions連動）
   ═══════════════════════════════════════════ */

'use strict';

(function() {
  const NEWS_PATH = 'news.json';
  const MAX_ITEMS = 5;

  async function loadNews() {
    const container = document.getElementById('news-widget');
    if (!container) return;

    try {
      const res = await fetch(NEWS_PATH);
      if (!res.ok) throw new Error('News data not available');
      const data = await res.json();

      const items = (data.articles || []).slice(0, MAX_ITEMS);
      if (items.length === 0) {
        container.style.display = 'none';
        return;
      }

      let html = '<div class="news-list">';
      items.forEach(item => {
        const date = item.date ? `<span style="font-size:11px;color:var(--c-gray-400);white-space:nowrap">${item.date}</span>` : '';
        html += `
          <div class="news-item">
            <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.title)}</a>
            <span class="source">${escapeHTML(item.source || '')}</span>
            ${date}
          </div>`;
      });
      html += '</div>';
      html += '<p class="news-note">※ 見出しのみ自動取得。記事内容は各メディアの著作物です。</p>';

      container.innerHTML = html;
    } catch (e) {
      // ニュースがない場合は静かに非表示
      container.style.display = 'none';
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNews);
  } else {
    loadNews();
  }
})();
