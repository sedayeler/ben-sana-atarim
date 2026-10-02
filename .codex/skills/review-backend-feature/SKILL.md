---
name: review-backend-feature
description: BenSanaAtarim'da başka bir agent'ın uyguladığı backend özelliğini somut doğruluk sorunları ve belgelenmiş kural ihlalleri açısından bağımsız inceler. Kod uygulamak veya değiştirmek için kullanılmaz.
---

# Backend Özelliğini İnceleme

Başka bir agent'ın backend uygulamasını bağımsız olarak incele. Read-only çalış: production code, dokümantasyon, migration, frontend dosyaları veya implementation diff üzerinde değişiklik yapma.

## Bağlamı belirle

1. Repository root'undan şunları oku:
   - `AGENTS.md`
   - `docs/product.md`
   - `docs/architecture.md`
   - `docs/business-rules.md`
2. Görevin amaçlanan scope'unu belirle; implementation diff'ini ve çalışma ağacının durumunu incele.
3. Gerçek davranışı, veri akışını, EF Core tracking ve kalıcılık davranışını veya çağıran kodun beklentilerini anlamak için gerektiğinde ilişkili mevcut kodu da oku. Doğruluk çevredeki koda bağlıysa incelemeyi yalnızca değişen satırlarla sınırlama.

Projeye özgü business rule'ları bu skill'e kopyalama. Güncel `docs/` dosyalarını source of truth olarak kullan.

## İnceleme öncelikleri

Yeni mimari veya varsayımsal iyileştirmeler yerine somut doğruluk sorunlarına odaklan. İlgili olduğunda şunları kontrol et:

- Belgelenmiş ürün veya iş kurallarının ihlali.
- Active ve Finalized durum kurallarının uygulanması.
- Host yetkilendirmesi.
- Participant ve BillItem'ın amaçlanan Bill'e ait olduğunun doğrulanması.
- Quantity ve Shared davranışları.
- Ready durumunun sıfırlanması.
- İlgiliyse hesaplama ve sonlandırma invariant'ları.
- Sonucu hatalı kılabilecek EF Core tracking, ilişki, cascade, transaction, concurrency veya kalıcılık davranışları.
- İstenmeyen veri kaybı.
- İstenen scope dışındaki değişiklikler.
- Dokümanlarla uygulama arasındaki çelişkiler.
- Diff veya doğrulama sonuçlarında görülen build ya da derleme riskleri.

Somut bir doğruluk hatasının mimari nedenini açıklamak için gerekli olmadıkça CQRS, MediatR, Unit of Work, geniş refactor, yeni soyutlama veya gelecekteki özellik tasarımı önerme.

Gerekli bir ürün veya iş kararının cevabı source of truth belgelerinde yoksa kararı kendin verme. Hangi davranışın buna bağlı olduğunu açıklayarak Lead'e `decision-needed` olarak bildir ve bunu doğruluk bulgularından ayrı tut.

## Bulguları raporla

- Bulguları önem ve etki sırasına göre ver.
- Her bulguda mümkünse şunları belirt:
  - dosya ve kesin konum,
  - somut sorun,
  - neden hatalı davranışa veya scope/doküman ihlaline yol açtığı,
  - beklenen davranış.
- Doğrulanmış hataları karar gerektiren konulardan ayır.
- Raporu doldurmak için bulgu uydurma.
- Somut doğruluk bulgusu yoksa bunu açıkça söyle ve inceleme kanıtının sınırlarını kısaca belirt.
- Commit oluşturma.