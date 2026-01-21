<div align="center">
  <p>
    <a href="https://www.veniplatform.com/">
      <img src="https://www.veniplatform.com/_next/image?url=%2Fveniai-logo.webp&w=64&q=75" width="72" alt="Veni AI logosu" />
    </a>
  </p>
  <h1>Yargıtay Emsal Karar MCP Sunucusu</h1>
  <p>
    Veni AI tarafından geliştirilen ve dünyanın en iyi Yargıtay emsal karar arama MCP sunucusu olmak üzere tasarlanan,
    stdio tabanlı, uçtan uca teknik odaklı bir arama altyapısı.
  </p>
  <p>
    <a href="https://www.veniplatform.com/">Veni Platform</a> |
    <a href="https://www.veniplatform.com/mcp-servers">Daha fazla MCP sunucusu</a>
  </p>
  <hr />
  <p>
    <strong>Şirketiniz veya fikriniz için özelleştirilmiş MCP Sunucusu mu istiyorsunuz?</strong><br />
    Veni AI olarak, kurumsal ihtiyaçlarınıza özel profesyonel MCP çözümleri geliştiriyoruz.<br />
    👉 <a href="https://www.veniplatform.com/mcp-servers">İletişime Geçin & Detayları İnceleyin</a>
  </p>
  <hr />
</div>

<p align="center">
  <img alt="MCP" src="https://img.shields.io/badge/MCP-stdio-000000?style=flat-square" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D18-3C873A?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Cache-336791?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Browserless" src="https://img.shields.io/badge/Browserless-Puppeteer-0A7FFF?style=flat-square" />
  <img alt="Built by Veni AI" src="https://img.shields.io/badge/Built%20by-Veni%20AI-111111?style=flat-square" />
</p>

<p align="center">
  <a href="#hızlı-başlangıç">Hızlı Başlangıç</a> |
  <a href="#araçlar">Araçlar</a> |
  <a href="#mimari">Mimari</a> |
  <a href="#ortam">Ortam</a> |
  <a href="#claude-desktop-yapılandırması">Claude Desktop</a> |
  <a href="#güvenlik-ve-gizlilik">Güvenlik</a>
</p>

<details>
<summary>İçindekiler (göstermek için tıklayın)</summary>

