# Ürün

## Ürün adı

Kullanıcı arayüzündeki marka adı `ben sana atarım` olarak, tamamen küçük harflerle ve Türkçe karakterlerle yazılır. Teknik proje, namespace ve identifier adı `BenSanaAtarim`dır.

## Mevcut ürün kapsamı

Mevcut kod, bir Bill üzerindeki fiş kalemlerinin katılımcılar tarafından seçildiği bir hesap paylaşım akışının temelini içerir.

Uygulama katmanındaki mevcut sözleşmeler ve Infrastructure uygulaması şu kullanım alanlarını destekler:

- Host adıyla yeni Bill oluşturma ve paylaşım kodu üretme.
- Kod ile Bill, participant, item ve selection bilgilerini getirme.
- Active Bill'e participant katma.
- Fiş görselini Gemini ile yapılandırılmış veriye dönüştürme.
- Parse edilen fişi host onayından sonra Bill üzerine kaydetme.
- Participant'ın item seçmesi, seçimi kaldırması ve Quantity seçim adedini değiştirmesi.
- Host'un item split type değerini değiştirmesi.
- Participant'ın ready/unready durumunu değiştirmesi.

Bu yetenekler şu anda service katmanındadır. API controller veya endpoint bulunmaz. Frontend boş bir başlangıç ekranıdır.

Participant kimliği için Bill'e katılırken `Username` kullanılır. Username aynı Bill içinde case-insensitive unique olmalı, farklı Bill'lerde tekrar kullanılabilmeli ve kullanıcının girdiği casing gösterim için korunmalıdır. Ayrıntılı kurallar `business-rules.md` içindedir.

## Para birimi ve parasal değerler

- MVP yalnızca Türk Lirası (`TRY`) destekler.
- Şimdilik domain modeline ayrıca currency alanı eklenmez.
- Parasal değerler iki ondalık basamak hassasiyetinde ele alınır.

## MVP'de planlanan fakat henüz implement edilmemiş

- Participant paylarının ve Bill toplamlarının hesaplanması.
- Bill sonlandırma ve host tarafından yeniden açma akışı.
- API endpoints/controllers.
- SignalR ile realtime güncellemeler.
- Frontend ürün akışı.

Bu özelliklerin iş kuralları kesinleşmiş olan bölümleri `business-rules.md` içinde yer alır. Henüz kodda bulunmamaları, kuralların belirsiz olduğu anlamına gelmez.

## MVP kapsamı dışında

- Authentication ve user account.
- Ödeme entegrasyonu.
- Bill geçmişi.
- Participant'ın Bill'den ayrılması.
- Host rolünün devri.
- Bill kodunun geçerlilik süresi.

## Kullanıcıya sorulması gereken ürün kararları

Aşağıdaki konular henüz kesinleştirilmemiştir:

- Authentication olmadan participant identity istemcide nasıl korunacak ve sonraki isteklerde nasıl taşınacak?
- Participant, item ve fiş görseli limitleri ne olmalı?
- Fiş düzeltme ve yeniden onaylama deneyimi API ve UI tarafında nasıl sunulmalı?
- Eş zamanlı Quantity kapasite çakışması kullanıcıya nasıl sunulmalı?
- UI hata mesajlarının dili ve formatı ne olmalı?
