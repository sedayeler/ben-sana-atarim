---
name: implement-backend-feature
description: BenSanaAtarim'ın service merkezli mimarisinde kapsamı belirli bir backend özelliğini uygular. İstenen backend davranış değişikliklerinde kullanılır; yalnızca review veya frontend görevlerinde kullanılmaz.
---

# Backend Özelliği Uygulama

İstenen backend özelliğini, belgelenmiş davranışı ve belirtilen scope'u karşılayan en küçük değişiklikle uygula.

## Bağlamı belirle

1. Uygulama kararlarını vermeden önce repository root'undan şu source of truth dosyalarını oku:
   - `AGENTS.md`
   - `docs/product.md`
   - `docs/architecture.md`
   - `docs/business-rules.md`
2. Görevle doğrudan ilgili mevcut kodu incele. Gerektiğinde çağıran kodu, kalıcılık davranışını, service ve repository sözleşmelerini ve mevcut uygulama kalıplarını da oku.
3. Kendi değişikliklerini önceden var olan kullanıcı değişikliklerinden ayırabilmek için çalışma ağacını incele. İlgisiz çalışmaları koru.

Projeye özgü business rule'ları bu skill'e kopyalama. Değişebilecekleri için her zaman güncel `docs/` dosyalarını kullan.

## Görevin sınırını belirle

- Açıkça istenen davranışı ve bunu uygulamak için gereken en az sayıdaki dosyayı belirle.
- Değişiklikleri bu scope içinde tut. Bitişik veya gelecekteki özellikleri uygulama.
- Uygulama için gerçekten gerekli bir ürün veya iş kararının cevabı source of truth belgelerinde yoksa bu karara bağlı uygulamayı durdur ve kullanıcıya sor. Eksik kararı ve doğru davranışı neden engellediğini açıkla.
- Olağan teknik ayrıntılar için kullanıcıdan seçim isteme. Mevcut mimariye ve repository kalıplarına uygun en basit çözümü seç.
- Gelecekteki özelliklerin kararlarını önceden tasarlama.

## Mevcut mimaride uygula

- Yeni soyutlamalar yerine mevcut service ve repository kalıplarını tercih et.
- İş kurallarını service katmanında tut.
- Entity'lere iş kuralı veya işlem metotları ekleme. Mevcut modele uygunsa constructor'lar kullanılabilir.
- Repository metotlarını yalnızca istenen davranış gerektiriyorsa ekle.
- Gereksiz soyutlama veya refactor yapma.
- Kullanıcı açıkça istemedikçe CQRS, MediatR, Unit of Work veya başka bir mimari kalıp ekleme. Özellik anlamlı bir mimari değişiklik olmadan doğru uygulanamıyorsa devam etmeden önce kullanıcıya sor.
- Feature scope'u dışındaki production dosyalarını değiştirme.
- Nullable reference types uyumluluğunu, mevcut isimlendirme kurallarını ve geçerli bağımlılık yönünü koru.

## Doğrula

1. Doğrulamadan önce gereken uygulamayı tamamla.
2. Repository root'undan şu komutu çalıştır:

   ```powershell
   dotnet build backend/BenSanaAtarim.sln
   ```

3. Build kendi değişikliklerin nedeniyle başarısız olursa hataları düzeltip yeniden build al. Çalışmayı ilgisiz temizlik işlerine genişletme.
4. Son diff'ini ve çalışma ağacının durumunu incele. Diff'in yalnızca amaçlanan değişiklikleri içerdiğini, source of truth belgelerine uyduğunu ve ilgisiz kullanıcı çalışmalarını koruduğunu doğrula.
5. Commit oluşturma.

## Lead'e raporla

Kısaca şunları bildir:

1. Değiştirilen dosyalar.
2. Uygulanan davranış değişiklikleri.
3. Build komutu ve sonucu.
4. Varsa çözümlenmemiş ürün veya iş kararı.
5. Reviewer'ın özellikle incelemesi gereken riskli noktalar.