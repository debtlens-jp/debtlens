/* ═══════════════════════════════════════════
   DebtLens — news.js
   ニュースウィジェット（静的コンテンツ表示）
   ═══════════════════════════════════════════ */

'use strict';

(function () {
  const MAX_ITEMS = 5;

  // 外部APIが不安定なため、DebtLens関連記事を静的表示
  const STATIC_ITEMS = [
    {
      title: 'リボ地獄から抜け出す5つの方法',
      url: 'https://debtlens-jp.github.io/debtlens/ribo-jigoku.html',
      source: 'DebtLens コラム'
    },
    {
      title: '多重債務の返済戦略｜雪だるま方式と雪崩方式の比較',
      url: 'https://debtlens-jp.github.io/debtlens/tasaju-saimu.html',
      source: 'DebtLens コラム'
    },
    {
      title: 'Paidy・メルペイ後払いの手数料を実数値で解説',
      url: 'https://debtlens-jp.github.io/debtlens/bnpl-chuiten.html',
      source: 'DebtLens コラム'
    },
    {
      title: '繰上返済のコツ｜少額でも早く返す効果を計算で確認',
      url: 'https://debtlens-jp.github.io/debtlens/kuriage-hensai.html',
      source: 'DebtLens コラム'
    },
    {
      title: '借入診断チェックリスト｜あなたの返済状況は安全？',
      url: 'https://debtlens-jp.github.io/debtlens/shindan.html',
      source: 'DebtLens コラム'
    }
  ];

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function renderItems(items, container) {
    let html = '<div class="news-list">';
    items.slice(0, MAX_ITEMS).forEach(item => {
      html += `
        <div class="news-item">
          <a href="${escapeHTML(item.url)}" rel="noopener">${escapeHTML(item.title)}</a>
          <span class="source">${escapeHTML(item.source)}</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function loadNews() {
    const container = document.getElementById('news-widget');
    if (!container) return;

    // セクションのタイトルを「関連コラム」に変更
    const section = container.closest('section');
    if (section) {
      const h2 = section.querySelector('h2');
      if (h2) h2.textContent = '📚 関連コラム・ガイド';
    }

    renderItems(STATIC_ITEMS, container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNews);
  } else {
    loadNews();
  }
})();
