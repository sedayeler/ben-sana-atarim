# Ürün

## Ürün adı

Kullanıcı arayüzündeki marka adı `ben sana atarım` olarak, tamamen küçük harflerle ve Türkçe karakterlerle yazılır. Teknik proje, namespace ve identifier adı `BenSanaAtarim`dır.

## Mevcut ürün kapsamı

Uygulama, bir Bill üzerindeki fiş kalemlerinin masadaki katılımcılar tarafından paylaşıldığı uçtan uca bir hesap bölüşme akışı sunar.

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

Bu yetenekler service katmanında uygulanır ve ASP.NET Core Controller tabanlı HTTP API üzerinden erişilebilir. Türkçe frontend; masa kurma ve kod/QR/davet linkiyle katılma, fişi kameradan veya dosyadan okutma, taslağı düzeltip onaylama, kalem seçimi, hesap kesme ve kişi bazlı sonuç ekranlarını sunar. Host hesabı yeniden açabilir; mevcut seçimler korunur ve herkesin hazır durumu sıfırlanır.

Participant kimliği için Bill'e katılırken `Username` kullanılır. Username aynı Bill içinde case-insensitive unique olmalı, farklı Bill'lerde tekrar kullanılabilmeli ve kullanıcının girdiği casing gösterim için korunmalıdır. Ayrıntılı kurallar `business-rules.md` içindedir.

API akışında Bill oluşturan veya Bill'e katılan her Participant için bir kez gösterilen gizli erişim token'ı verilir. İstemci sonraki değişiklik isteklerinde bearer token olarak bunu taşır. Veritabanında token'ın SHA-256 hash'i saklanır; token ve hash API/SignalR snapshot'larında gösterilmez. Participant ID gösterilebilir, ancak kimlik doğrulama veya host yetkisi sağlamaz. Bu token kullanıcı hesabı oluşturmaz. Migration öncesinden kalan participant kayıtlarında token bulunmadığı için bu kayıtlar okunabilir ancak token ile değişiklik isteği yapamaz.

Başarılı Bill değişikliklerinden sonra Bill grubuna SignalR `BillUpdated` olayıyla güncel Bill ayrıntıları gönderilir. Salt fiş görselini parse etme işlemi Bill durumunu değiştirmediği için yayın yapmaz.

Fiş görseli yüklemeleri en fazla 10 MB olabilir; JPEG, PNG ve WebP kabul edilir. Backend bu kapsamda API doğrulaması ve hata eşlemesi sağlar. Swagger/OpenAPI belgeleri yalnızca Development ortamında endpoint'leri denemek için sunulur.

MVP'de Bill başına participant veya item sayısı için ayrıca bir üst sınır uygulanmaz. Fiş düzeltme ve yeniden onaylama mevcut API akışıyla yapılır. `Quantity` kapasite çakışmasında frontend güncel Bill durumunu yeniden okur ve adet kalmadıysa kullanıcıya ilgili kalemin durumunu gösterir. Frontend, HTTP durumuna göre Türkçe hata ve bağlantı mesajları sunar; backend `ProblemDetails` yanıtlarını döndürür. Bütün kalemler dağıtılmadan kişi tutarı gösterilmez.

Uygulama canlıya alınmıştır. Kök `Dockerfile`, frontend ve backend'i birlikte dağıtmak için kullanılır; production imajında ASP.NET Core API derlenmiş React dosyalarını aynı origin üzerinden sunar. Yayın adresi ve barındırma ayarları repository'de kayıtlı değildir.

## Para birimi ve parasal değerler

- MVP yalnızca Türk Lirası (`TRY`) destekler.
- Şimdilik domain modeline ayrıca currency alanı eklenmez.
- Parasal değerler iki ondalık basamak hassasiyetinde ele alınır.

## MVP'de planlanan fakat henüz implement edilmemiş

Şu anda MVP kapsamında implement edilmemiş madde yoktur.

## MVP kapsamı dışında

- Authentication ve user account.
- Ödeme entegrasyonu.
- Bill geçmişi.
- Participant'ın Bill'den ayrılması.
- Host rolünün devri.
- Bill kodunun geçerlilik süresi.
