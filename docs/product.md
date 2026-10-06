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
- Seçimler tamamlandığında participant paylarını ve Bill toplamını hesaplama.
- Host'un Bill'i finalize etmesi ve yeniden açması.

Bu yetenekler service katmanında uygulanır ve ASP.NET Core Controller tabanlı HTTP API üzerinden erişilebilir. Frontend boş bir başlangıç ekranıdır.

Participant kimliği için Bill'e katılırken `Username` kullanılır. Username aynı Bill içinde case-insensitive unique olmalı, farklı Bill'lerde tekrar kullanılabilmeli ve kullanıcının girdiği casing gösterim için korunmalıdır. Ayrıntılı kurallar `business-rules.md` içindedir.

API akışında Bill oluşturan veya Bill'e katılan her Participant için bir kez gösterilen gizli erişim token'ı verilir. İstemci sonraki değişiklik isteklerinde bearer token olarak bunu taşır. Veritabanında token'ın SHA-256 hash'i saklanır; token ve hash API/SignalR snapshot'larında gösterilmez. Participant ID gösterilebilir, ancak kimlik doğrulama veya host yetkisi sağlamaz. Bu token kullanıcı hesabı oluşturmaz. Migration öncesinden kalan participant kayıtlarında token bulunmadığı için bu kayıtlar okunabilir ancak token ile değişiklik isteği yapamaz.

Başarılı Bill değişikliklerinden sonra Bill grubuna SignalR `BillUpdated` olayıyla güncel Bill ayrıntıları gönderilir. Salt fiş görselini parse etme işlemi Bill durumunu değiştirmediği için yayın yapmaz.

Fiş görseli yüklemeleri en fazla 10 MB olabilir; JPEG, PNG ve WebP kabul edilir. Backend bu kapsamda API doğrulaması ve hata eşlemesi sağlar. Swagger/OpenAPI belgeleri yalnızca Development ortamında endpoint'leri denemek için sunulur.

MVP'de Bill başına participant veya item sayısı için ayrıca bir üst sınır uygulanmaz. Mevcut fiş düzeltme ve yeniden onaylama API akışı yeterlidir; bunun için ek API endpoint'i planlanmaz. Quantity kapasite çakışması ve hata mesajlarının kullanıcıya sunumu frontend'de ele alınır. Backend `ProblemDetails` hata yanıtlarını döndürmeye devam eder.

## Para birimi ve parasal değerler

- MVP yalnızca Türk Lirası (`TRY`) destekler.
- Şimdilik domain modeline ayrıca currency alanı eklenmez.
- Parasal değerler iki ondalık basamak hassasiyetinde ele alınır.

## MVP'de planlanan fakat henüz implement edilmemiş

- Frontend ürün akışı.

Frontend akışının iş kuralları kesinleşmiş olan bölümleri `business-rules.md` içinde yer alır. Henüz kodda bulunmaması, kuralların belirsiz olduğu anlamına gelmez.

## MVP kapsamı dışında

- Authentication ve user account.
- Ödeme entegrasyonu.
- Bill geçmişi.
- Participant'ın Bill'den ayrılması.
- Host rolünün devri.
- Bill kodunun geçerlilik süresi.

## Kullanıcıya sorulması gereken ürün kararları

Şu anda backend kapsamını etkileyen ve yanıt bekleyen ürün kararı bulunmuyor. Frontend akışındaki kapasite çakışması ve hata mesajlarının sunumu frontend geliştirilirken belirlenecek.
