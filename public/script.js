// ---------- Masthead clock ----------
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('tr-TR', { hour12: false });
}
updateClock();
setInterval(updateClock, 1000);
document.getElementById('today').textContent = new Date().toLocaleDateString('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric',
});

// ---------- Decorative ticker tape ----------
const TICKER_SYMBOLS = ['NVDA', 'AAPL', 'TSLA', 'SOFI', 'SMCI', 'AMD', 'MSFT', 'META', 'AMZN', 'INTC', 'GOOGL', 'CRWV'];
const trackEl = document.getElementById('tickerTrack');
function renderTicker() {
  const html = TICKER_SYMBOLS.map((sym) => {
    const dir = Math.random() > 0.5 ? 'up' : 'down';
    const sign = dir === 'up' ? '+' : '−';
    const pct = (Math.random() * 4).toFixed(2);
    return `<span class="ticker__item ticker__item--${dir}">${sym} ${sign}${pct}%</span>`;
  }).join('');
  trackEl.innerHTML = html + html; // duplicate for seamless loop
}
renderTicker();

// ---------- Loading message rotation ----------
const LOADING_MESSAGES = [
  'Güncel fiyat verileri toplanıyor…',
  'Bilanço ve finansal oranlar taranıyor…',
  'Teknik göstergeler hesaplanıyor…',
  'Haberler ve katalizörler değerlendiriliyor…',
  'Risk analizi yapılıyor…',
  'Puanlama ve nihai karar oluşturuluyor…',
];
let loadingInterval = null;
function startLoadingRotation() {
  let i = 0;
  const el = document.getElementById('loadingMsg');
  el.textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    el.textContent = LOADING_MESSAGES[i];
  }, 3200);
}
function stopLoadingRotation() {
  clearInterval(loadingInterval);
}

// ---------- State switching ----------
const states = {
  empty: document.getElementById('emptyState'),
  loading: document.getElementById('loadingState'),
  error: document.getElementById('errorState'),
  result: document.getElementById('resultState'),
};
function showState(name) {
  Object.entries(states).forEach(([key, el]) => el.classList.toggle('hidden', key !== name));
}

// ---------- Decision stamp ----------
function classifyDecision(reportText) {
  const match = reportText.match(/\*\*Karar:\*\*\s*([^\n]+)/i) || reportText.match(/Karar:\s*([^\n]+)/i);
  const raw = match ? match[1].trim() : null;
  if (!raw) return null;

  let cls = 'stamp--hold';
  const lower = raw.toLowerCase();
  if (lower.includes('güçlü al') || (lower.includes('al') && !lower.includes('kademeli') && !lower.includes('riskli') && !lower.includes('sat'))) {
    cls = 'stamp--buy';
  } else if (lower.includes('kademeli al')) {
    cls = 'stamp--buy';
  } else if (lower.includes('riskli al')) {
    cls = 'stamp--hold';
  } else if (lower.includes('sat') || lower.includes('uzak dur')) {
    cls = 'stamp--sell';
  } else if (lower.includes('bekle')) {
    cls = 'stamp--hold';
  }
  return { label: raw, cls };
}

// ---------- Form submit ----------
const form = document.getElementById('analyzeForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const symbol = document.getElementById('symbol').value.trim();
  const vade = document.getElementById('vade').value;
  const risk = document.getElementById('risk').value;
  const tutar = document.getElementById('tutar').value.trim();
  const strateji = document.getElementById('strateji').value;

  if (!symbol) {
    document.getElementById('symbol').focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Analiz ediliyor…';
  showState('loading');
  startLoadingRotation();

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, vade, risk, tutar, strateji }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Bilinmeyen bir hata oluştu.');
    }

    renderResult(data);
    showState('result');
  } catch (err) {
    document.getElementById('errorMsg').textContent = err.message || 'Sunucuya ulaşılamadı.';
    showState('error');
  } finally {
    stopLoadingRotation();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analizi Başlat';
  }
});

function renderResult(data) {
  document.getElementById('resultSymbol').textContent = data.symbol;

  const bodyEl = document.getElementById('reportBody');
  bodyEl.innerHTML = marked.parse(data.report || '');

  const stampWrap = document.getElementById('stampWrap');
  const decision = classifyDecision(data.report || '');
  stampWrap.innerHTML = decision
    ? `<span class="stamp ${decision.cls}">${decision.label}</span>`
    : '';

  const sourcesWrap = document.getElementById('sourcesWrap');
  const sourcesList = document.getElementById('sourcesList');
  if (Array.isArray(data.sources) && data.sources.length) {
    sourcesList.innerHTML = data.sources
      .slice(0, 12)
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a></li>`)
      .join('');
    sourcesWrap.classList.remove('hidden');
  } else {
    sourcesWrap.classList.add('hidden');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
