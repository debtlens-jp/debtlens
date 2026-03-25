/* ═══════════════════════════════════════════
   DebtLens — app.js
   計算エンジン・検索・タブ制御・スライダー同期
   ═══════════════════════════════════════════ */

'use strict';

// ── State ──
const state = {
  rates: null,
  allCompanies: [],
  activeTab: 'ribo',
  multiDebts: [{ id: 1, name: 'カードA', balance: 300000, monthlyPay: 10000, rate: 15.0 }],
  nextDebtId: 2
};

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  await loadRates();
  initTabs();
  initSearch();
  initSliders();
  // Set month input to current month
  const monthInput = document.querySelector('[data-field="start-date"]');
  if (monthInput && !monthInput.value) {
    const now = new Date();
    monthInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }
  calculate();
});

// ── Load Rates ──
async function loadRates() {
  try {
    const res = await fetch('rates.json');
    state.rates = await res.json();
    const cats = state.rates.categories;
    state.allCompanies = [
      ...cats.consumer.companies.map(c => ({ ...c, category: cats.consumer.label })),
      ...cats.credit.companies.map(c => ({ ...c, category: cats.credit.label })),
      ...cats.bank.companies.map(c => ({ ...c, category: cats.bank.label }))
    ];
    // Check data freshness
    const updated = new Date(state.rates.lastUpdated);
    const now = new Date();
    const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      showDataWarning(daysDiff);
    }
    updateLastUpdated();
  } catch (e) {
    console.warn('金利データの読み込みに失敗しました。デフォルト値を使用します。', e);
  }
}

function showDataWarning(days) {
  const banner = document.getElementById('data-warning');
  if (banner) {
    banner.textContent = `⚠ 金利データの最終更新から${days}日が経過しています。最新の金利は各社公式サイトをご確認ください。`;
    banner.style.display = 'block';
  }
}

function updateLastUpdated() {
  const el = document.getElementById('data-updated');
  if (el && state.rates) {
    el.textContent = `金利データ最終更新: ${state.rates.lastUpdated}`;
  }
}

// ── Tab Control ──
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      state.activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = p.id === `panel-${tab}` ? 'block' : 'none';
        if (p.id === `panel-${tab}`) p.classList.add('fade-in');
      });
      calculate();
    });
  });
}

// ── Spotlight Search ──
function initSearch() {
  document.querySelectorAll('.company-search').forEach(wrap => {
    const input = wrap.querySelector('input');
    const dropdown = wrap.querySelector('.search-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      if (!q) { dropdown.style.display = 'none'; return; }
      const results = state.allCompanies.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
      if (results.length === 0) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = results.map(c =>
        `<button class="search-item" data-rate="${c.rate}" data-name="${c.name}">
          <span>${c.name} <small style="color:var(--c-gray-400)">${c.category}</small></span>
          <span class="rate">年率 ${c.rate}%</span>
        </button>`
      ).join('');
      dropdown.style.display = 'block';
      dropdown.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const rate = parseFloat(item.dataset.rate);
          input.value = item.dataset.name;
          dropdown.style.display = 'none';
          // Set the rate input in the same panel
          const panel = wrap.closest('.tab-panel');
          const rateInput = panel?.querySelector('[data-field="rate"]');
          const rateSlider = panel?.querySelector('[data-slider="rate"]');
          if (rateInput) { rateInput.value = rate; }
          if (rateSlider) { rateSlider.value = rate; }
          calculate();
        });
      });
    });

    input.addEventListener('focus', () => { if (input.value) input.dispatchEvent(new Event('input')); });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) dropdown.style.display = 'none';
    });
  });
}

// ── Slider Sync ──
function initSliders() {
  document.querySelectorAll('[data-slider]').forEach(slider => {
    const field = slider.dataset.slider;
    const panel = slider.closest('.tab-panel') || document;
    const input = panel.querySelector(`[data-field="${field}"]`);
    if (!input) return;

    slider.addEventListener('input', () => { input.value = slider.value; calculate(); });
    input.addEventListener('input', () => {
      const v = Math.min(parseFloat(slider.max), Math.max(parseFloat(slider.min), parseFloat(input.value) || 0));
      slider.value = v;
      calculate();
    });
  });
}

