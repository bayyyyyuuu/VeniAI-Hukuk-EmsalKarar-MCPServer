# Güvenlik Politikası (Security Policy)

Veni AI olarak güvenliğe büyük önem veriyoruz. Yargıtay emsal karar MCP sunucusunda bir güvenlik açığı bulursanız lütfen bu politikayı takip edin.

## Desteklenen Versiyonlar

Şu an için sadece ana daldaki (main/master) en güncel sürüm için güvenlik desteği verilmektedir.

| Versiyon | Destek Durumu |
| -------- | ------------- |
| 1.0.x    | Destekleniyor |

## Güvenlik Açığı Bildirme

Güvenlik açıklarını GitHub Issues üzerinden **bildirmeyin**. Bunun yerine lütfen doğrudan şu kanaldan bizimle iletişime geçin:

- **E-posta:** info@veniplatform.com

## Sorumluluk Reddi (Disclaimer)

Bu yazılım "olduğu gibi" (as-is) sunulmaktadır. Veni AI, bu yazılımın kullanımıyla ilgili herhangi bir güvenlik garantisi, teknik destek veya yasal taahhüt vermemektedir. Kullanıcılar, sistemi kendi risk ve sorumlulukları altında kullanırlar. Yazılımın doğruluğu veya kesintisiz çalışması garanti edilmez.

## Dikkat Edilmesi Gerekenler

- `.env` dosyanızdaki `DATABASE_URL` ve `BROWSERLESS_TOKEN` gibi bilgiler size özeldir. Bunları asla başkalarıyla paylaşmayın.
- MCP sunucusu yerel (stdio) üzerinden çalıştığı için ağ güvenliği büyük ölçüde çalıştığınız yerel ortama bağlıdır.

Teşekkürler,
**Veni AI Güvenlik Ekibi**
