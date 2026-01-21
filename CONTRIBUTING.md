# Katkıda Bulunma Rehberi

Veni AI - Yargıtay MCP Server projesine katkıda bulunmak istediğiniz için teşekkürler! Topluluk yardımıyla bu sunucuyu dünyanın en iyisi yapmayı hedefliyoruz.

## Nasıl Katkıda Bulunabilirsiniz?

### 1. Hata Bildirimi (Bug Reports)
Eğer bir hata bulursanız, lütfen [GitHub Issues](https://github.com/aliozkanozdurmus/VeniAI-Hukuk-EmsalKarar-MCPServer/issues) üzerinden bildirin. Bildiriminizde:
- Node.js versiyonunuzu
- Kullandığınız MCP istemcisini (Claude Desktop vb.)
- Hatanın tam ekran çıktısını veya loglarını paylaşın.

### 2. Yeni Özellik Önerileri
Daha fazla filtre, daha akıllı önbellekleme veya yeni araç önerileriniz varsa lütfen bir "Feature Request" oluşturun.

### 3. Kod ile Katkı (Pull Requests)
1. Bu depoyu çatallayın (Fork).
2. Bir özellik dalı (Feature Branch) oluşturun: `git checkout -b ozellik/yeni-filtre`
3. Yazım kurallarına (TypeScript, ESLint) uyun.
4. Değişikliklerinizi kaydedin (Commit): `git commit -m 'Yeni filtre eklendi'`
5. Dalınıza iteleyin (Push): `git push origin ozellik/yeni-filtre`
6. Bir Pull Request açın.

## Yerel Geliştirme Notları

- **TypeScript:** Tüm kodlar TypeScript ile yazılmalıdır.
- **Build:** `npm run build` komutunun hatasız çalıştığından emin olun.
- **Güvenlik:** `.env` dosyalarını veya özel bilgileri asla commit etmeyin.

Teşekkürler,
**Veni AI Ekibi**