// ── Calculation Engine ──
function calcRiboGanriTeigaku(balance, monthlyPay, annualRate, startDate) {
  const mr = annualRate / 100 / 12;
  let b = balance;
  const history = [{ month: 0, balance: b, interest: 0, principal: 0 }];
  let totalInterest = 0, month = 0;
  if (monthlyPay <= b * mr) return { history, totalInterest, months: Infinity, error: '月々の返済額が利息以下です' };
  while (b > 0 && month < 1200) {
    month++;
    const interest = Math.round(b * mr);
    const principal = Math.min(b, monthlyPay - interest);
    b = Math.max(0, b - principal);
    totalInterest += interest;
    history.push({ month, balance: b, interest, principal });
    if (b <= 0) break;
  }
  return { history, totalInterest, months: month };
}

function calcRiboGankinTeigaku(balance, monthlyPrincipal, annualRate) {
  const mr = annualRate / 100 / 12;
  let b = balance;
  const history = [{ month: 0, balance: b, interest: 0, principal: 0, payment: 0 }];
  let totalInterest = 0, month = 0;
  while (b > 0 && month < 1200) {
    month++;
    const interest = Math.round(b * mr);
    const principal = Math.min(b, monthlyPrincipal);
    b = Math.max(0, b - principal);
    totalInterest += interest;
    history.push({ month, balance: b, interest, principal, payment: principal + interest });
    if (b <= 0) break;
  }
  return { history, totalInterest, months: month };
}

function calcRiboZandakaSlide(balance, annualRate) {
  const mr = annualRate / 100 / 12;
  let b = balance;
  const history = [{ month: 0, balance: b, interest: 0, principal: 0, payment: 0 }];
  let totalInterest = 0, month = 0;
  const getMin = (bal) => {
    if (bal <= 100000) return 5000;
    if (bal <= 200000) return 10000;
    if (bal <= 300000) return 15000;
    if (bal <= 500000) return 20000;
    if (bal <= 1000000) return 30000;
    return 50000;
  };
  while (b > 0 && month < 1200) {
    month++;
    const interest = Math.round(b * mr);
    const payment = Math.max(getMin(b), interest + 1000);
    const principal = Math.min(b, payment - interest);
    b = Math.max(0, b - principal);
    totalInterest += interest;
    history.push({ month, balance: b, interest, principal, payment });
    if (b <= 0) break;
  }
  return { history, totalInterest, months: month };
}

function calcInstallment(amount, n, annualRate) {
  const mr = annualRate / 100 / 12;
  const mp = n <= 1 ? amount : Math.round((amount * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1));
  return { monthlyPay: mp, totalPay: mp * n, totalFee: mp * n - amount, installments: n };
}

function calcReverse(balance, annualRate, targetMonths) {
  const mr = annualRate / 100 / 12;
  if (targetMonths <= 0) return 0;
  if (mr === 0) return Math.ceil(balance / targetMonths);
  return Math.ceil((balance * mr * Math.pow(1 + mr, targetMonths)) / (Math.pow(1 + mr, targetMonths) - 1));
}

// ── Main Calculate ──
function calculate() {
  switch (state.activeTab) {
    case 'ribo': calcRiboPanel(); break;
    case 'installment': calcInstallmentPanel(); break;
    case 'compare': calcComparePanel(); break;
    case 'bnpl': calcBNPLPanel(); break;
    case 'multi': calcMultiPanel(); break;
  }
}

function getVal(sel, panel) {
  const root = panel ? document.getElementById(`panel-${panel}`) : document;
  const el = root?.querySelector(sel);
  return el ? parseFloat(el.value) || 0 : 0;
}

function setText(sel, text, panel) {
  const root = panel ? document.getElementById(`panel-${panel}`) : document;
  const el = root?.querySelector(sel);
  if (el) el.textContent = text;
}

function setHTML(sel, html, panel) {
  const root = panel ? document.getElementById(`panel-${panel}`) : document;
  const el = root?.querySelector(sel);
  if (el) el.innerHTML = html;
}