- [Genel Bakış](#genel-bakış)
- [Öne Çıkanlar](#öne-çıkanlar)
- [Mimari](#mimari)
- [Araçlar](#araçlar)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Claude Desktop Yapılandırması](#claude-desktop-yapılandırması)
- [Ortam](#ortam)
- [Veritabanı Şeması](#veritabanı-şeması)
- [Browserless Kurulumu](#browserless-kurulumu)
- [Önbellek Modeli](#önbellek-modeli)
- [Çıktı Formatı](#çıktı-formatı)
- [Performans Ayarı](#performans-ayarı)
- [Güvenlik ve Gizlilik](#güvenlik-ve-gizlilik)
- [Operasyonel Notlar](#operasyonel-notlar)
- [SSS](#sss)
- [Yol Haritası](#yol-haritası)
- [Emeği Geçenler](#emeği-geçenler)
- [Lisans](#lisans)
</details>

## Genel Bakış

Bu depo, Yargıtay emsal karar araması için tamamen MCP (Model Context Protocol) tabanlı bir sunucu içerir. stdio
üzerinden çalışır, Claude Desktop gibi MCP istemcileri için tasarlanmıştır ve üç katmanlı önbellek ile yüksek kaliteli
sonuçlar sağlar: bellek, PostgreSQL ve Browserless tabanlı tarama.

Sunucu bilinçli olarak HTTP yüzeyi içermez. MCP araç ergonomisine, deterministik çıktılara ve güvenli kullanım için temiz
bir dağıtım ayak izine odaklanır.

## Öne Çıkanlar

- Yalnızca MCP stdio taşıması, HTTP yüzeyi yok.
- Birleşik telemetri ve kontrollü sona erme ile 3 katmanlı önbellek.
- Güvenilir içerik çıkarımı için Browserless + Puppeteer tarama.
- Popülerlik ve performans içgörüleri için PostgreSQL destekli analitik.
- Sıkı girdi doğrulama ve öngörülebilir çıktı formatı.
- Dünyanın en iyi Yargıtay emsal karar arama MCP sunucusu olmak üzere Veni AI tarafından geliştirildi.

## Mimari

```mermaid
graph TD
  Client[MCP İstemci] -->|stdio| Server[MCP Sunucu]
  Server --> L1[L1 Bellek Önbelleği]
  Server --> L2[(PostgreSQL)]
  Server --> Browserless[Browserless + Puppeteer]
  Browserless --> Source[karararama.yargitay.gov.tr]
```

## Araçlar

Tüm araçlar, istemcilerde kolay ayrıştırma için JSON içeren tek bir metin yükü döndürür.

### yargitay_search_optimized

Önbellek ve Browserless taramasıyla Yargıtay kararlarını arar.

Girdi:

```json
{
  "query": "string",
  "refresh": "boolean (optional)"
}
```

Çıktı anahtarları:

- formatted: kullanıcı dostu düz metin sonuç listesi
- success: boolean
- query: normalize edilmiş sorgu
- results: kararlar dizisi
- metadata: source, cached, age, resultCount, totalTime

### yargitay_health

Browserless, önbellek ve veritabanı için sağlık durumunu döndürür.

### yargitay_stats

Önbellek isabet oranları, zamanlama metrikleri ve temel tarama yapılandırmasını döndürür.

### yargitay_popular

Veritabanından popüler sorguları listeler.

Girdi:

```json
{ "limit": 20 }
```

### yargitay_analytics

Son N gün için günlük analitikleri döndürür.

Girdi:

```json
{ "days": 7 }
```

### yargitay_cache_clear

Bellek ve veritabanı için önbellek temizliğini tetikler.

## Hızlı Başlangıç

1) Bağımlılıkları yükleyin

```bash
npm install
```

2) Ortam dosyanızı oluşturun

```bash
copy .env.example .env
# macOS or Linux:
# cp .env.example .env
```

3) Veritabanı şemasını başlatın

```bash
psql "$DATABASE_URL" -f src/database/schema.sql
```

4) Derleyip çalıştırın

```bash
npm run build
npm start
```

## Claude Desktop Yapılandırması

```json
{
  "mcpServers": {
    "yargitay": {
      "command": "node",
      "args": ["C:/path/to/yargitay-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host:5432/dbname?sslmode=require",
        "BROWSERLESS_URL": "wss://your-browserless-host",
        "BROWSERLESS_TOKEN": "your-token"
      }
    }
  }
}
```

## Ortam

`.env.example` dosyasını temel alın. Aşağıdaki değişkenler desteklenir:

| Değişken | Zorunlu | Varsayılan | Notlar |
| --- | --- | --- | --- |
| DATABASE_URL | evet | - | PostgreSQL bağlantı dizesi |
| DATABASE_TYPE | hayır | postgresql | Yalnızca görüntüleme |
| DATABASE_POOL_MIN | hayır | 2 | Havuz min boyutu |
| DATABASE_POOL_MAX | hayır | 10 | Havuz max boyutu |
| BROWSERLESS_URL | evet | - | wss veya https uç noktası |
| BROWSERLESS_TOKEN | evet | - | Token ws uç noktasına eklenir |
| BROWSERLESS_TIMEOUT | hayır | 30000 | Milisaniye |
| BROWSERLESS_RETRIES | hayır | 3 | Tekrar sayısı |
| SCRAPING_MAX_RESULTS | hayır | 10 | Sorgu başına limit |
| SCRAPING_PARALLEL_REQUESTS | hayır | 3 | Paralel detay çekimi |
| SCRAPING_ADAPTIVE_TIMEOUT | hayır | true | Uyarlanabilir zaman aşımı |
| SCRAPING_RETRY_STRATEGY | hayır | exponential | exponential, linear, fixed |
| SCRAPING_BASE_TIMEOUT | hayır | 10000 | Milisaniye |
| CACHE_L1_TTL_MS | hayır | 300000 | Bellek önbelleği TTL |
| CACHE_L2_TTL_DAYS | hayır | 30 | DB önbelleği TTL |
| CACHE_POPULAR_THRESHOLD | hayır | 5 | Popülerlik eşiği |
| CACHE_CLEANUP_INTERVAL_MS | hayır | 3600000 | Temizlik aralığı |
| NODE_ENV | hayır | development | development veya production |

## Veritabanı Şeması

Şema dosyası:

- `src/database/schema.sql`

Arama sonuçları, kararlar, tarama istatistikleri ve analitik için yardımcı görünümler oluşturan tablolar içerir.
Ayrıca erişim sayacı güncellemeleri ve temizlik için saklı prosedürler bulunur.

## Browserless Kurulumu

- `BROWSERLESS_URL` değerini Browserless uç noktanız olarak ayarlayın (wss veya https).
- Sunucu, yoksa `?token=` parametresini otomatik olarak ekler.
- `BROWSERLESS_TOKEN` zorunludur ve asla loglanmaz.

## Önbellek Modeli

- L1: bellekte, ultra hızlı, kısa TTL.
- L2: PostgreSQL, orta gecikme, uzun TTL.
- L3: Browserless üzerinden canlı tarama.

Önbellek yükseltmesi L3'ten L2 ve L1'e akar. `refresh` bayrağı geçersizleştirmeyi zorlar.

```mermaid
graph LR
  L3[L3 Canlı Tarama] -->|yükselt| L2[L2 PostgreSQL Önbelleği]
  L2 -->|yükselt| L1[L1 Bellek Önbelleği]
  Refresh[refresh=true] -->|geçersizleştir| L1
  Refresh -->|geçersizleştir| L2
```

## Çıktı Formatı

Tüm araçlar MCP metin içeriği içinde JSON döndürür. `yargitay_search_optimized` için örnek:

```json
{
  "formatted": "Result 1 ...",
  "success": true,
  "query": "tazminat",
  "results": [
    {
      "siraNo": "1",
      "daire": "1. Hukuk Dairesi",
      "esasNo": "2023/1234",
      "kararNo": "2023/5678",
      "kararTarihi": "15.12.2023",
      "icerik": "..."
    }
  ],
  "metadata": {
    "source": "scrape",
    "cached": false,
    "age": 0,
    "resultCount": 1,
    "totalTime": 1240
  }
}
```

## Performans Ayarı

- Browserless kapasitesi yüksekse `SCRAPING_PARALLEL_REQUESTS` değerini artırın.
- Uzun sorgular veya yavaş ağlar için `BROWSERLESS_TIMEOUT` değerini yükseltin.
- Tarama yükünü azaltmak için `CACHE_L2_TTL_DAYS` değerini uzatın.
- Önbellek isabet oranı ve yanıt süresini takip etmek için `yargitay_stats` kullanın.

## Güvenlik ve Gizlilik

- Depoda hiçbir gizli bilgi tutulmaz.
- Tüm kimlik bilgileri ortam değişkenleriyle sağlanır.
- Veritabanı URL'si loglarda maskelenir.
- Girdiler kullanılmadan önce doğrulanır ve temizlenir.

## Operasyonel Notlar

- Veri kaynağı herkese açık Yargıtay arama sitesidir. Erişilebilirlik ve işaretleme değişebilir.
- Analitik ve L2 önbellek için veritabanı şiddetle önerilir. Veritabanı kapalıyken sunucu çalışmaya devam eder, ancak
  analitik ve L2 önbellek zayıflar.
- Hızlı durum kontrolü için `yargitay_health` kullanın.

## SSS

<details>
<summary>Neden HTTP API yok?</summary>

Bu sunucu MCP önceliklidir ve tasarım gereği stdio üzerinden iletişim kurar.
</details>

<details>
<summary>PostgreSQL olmadan çalıştırabilir miyim?</summary>

Evet, ancak L2 önbellek ve analitik kaybolur.
</details>

<details>
<summary>Ayrıntılı arama filtreleri destekleniyor mu?</summary>

Mevcut araçlar sorgu tabanlı aramaya odaklanır. Gelişmiş filtreler araç argümanı olarak eklenebilir.
</details>

## Yol Haritası

- Gelişmiş arama filtreleri ve daha zengin sorgu şeması.
- Hafif dağıtımlar için SQLite desteği.
- Yapılandırılmış sonuç biçimlendirme ön ayarları.
- Önbelleğe alınmış veri setleri için kaynak uç noktaları.

## Emeği Geçenler

Veni AI tarafından geliştirildi.

## Lisans

MIT. `LICENSE` dosyasına bakın.
