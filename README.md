[README.md](https://github.com/user-attachments/files/29168028/README.md)
# ABD Hisse Analiz Terminali

Verdiğiniz ABD hisse senedi sembolünü, Claude API'nin web arama aracını kullanarak güncel verilerle 14 maddelik bir çerçevede (temel analiz, teknik analiz, haberler, risk, puanlama, alım/satım stratejisi) analiz eden ve net bir **AL / Kademeli AL / BEKLE / Riskli AL / SAT** kararı üreten web arayüzü.

> ⚠️ **Bu araç yatırım tavsiyesi vermez.** Üretilen analiz yapay zekâ tarafından oluşturulur, hatalı veya eksik olabilir. Kararlarınızı kendi araştırmanız ve risk profilinizle birlikte değerlendirin.

## Nasıl çalışır?

- **Backend:** Node.js + Express (`server.js`) — formdan gelen hisse/vade/risk/tutar/strateji bilgilerini alır, `system_prompt.txt` içindeki analiz sistemini Claude API'ye system prompt olarak gönderir, `web_search` aracını açarak güncel veri taratır.
- **Frontend:** Sade HTML/CSS/JS (`public/`) — sonucu Markdown'dan render eder, "Karar:" satırını yakalayıp bir karar puluna (AL/BEKLE/SAT) dönüştürür, kullanılan kaynakları listeler.
- API anahtarınız **yalnızca sunucu tarafında** kullanılır, tarayıcıya hiç gönderilmez.

## Gereksinimler

- [Node.js](https://nodejs.org) 18 veya üzeri
- [Anthropic Console](https://console.anthropic.com) üzerinden alınmış bir **API anahtarı** (ücretli kullanım; her analiz birden fazla web araması içerdiği için biraz token tüketir)

## Yerel kurulum

```bash
git clone <bu-repo-url>
cd abd-hisse-analiz-terminali
npm install
cp .env.example .env
```

`.env` dosyasını açıp `ANTHROPIC_API_KEY` değerini kendi anahtarınızla doldurun:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

Sunucuyu başlatın:

```bash
npm start
```

Tarayıcıda açın: **http://localhost:3000**

## GitHub'a yükleme

```bash
git init
git add .
git commit -m "İlk sürüm: ABD hisse analiz terminali"
git branch -M main
git remote add origin https://github.com/<kullanici-adiniz>/<repo-adi>.git
git push -u origin main
```

`.env` dosyası `.gitignore` içinde olduğu için API anahtarınız repoya **yüklenmez**. Anahtarınızı asla doğrudan koda yazıp commit etmeyin.

## Canlıya alma (deploy)

Bu basit bir Express sunucusu olduğu için sürekli çalışan bir Node.js ortamı sunan herhangi bir servise dağıtılabilir:

### Render.com (önerilen, ücretsiz katman var)
1. GitHub reponuzu Render'a bağlayın → "New Web Service".
2. Build command: `npm install`
3. Start command: `npm start`
4. "Environment" sekmesinden `ANTHROPIC_API_KEY` değişkenini ekleyin.

### Railway.app
1. "New Project" → "Deploy from GitHub repo".
2. Otomatik olarak `npm install` + `npm start` çalıştırır.
3. "Variables" sekmesinden `ANTHROPIC_API_KEY` ekleyin.

### Vercel / Netlify
Bu platformlar varsayılan olarak serverless fonksiyon mimarisi kullanır; `server.js`'i bir API route'una (`api/analyze.js`) taşımanız gerekir. İsterseniz bu uyarlamayı da birlikte yapabiliriz.

## Proje yapısı

```
abd-hisse-analiz-terminali/
├── server.js            # Express backend + Claude API çağrısı
├── system_prompt.txt    # 14 maddelik analiz sistem promptu
├── package.json
├── .env.example
├── .gitignore
└── public/
    ├── index.html        # Form + sonuç arayüzü
    ├── style.css          # Finansal terminal görünümü
    └── script.js          # Form gönderimi, render, karar pulu
```

## Sistem promptunu özelleştirme

`system_prompt.txt` dosyasını doğrudan düzenleyerek analiz kriterlerini, puanlama ağırlıklarını veya çıktı formatını değiştirebilirsiniz. Dosyanın sonundaki "EK BİÇİMLENDİRME KURALI" bölümü, arayüzün Markdown render edebilmesi ve karar pulunu otomatik yakalayabilmesi için eklenmiştir — bunu kaldırırsanız arayüzdeki biçimlendirme ve karar pulu çalışmayabilir.

## Maliyet notu

Her analiz, modelin birden fazla web araması yapmasına izin verir (`max_uses: 12`) ve uzun bir rapor üretir (`max_tokens: 8000`). Bu nedenle her sorgu standart bir sohbet mesajından daha fazla token tüketir. Güncel fiyatlandırma için [Anthropic fiyatlandırma sayfasına](https://www.anthropic.com/pricing) bakın.

---

*Bu analiz yatırım tavsiyesi değildir; karar vermeden önce kendi risk profilinizi ve portföy büyüklüğünüzü dikkate almalısınız.*
