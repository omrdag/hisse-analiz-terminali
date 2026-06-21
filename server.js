require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '[UYARI] ANTHROPIC_API_KEY tanımlı değil. .env dosyasına anahtarınızı ekleyin (.env.example dosyasına bakın).'
  );
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'system_prompt.txt'),
  'utf-8'
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const VADE_OPTIONS = ['Kısa', 'Orta', 'Uzun'];
const RISK_OPTIONS = ['Düşük', 'Orta', 'Yüksek'];
const STRATEJI_OPTIONS = ['Trade', 'Swing trade', 'Orta vade', 'Uzun vade'];

function buildUserMessage({ symbol, vade, risk, tutar, strateji }) {
  return [
    `Hisse: ${symbol}`,
    `Vade: ${vade}`,
    `Risk profili: ${risk}`,
    `Yatırım tutarı: ${tutar}`,
    `Strateji: ${strateji}`,
    '',
    'Yukarıdaki sistem promptunda tanımlanan 14 maddelik analiz çerçevesini eksiksiz uygula. Güncel veri toplamak için web aramasını aktif olarak kullan.',
  ].join('\n');
}

function extractSources(content) {
  const seen = new Map();

  for (const block of content) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const item of block.content) {
        if (item.url) {
          seen.set(item.url, item.title || item.url);
        }
      }
    }
    if (block.type === 'text' && Array.isArray(block.citations)) {
      for (const c of block.citations) {
        if (c.url) seen.set(c.url, c.title || c.url);
      }
    }
  }

  return Array.from(seen, ([url, title]) => ({ url, title }));
}

function extractText(content) {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { symbol, vade, risk, tutar, strateji } = req.body || {};

    if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
      return res.status(400).json({ error: 'Geçerli bir hisse sembolü girin (örn. NVDA).' });
    }
    if (!VADE_OPTIONS.includes(vade)) {
      return res.status(400).json({ error: 'Geçersiz vade seçimi.' });
    }
    if (!RISK_OPTIONS.includes(risk)) {
      return res.status(400).json({ error: 'Geçersiz risk profili.' });
    }
    if (!STRATEJI_OPTIONS.includes(strateji)) {
      return res.status(400).json({ error: 'Geçersiz strateji seçimi.' });
    }
    if (!tutar || typeof tutar !== 'string' || !tutar.trim()) {
      return res.status(400).json({ error: 'Geçerli bir yatırım tutarı girin.' });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Sunucuda ANTHROPIC_API_KEY tanımlı değil. README dosyasındaki kurulum adımlarını izleyin.',
      });
    }

    const cleanSymbol = symbol.trim().toUpperCase().slice(0, 12);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 12,
        },
      ],
      messages: [
        {
          role: 'user',
          content: buildUserMessage({
            symbol: cleanSymbol,
            vade,
            risk,
            tutar: tutar.trim(),
            strateji,
          }),
        },
      ],
    });

    const reportMarkdown = extractText(response.content);
    const sources = extractSources(response.content);

    if (!reportMarkdown.trim()) {
      return res.status(502).json({ error: 'Model boş bir yanıt döndürdü. Lütfen tekrar deneyin.' });
    }

    return res.json({
      symbol: cleanSymbol,
      report: reportMarkdown,
      sources,
      stopReason: response.stop_reason,
    });
  } catch (err) {
    console.error('Analiz hatası:', err);
    const status = err?.status || 500;
    const message =
      status === 401
        ? 'API anahtarı geçersiz. .env dosyasındaki ANTHROPIC_API_KEY değerini kontrol edin.'
        : status === 429
        ? 'API kullanım limiti aşıldı. Bir süre sonra tekrar deneyin.'
        : 'Analiz sırasında bir hata oluştu. Sunucu loglarına bakın.';
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`ABD Hisse Analiz Terminali ${PORT} portunda çalışıyor → http://localhost:${PORT}`);
});