// ── Panel Calculations ──
function calcRiboPanel() {
  const p = 'ribo';
  const balance = getVal('[data-field="balance"]', p);
  const monthly = getVal('[data-field="monthly"]', p);
  const rate = getVal('[data-field="rate"]', p);
  const method = document.querySelector('#panel-ribo .seg-btn.active')?.dataset.method || 'ganri';
  const startMonth = document.querySelector('#panel-ribo [data-field="start-date"]')?.value || '';

  let result;
  if (method === 'ganri') result = calcRiboGanriTeigaku(balance, monthly, rate);
  else if (method === 'gankin') result = calcRiboGankinTeigaku(balance, monthly, rate);
  else result = calcRiboZandakaSlide(balance, rate);

  if (result.error) {
    setHTML('.ribo-results', `
      <div class="box box-red"><div class="box-title">⚠ ${result.error}</div>
      <p style="font-size:13px;color:var(--c-gray-500);margin:0">月々の返済額を増やしてください。利息だけで残高が減りません。</p></div>
    `, p);
    return;
  }

  let completionStr = '';
  if (startMonth) {
    const d = new Date(startMonth + '-01');
    d.setMonth(d.getMonth() + result.months);
    completionStr = `${d.getFullYear()}年${d.getMonth() + 1}月 完済予定`;
  }

  const warnClass = result.totalInterest > balance * 0.5 ? 'warn' : '';

  setHTML('.ribo-results', `
    <div class="result-grid mb-16">
      <div class="result-card accent">
        <div class="label">完済までの期間</div>
        <div class="value">${result.months}ヶ月</div>
        ${completionStr ? `<div class="sub">${completionStr}</div>` : ''}
      </div>
      <div class="result-card ${warnClass}">
        <div class="label">利息の合計</div>
        <div class="value">¥${result.totalInterest.toLocaleString()}</div>
      </div>
      <div class="result-card">
        <div class="label">総支払額</div>
        <div class="value">¥${(balance + result.totalInterest).toLocaleString()}</div>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-title">残高推移</div>
      <canvas id="ribo-chart" height="200"></canvas>
    </div>
  `, p);

  drawBalanceChart('ribo-chart', result.history);

  // Add diagnosis
  const diagnosisHTML = generateDiagnosis(balance, monthly, rate, result);
  const diagContainer = document.querySelector('#panel-ribo .ribo-results');
  if (diagContainer && diagnosisHTML) {
    diagContainer.insertAdjacentHTML('beforeend', diagnosisHTML);
  }
}

function calcInstallmentPanel() {
  const p = 'installment';
  const amount = getVal('[data-field="amount"]', p);
  const rate = getVal('[data-field="rate"]', p);
  const plans = [3, 6, 10, 12, 15, 18, 20, 24, 36].map(n => calcInstallment(amount, n, rate));

  let rows = plans.map(pl => `
    <tr>
      <td style="font-weight:600">${pl.installments}回</td>
      <td style="text-align:right">¥${pl.monthlyPay.toLocaleString()}</td>
      <td style="text-align:right;color:${pl.totalFee > amount * 0.2 ? 'var(--c-red-600)' : 'var(--c-gray-500)'}">¥${pl.totalFee.toLocaleString()}</td>
      <td style="text-align:right;font-weight:500">¥${pl.totalPay.toLocaleString()}</td>
    </tr>
  `).join('');

  setHTML('.installment-results', `
    <div class="table-wrap">
      <table>
        <thead><tr><th>回数</th><th style="text-align:right">月々の支払い</th><th style="text-align:right">手数料合計</th><th style="text-align:right">総支払額</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `, p);
}

function calcComparePanel() {
  const p = 'compare';
  const amount = getVal('[data-field="amount"]', p);
  const riboMonthly = getVal('[data-field="ribo-monthly"]', p);
  const installments = getVal('[data-field="installments"]', p);
  const rate = getVal('[data-field="rate"]', p);

  const ribo = calcRiboGanriTeigaku(amount, riboMonthly, rate);
  const inst = calcInstallment(amount, installments, rate);

  const riboHTML = ribo.error
    ? `<div style="color:var(--c-red-600);font-size:12px">⚠ ${ribo.error}</div>`
    : `<div class="text-muted" style="font-size:11px">完済期間</div>
       <div style="font-size:18px;font-weight:700">${ribo.months}ヶ月</div>
       <div class="text-muted" style="font-size:11px;margin-top:8px">利息合計</div>
       <div style="font-size:16px;font-weight:700;color:${ribo.totalInterest > inst.totalFee ? 'var(--c-red-600)' : 'var(--c-green-600)'}">¥${ribo.totalInterest.toLocaleString()}</div>
       <div class="text-muted" style="font-size:11px;margin-top:8px">総支払額</div>
       <div style="font-size:14px;font-weight:600">¥${(amount + ribo.totalInterest).toLocaleString()}</div>`;

  const diff = ribo.error ? 0 : Math.abs(ribo.totalInterest - inst.totalFee);
  const diffText = ribo.error ? '' : (ribo.totalInterest > inst.totalFee
    ? 'この条件では分割払いのほうが手数料が少なくなります'
    : 'この条件ではリボ払いのほうが利息が少なくなります');

  setHTML('.compare-results', `
    <div class="vs-grid">
      <div style="background:#fff;border-radius:var(--radius);padding:16px;border:1px solid var(--c-gray-200)">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">🔄 リボ払い</div>${riboHTML}
      </div>
      <div style="background:#fff;border-radius:var(--radius);padding:16px;border:1px solid var(--c-gray-200)">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">📅 分割払い</div>
        <div class="text-muted" style="font-size:11px">支払回数</div>
        <div style="font-size:18px;font-weight:700">${installments}回</div>
        <div class="text-muted" style="font-size:11px;margin-top:8px">手数料合計</div>
        <div style="font-size:16px;font-weight:700;color:${!ribo.error && inst.totalFee > ribo.totalInterest ? 'var(--c-red-600)' : 'var(--c-green-600)'}">¥${inst.totalFee.toLocaleString()}</div>
        <div class="text-muted" style="font-size:11px;margin-top:8px">総支払額</div>
        <div style="font-size:14px;font-weight:600">¥${inst.totalPay.toLocaleString()}</div>
      </div>
    </div>
    ${!ribo.error ? `<div class="box box-gray">
      <div style="font-size:12px;font-weight:600;margin-bottom:4px">計算上の差額</div>
      <div style="font-size:18px;font-weight:700;color:var(--c-green-500)">¥${diff.toLocaleString()}</div>
      <div style="font-size:11px;color:var(--c-gray-500);margin-top:4px">${diffText}</div>
    </div>` : ''}
  `, p);
}

function calcBNPLPanel() {
  const p = 'bnpl';
  const amount = getVal('[data-field="amount"]', p);
  const service = document.querySelector('#panel-bnpl .seg-btn.active')?.dataset.service || 'paidy6';

  let html = '';
  if (service === 'paidy6' || service === 'paidy12') {
    const months = service === 'paidy6' ? 6 : 12;
    const mFee = Math.round(amount * 0.035);
    const tFee = mFee * months;
    const mp = Math.round(amount / months) + mFee;
    html = `
      <div class="result-grid mb-16">
        <div class="result-card"><div class="label">支払い期間</div><div class="value">${months}ヶ月</div></div>
        <div class="result-card ${tFee > amount * 0.2 ? 'warn' : ''}"><div class="label">手数料合計</div><div class="value">¥${tFee.toLocaleString()}</div></div>
        <div class="result-card"><div class="label">総支払額</div><div class="value">¥${(amount + tFee).toLocaleString()}</div></div>
      </div>
      <div class="box box-yellow">
        <div class="box-title">Paidy手数料の構造</div>
        <p style="font-size:13px;margin:0">月あたり手数料: ¥${mFee.toLocaleString()}（元金の3.5%/月）<br>
        単純年換算: 約42%（参考値。分割手数料のため実質年率とは異なります）</p>
      </div>`;
  } else if (service === 'paidy1') {
    html = `
      <div class="result-grid">
        <div class="result-card accent"><div class="label">支払い期間</div><div class="value">翌月</div></div>
        <div class="result-card accent"><div class="label">手数料</div><div class="value">¥0</div></div>
        <div class="result-card"><div class="label">総支払額</div><div class="value">¥${amount.toLocaleString()}</div></div>
      </div>
      <div class="box box-green"><div class="box-title">💡 翌月一括は手数料無料</div>
      <p style="font-size:13px;margin:0">支払えるなら翌月一括がもっともお得です。</p></div>`;
  } else {
    const mp = Math.max(1000, Math.round(amount / 24));
    const r = calcRiboGanriTeigaku(amount, mp, 15.0);
    html = `
      <div class="result-grid mb-16">
        <div class="result-card"><div class="label">月額設定</div><div class="value">¥${mp.toLocaleString()}</div></div>
        <div class="result-card"><div class="label">完済期間</div><div class="value">${r.months}ヶ月</div></div>
        <div class="result-card ${r.totalInterest > amount * 0.2 ? 'warn' : ''}"><div class="label">利息合計</div><div class="value">¥${r.totalInterest.toLocaleString()}</div></div>
      </div>
      <div class="box box-red"><div class="box-title">⚠ メルペイ定額払い = リボ払い</div>
      <p style="font-size:13px;margin:0">年率15.0%のリボルビング方式です。月額設定を上げると利息を抑えられます。</p></div>`;
  }
  setHTML('.bnpl-results', html, p);
}

function calcMultiPanel() {
  const container = document.getElementById('multi-debts');
  if (!container) return;

  let totalBal = 0, totalMon = 0, totalInt = 0, maxMon = 0;
  state.multiDebts.forEach(d => {
    const r = calcRiboGanriTeigaku(d.balance, d.monthlyPay, d.rate);
    totalBal += d.balance;
    totalMon += d.monthlyPay;
    if (!r.error) { totalInt += r.totalInterest; maxMon = Math.max(maxMon, r.months); }
  });

  setText('.multi-total-balance', `¥${totalBal.toLocaleString()}`, 'multi');
  setText('.multi-total-monthly', `¥${totalMon.toLocaleString()}`, 'multi');
  setText('.multi-total-interest', `¥${totalInt.toLocaleString()}`, 'multi');
  setText('.multi-total-months', `${maxMon}ヶ月`, 'multi');
}

// ── SVG Balance Chart (Canvas fallback) ──
function drawBalanceChart(canvasId, history) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.parentElement.clientWidth - 32;
  const h = 180;
  canvas.width = w * 2; canvas.height = h * 2;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(2, 2);

  const maxBal = history[0].balance;
  const pad = { t: 10, r: 10, b: 30, l: 50 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  // Grid
  ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
  }

  // Area
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + ch);
  history.forEach((d, i) => {
    const x = pad.l + (i / (history.length - 1)) * cw;
    const y = pad.t + ch - (d.balance / maxBal) * ch;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + cw, pad.t + ch);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(34,197,94,0.25)');
  grad.addColorStop(1, 'rgba(34,197,94,0.02)');
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  history.forEach((d, i) => {
    const x = pad.l + (i / (history.length - 1)) * cw;
    const y = pad.t + ch - (d.balance / maxBal) * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#aaa'; ctx.font = '10px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`¥${maxBal.toLocaleString()}`, pad.l - 4, pad.t + 10);
  ctx.fillText('¥0', pad.l - 4, pad.t + ch + 4);
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(history.length / 5));
  for (let i = 0; i < history.length; i += step) {
    const x = pad.l + (i / (history.length - 1)) * cw;
    ctx.fillText(`${history[i].month}月`, x, h - 6);
  }
  const lastX = pad.l + cw;
  ctx.fillText(`${history[history.length - 1].month}月`, lastX, h - 6);
}

// ── Multi Debt Management ──
function addDebt() {
  state.multiDebts.push({ id: state.nextDebtId++, name: `借入${state.multiDebts.length + 1}`, balance: 100000, monthlyPay: 5000, rate: 15.0 });
  renderMultiDebts();
  calcMultiPanel();
}

function removeDebt(id) {
  if (state.multiDebts.length <= 1) return;
  state.multiDebts = state.multiDebts.filter(d => d.id !== id);
  renderMultiDebts();
  calcMultiPanel();
}

function updateDebt(id, field, value) {
  const d = state.multiDebts.find(d => d.id === id);
  if (d) { d[field] = typeof value === 'string' ? value : parseFloat(value) || 0; }
  calcMultiPanel();
}

function renderMultiDebts() {
  const container = document.getElementById('multi-debts');
  if (!container) return;
  container.innerHTML = state.multiDebts.map(d => {
    const r = calcRiboGanriTeigaku(d.balance, d.monthlyPay, d.rate);
    const info = r.error
      ? `<span style="color:var(--c-red-600);font-size:12px">⚠ ${r.error}</span>`
      : `<span class="text-muted" style="font-size:12px">完済: <strong>${r.months}ヶ月</strong> ／ 利息: <strong class="text-red">¥${r.totalInterest.toLocaleString()}</strong></span>`;
    return `
      <div class="debt-card" style="background:#fff;border-radius:var(--radius);padding:14px;border:1px solid var(--c-gray-200);margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <input value="${d.name}" onchange="updateDebt(${d.id},'name',this.value)" style="font-size:14px;font-weight:600;border:none;background:transparent;outline:none;color:var(--c-gray-800)">
          ${state.multiDebts.length > 1 ? `<button onclick="removeDebt(${d.id})" style="background:none;border:none;cursor:pointer;font-size:16px;color:#ccc">✕</button>` : ''}
        </div>
        <div class="grid-3">
          <div><label style="font-size:11px;color:var(--c-gray-500)">残高</label>
            <input type="number" value="${d.balance}" step="10000" oninput="updateDebt(${d.id},'balance',this.value)" class="num-input" style="width:100%;text-align:left;margin-top:4px"></div>
          <div><label style="font-size:11px;color:var(--c-gray-500)">月額返済</label>
            <input type="number" value="${d.monthlyPay}" step="1000" oninput="updateDebt(${d.id},'monthlyPay',this.value)" class="num-input" style="width:100%;text-align:left;margin-top:4px"></div>
          <div><label style="font-size:11px;color:var(--c-gray-500)">年率(%)</label>
            <input type="number" value="${d.rate}" step="0.1" oninput="updateDebt(${d.id},'rate',this.value)" class="num-input" style="width:100%;text-align:left;margin-top:4px"></div>
        </div>
        <div style="margin-top:10px">${info}</div>
      </div>`;
  }).join('');
}

// ── Reverse Calc ──
function toggleReverse() {
  const el = document.getElementById('reverse-section');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function calcReversePay() {
  const balance = getVal('[data-field="balance"]', 'ribo');
  const rate = getVal('[data-field="rate"]', 'ribo');
  const target = getVal('#reverse-months', null) || 24;
  const pay = calcReverse(balance, rate, target);
  const el = document.getElementById('reverse-result');
  if (el) el.textContent = `必要な月額返済: ¥${pay.toLocaleString()}`;
}

// ── Company Dropdown Functions ──
function filterCompanyDropdown(categorySelect) {
  const panel = categorySelect.closest('.tab-panel') || document;
  const nameSelect = panel.querySelector('[data-field="company-name"]');
  if (!nameSelect) return;

  const category = categorySelect.value;
  nameSelect.innerHTML = '<option value="">会社を選択</option>';

  // Clear rate badge
  const selector = categorySelect.closest('.company-selector');
  const display = selector ? selector.querySelector('.selected-rate-display') : null;
  if (display) display.innerHTML = '';

  if (!category || !state.rates) return;

  const cats = state.rates.categories;
  const companies = cats[category] ? cats[category].companies : [];

  companies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.rate;
    opt.textContent = `${c.name}（年率 ${c.rate}%）`;
    nameSelect.appendChild(opt);
  });
}

function selectCompanyFromDropdown(nameSelect) {
  const rate = parseFloat(nameSelect.value);
  if (isNaN(rate)) return;

  const panel = nameSelect.closest('.tab-panel');
  if (!panel) return;

  const rateInput = panel.querySelector('[data-field="rate"]');
  const rateSlider = panel.querySelector('[data-slider="rate"]');
  if (rateInput) rateInput.value = rate;
  if (rateSlider) rateSlider.value = rate;

  // Show rate badge
  const selector = nameSelect.closest('.company-selector');
  const display = selector ? selector.querySelector('.selected-rate-display') : null;
  const companyName = nameSelect.options[nameSelect.selectedIndex].text.split('（')[0];
  if (display) {
    display.innerHTML = '<span class="selected-rate-badge">✓ ' + companyName + '　年率 <span class="rate-num">' + rate + '</span>%</span>';
  }

  calculate();
}

// ── Override chart height for PC ──
(function() {
  const origDraw = drawBalanceChart;
  drawBalanceChart = function(canvasId, history) {
    origDraw(canvasId, history);
    // After drawing, apply responsive height
    const canvas = document.getElementById(canvasId);
    if (canvas && window.innerWidth >= 768) {
      const w = canvas.parentElement.clientWidth - 48;
      const h = 340;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      // Redraw with new dimensions
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);

      const maxBal = history[0].balance;
      const pad = { t: 16, r: 16, b: 36, l: 60 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const y = pad.t + (ch / 5) * i;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
        // Y-axis labels
        const val = maxBal - (maxBal / 5) * i;
        ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
        ctx.fillText('¥' + Math.round(val).toLocaleString(), pad.l - 8, y + 4);
      }

      // Area fill
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t + ch);
      history.forEach((d, i) => {
        const x = pad.l + (i / (history.length - 1)) * cw;
        const y = pad.t + ch - (d.balance / maxBal) * ch;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(pad.l + cw, pad.t + ch);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
      grad.addColorStop(0, 'rgba(34,197,94,0.25)');
      grad.addColorStop(1, 'rgba(34,197,94,0.02)');
      ctx.fillStyle = grad; ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      history.forEach((d, i) => {
        const x = pad.l + (i / (history.length - 1)) * cw;
        const y = pad.t + ch - (d.balance / maxBal) * ch;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots and labels
      const step = Math.max(1, Math.floor(history.length / 6));
      ctx.fillStyle = '#aaa'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
      for (let i = 0; i < history.length; i += step) {
        const x = pad.l + (i / (history.length - 1)) * cw;
        const y = pad.t + ch - (history[i].balance / maxBal) * ch;
        // Dot
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#22c55e'; ctx.fill();
        // Month label
        ctx.fillStyle = '#aaa';
        ctx.fillText(history[i].month + '月', x, h - 8);
      }
      // Last point
      const lastX = pad.l + cw;
      const lastY = pad.t + ch - (history[history.length - 1].balance / maxBal) * ch;
      ctx.beginPath(); ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#22c55e'; ctx.fill();
      ctx.fillStyle = '#aaa';
      ctx.fillText(history[history.length - 1].month + '月', lastX, h - 8);
    }
  };
})();




// ── SNS Share Function ──
function shareResult() {
  const panel = document.getElementById('panel-ribo');
  if (!panel) return;
  const balance = getVal('[data-field="balance"]', 'ribo');
  const monthly = getVal('[data-field="monthly"]', 'ribo');
  const rate = getVal('[data-field="rate"]', 'ribo');
  const result = calcRiboGanriTeigaku(balance, monthly, rate);
  if (result.error) return;

  const text = `リボ残高 ¥${balance.toLocaleString()}（年率${rate}%）月${monthly.toLocaleString()}円返済\n→ 完済まで${result.months}ヶ月、利息合計 ¥${result.totalInterest.toLocaleString()}\n\nDebtLensで計算 👇`;
  const url = 'https://debtlens-jp.github.io/debtlens/';

  if (navigator.share) {
    navigator.share({ title: 'DebtLens 計算結果', text: text, url: url }).catch(() => {});
  } else {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  }
}

// ── Save Result as Image ──
function saveResultImage() {
  const panel = document.getElementById('panel-ribo');
  if (!panel) return;
  const balance = getVal('[data-field="balance"]', 'ribo');
  const monthly = getVal('[data-field="monthly"]', 'ribo');
  const rate = getVal('[data-field="rate"]', 'ribo');
  const result = calcRiboGanriTeigaku(balance, monthly, rate);
  if (result.error) return;

  const canvas = document.createElement('canvas');
  const w = 600, h = 400;
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#0c0f1a';
  ctx.fillRect(0, 0, w, h);

  // Green accent bar
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#059669'); grad.addColorStop(1, '#10b981');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, 4);

  // Title
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui';
  ctx.fillText('DebtLens 計算結果', 24, 40);

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(24, 56, w - 48, 1);

  // Input info
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px system-ui';
  ctx.fillText(`利用残高: ¥${balance.toLocaleString()}　年率: ${rate}%　月額返済: ¥${monthly.toLocaleString()}`, 24, 82);

  // Results
  const cards = [
    { label: '完済まで', value: `${result.months}ヶ月`, color: '#34d399', x: 24 },
    { label: '利息合計', value: `¥${result.totalInterest.toLocaleString()}`, color: result.totalInterest > balance * 0.5 ? '#f87171' : '#fff', x: 214 },
    { label: '総支払額', value: `¥${(balance + result.totalInterest).toLocaleString()}`, color: '#fff', x: 404 }
  ];

  cards.forEach(card => {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(card.x, 100, 170, 80, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '11px system-ui';
    ctx.fillText(card.label, card.x + 14, 124);
    ctx.fillStyle = card.color; ctx.font = 'bold 22px system-ui';
    ctx.fillText(card.value, card.x + 14, 158);
  });

  // Mini chart
  const chartY = 200, chartH = 150, chartW = w - 48;
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath(); ctx.roundRect(24, chartY, chartW, chartH + 20, 12); ctx.fill();

  const maxBal = result.history[0].balance;
  ctx.beginPath();
  result.history.forEach((d, i) => {
    const x = 36 + (i / (result.history.length - 1)) * (chartW - 24);
    const y = chartY + 10 + chartH - (d.balance / maxBal) * chartH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.stroke();

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '11px system-ui';
  ctx.fillText('debtlens-jp.github.io/debtlens', 24, h - 16);
  ctx.fillText('※ 概算値です。実際の金利は各社規約をご確認ください。', w - 340, h - 16);

  // Download
  const link = document.createElement('a');
  link.download = 'debtlens-result.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── Dark Mode Toggle ──
function toggleDarkMode() {
  const html = document.documentElement;
  const btn = document.getElementById('dark-toggle');
  if (html.getAttribute('data-theme') === 'dark') {
    html.removeAttribute('data-theme');
    if (btn) btn.textContent = '🌙';
    try { localStorage.setItem('debtlens-theme', 'light'); } catch(e) {}
  } else {
    html.setAttribute('data-theme', 'dark');
    if (btn) btn.textContent = '☀️';
    try { localStorage.setItem('debtlens-theme', 'dark'); } catch(e) {}
  }
}
// Auto-apply saved theme
(function() {
  try {
    const saved = localStorage.getItem('debtlens-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      setTimeout(() => {
        const btn = document.getElementById('dark-toggle');
        if (btn) btn.textContent = '☀️';
      }, 0);
    }
  } catch(e) {}
})();

// ── Result Diagnosis (CTA Generator) ──
function generateDiagnosis(balance, monthlyPay, rate, result) {
  if (result.error) return '';
  
  const interestRatio = result.totalInterest / balance;
  const months = result.months;
  let level = 'safe'; // safe / caution / warning / danger
  let messages = [];
  let ctaType = 'none'; // none / fp / fp-strong

  // Determine severity level
  if (months > 60 || interestRatio > 0.8) {
    level = 'danger';
    messages.push('完済まで5年以上、または利息が元金の80%を超えています。早急な対策が必要です。');
    ctaType = 'fp-strong';
  } else if (months > 36 || interestRatio > 0.5) {
    level = 'warning';
    messages.push('利息の負担が大きい状態です。返済額の見直しで大幅に改善できる可能性があります。');
    ctaType = 'fp';
  } else if (months > 24 || interestRatio > 0.3) {
    level = 'caution';
    messages.push('計画的に返済できていますが、繰上返済でさらに利息を抑えられます。');
    ctaType = 'fp';
  } else {
    level = 'safe';
    messages.push('比較的短期間で完済できる見込みです。');
    ctaType = 'none';
  }

  // Additional specific advice
  if (monthlyPay <= balance * (rate / 100 / 12) * 1.5) {
    messages.push('月々の返済額の多くが利息に消えています。可能なら返済額の増額を検討してください。');
  }
  if (balance >= 500000) {
    messages.push('残高が50万円を超えています。おまとめローンによる金利引き下げも選択肢の一つです。');
  }

  const colors = { safe: '#22c55e', caution: '#f59e0b', warning: '#f97316', danger: '#ef4444' };
  const labels = { safe: '✅ 安全圏', caution: '💡 改善の余地あり', warning: '⚠️ 要注意', danger: '🚨 要対策' };
  const bgColors = { safe: 'rgba(34,197,94,0.06)', caution: 'rgba(245,158,11,0.06)', warning: 'rgba(249,115,22,0.06)', danger: 'rgba(239,68,68,0.06)' };
  const borderColors = { safe: 'rgba(34,197,94,0.15)', caution: 'rgba(245,158,11,0.15)', warning: 'rgba(249,115,22,0.15)', danger: 'rgba(239,68,68,0.15)' };

  let html = `<div class="diagnosis-card" style="background:${bgColors[level]};border:1px solid ${borderColors[level]};border-radius:16px;padding:18px 20px;margin-top:16px">`;
  html += `<div style="font-size:14px;font-weight:700;color:${colors[level]};margin-bottom:8px">${labels[level]}</div>`;
  messages.forEach(m => {
    html += `<p style="font-size:13px;color:var(--c-gray-600);margin:4px 0;line-height:1.7">${m}</p>`;
  });

  // CTA based on diagnosis
  if (ctaType === 'fp-strong') {
    html += `<div style="margin-top:14px;padding:14px 16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px">`;
    html += `<p style="font-size:13px;font-weight:600;color:#ef4444;margin:0 0 8px">返済計画の見直しを専門家（FP）に無料で相談できます</p>`;
    html += `<p style="font-size:11px;color:var(--c-gray-500);margin:0">【広告】以下はアフィリエイトリンクです</p>`;
    html += `<a href="https://px.a8.net/svt/ejp?a8mat=4AZLSJ+DT4YWI+20NK+63WO2" rel="sponsored nofollow" class="cta-btn" style="display:inline-block;margin-top:10px;padding:10px 24px;background:#ef4444;color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">無料でFPに相談する →</a>`;
    html += `</div>`;
  } else if (ctaType === 'fp') {
    html += `<div style="margin-top:14px;padding:14px 16px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:12px">`;
    html += `<p style="font-size:13px;color:var(--c-gray-600);margin:0 0 8px">お金のプロ（FP）に家計全体の見直しを無料相談できます</p>`;
    html += `<p style="font-size:11px;color:var(--c-gray-500);margin:0">【広告】以下はアフィリエイトリンクです</p>`;
    html += `<a href="https://px.a8.net/svt/ejp?a8mat=4AZLSJ+DT4YWI+20NK+63WO2" rel="sponsored nofollow" class="cta-btn" style="display:inline-block;margin-top:10px;padding:10px 24px;background:var(--c-green-500);color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">FPに無料相談する →</a>`;
    html += `</div>`;
  }

  html += '</div>';
  return html;
}
