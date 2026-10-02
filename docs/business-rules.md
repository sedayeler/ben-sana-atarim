# İş Kuralları

Bu belge mevcut kodda uygulanan kurallar ile MVP için kesinleşmiş fakat henüz uygulanmamış kuralları kaydeder. Henüz kararı verilmemiş davranışlar ayrı bölümde tutulur.

## Bill oluşturma

- Yeni Bill `Active` durumunda oluşturulur.
- Service charge başlangıçta `0`dır.
- Oluşturulma zamanı UTC olarak atanır.
- Bill code 12 karakterdir ve `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` karakter kümesinden üretilir.
- Kod veritabanında unique olmalıdır.
- Bill'i oluşturan participant host olur ve başlangıçta ready değildir.
- Host normal bir Participant'tır; farkı `IsHost = true` olmasıdır.
- Host diğer participant'lar gibi item selection yapabilir.
- Host username değeri trim edilir, boş olamaz ve en fazla 50 karakter olabilir. Girilen casing gösterim için korunur.

## Bill'e katılma ve okuma

- Bill code girişleri trim edilir ve büyük harfe çevrilir.
- Code ile okuma Bill, participants, items ve selections verisini döndürür.
- Yalnızca `Active` Bill'e participant katılabilir.
- Participant username değeri trim edilir, boş olamaz ve en fazla 50 karakter olabilir. Girilen casing gösterim için korunur.
- Username aynı Bill içinde case-insensitive unique olmalıdır (`ece`, `Ece`, `ECE` aynı kabul edilir); farklı Bill'lerde tekrar kullanılabilir.
- Katılan participant host değildir ve başlangıçta ready değildir.

## Para birimi ve parasal değerler

- MVP yalnızca Türk Lirası (`TRY`) destekler.
- Şimdilik domain modeline ayrıca currency alanı eklenmez.
- Parasal değerler iki ondalık basamak hassasiyetinde ele alınır.

## Fiş okuma ve onaylama

- AI parser yalnızca `Name`, `Quantity`, `UnitPrice` ve `ServiceCharge` çıkarır.
- Parse sonucu otomatik olarak veritabanına yazılmaz.
- Receipt yalnızca host tarafından ve `Active` Bill üzerinde onaylanabilir.
- Service charge negatif olamaz.
- Item adı trim edilir, boş olamaz ve en fazla 150 karakter olabilir.
- Item quantity sıfırdan büyük olmalıdır.
- Unit price negatif olamaz.
- Varsayılan split type, quantity 1'den büyükse `Quantity`; aksi halde `Shared`dır.
- Receipt onaylama Bill'i finalize etmez.
- Receipt tekrar onaylandığında mevcut item selections silinir, ready participant'lar unready yapılır ve item listesi yenisiyle değiştirilir.

## Item seçimi

- Selection işlemleri yalnızca `Active` Bill üzerinde yapılabilir.
- Participant ve BillItem aynı Bill'e ait olmalıdır.
- Host item selection yapabilir.
- Aynı participant aynı BillItem için yalnızca bir selection oluşturabilir.
- `Quantity` item seçiminde seçilen adet sıfırdan büyük olmalıdır.
- Bir `Quantity` item için toplam selection quantity hiçbir durumda `BillItem.Quantity` değerini aşamaz; bu iş kuralı eş zamanlı işlemlerde de korunmalıdır.
- Bu eş zamanlılık kuralının uygulama yöntemi henüz seçilmemiştir.
- `Shared` item seçiminde adet business anlamı taşımaz; kayıt `Quantity = 1` ile tutulur.
- Shared selection quantity değeri değiştirilemez.
- Participant bir selection ekler, kaldırır veya quantity değerini gerçekten değiştirirse ready durumu `false` yapılır.
- Aynı quantity değeri tekrar gönderilirse seçim değişmiş sayılmaz.

## SplitType değişikliği

- Split type yalnızca host tarafından ve `Active` Bill üzerinde değiştirilebilir.
- Geçerli değerler `Quantity` ve `Shared`dır.
- Değer gerçekten değiştiğinde ilgili item'ın bütün mevcut selections kayıtları silinir.
- Silinen seçimlerden etkilenen ready participant'lar unready yapılır.
- Eski selection quantity değerleri yeni split type'a dönüştürülmez.
- Aynı split type tekrar gönderilirse işlem yapılmaz.

## Ready durumu

- Participant ready veya unready durumuna yalnızca `Active` Bill üzerinde geçirilebilir.
- Ready olmak için en az bir item seçme zorunluluğu yoktur.

## Bill sonlandırma

Bu bölümdeki kurallar kesinleşmiştir ancak Bill sonlandırma akışı henüz uygulanmamıştır.

- Bill'i yalnızca host finalize edebilir.
- Finalize için Bill'deki bütün participant'lar ready olmalıdır.
- Her `Quantity` item için selection quantity toplamı `BillItem.Quantity` değerine tam eşit olmalıdır.
- Her `Shared` item en az bir participant tarafından seçilmiş olmalıdır.
- Finalize tamamlandığında Bill durumu `Finalized` olur.
- Yalnızca host, `Finalized` Bill'i `Reopen` işlemiyle tekrar `Active` duruma getirebilir.
- `Reopen` mevcut item selections kayıtlarını korur ve Bill'deki bütün participant'ları `IsReady = false` yapar.
- Yeniden açılan Bill'de bütün mevcut finalization koşulları tekrar sağlandığında host Bill'i yeniden finalize edebilir.
- `Finalized` Bill üzerinde join, receipt değişikliği, selection ekleme/silme/değiştirme, split type değiştirme ve ready durumu değiştirme yapılamaz. Bu işlemler ancak host Bill'i yeniden açtıktan sonra yapılabilir.

## Hesaplama

Bu bölümdeki kurallar kesinleşmiştir ancak hesaplama akışı henüz uygulanmamıştır.

- `Quantity` item için participant tutarı `selected quantity * UnitPrice` olarak hesaplanır.
- `Shared` item toplam tutarı `BillItem.Quantity * UnitPrice` olarak hesaplanır.
- Her Shared item kendi selection grubunda bağımsız olarak dağıtılır.
- Shared item toplam tutarı item'ı seçen participant'lar arasında eşit bölünür.
- ServiceCharge, Shared item dağıtımlarından bağımsız olarak host dahil Bill'deki bütün participant'lar arasında eşit bölünür.
- Shared item veya ServiceCharge tutarı iki ondalık basamağa tam bölünemiyorsa kuruş kaybedilmez veya oluşturulmaz.
- Kalan kuruşlar ilgili dağıtıma katılan participant'lar arasında `Participant.Id` değerlerinden türetilen deterministik bir sıraya göre birer kuruş dağıtılır.
- Kalan kuruşların dağıtımında gerçek rastgelelik kullanılmaz; aynı Bill durumu her hesaplandığında aynı sonuç üretilir.
- Yalnızca remainder dağıtımı için `JoinOrder`, `JoinedAt` veya benzeri yeni bir alan eklenmez.
- Her bağımsız dağıtımda participant paylarının toplamı dağıtılan orijinal tutara tam eşit olur.
- Participant nihai toplamları ayrıca kaydedilmez.
- Hesap sonucu mevcut Bill, Participant, BillItem, ItemSelection ve ServiceCharge durumundan deterministik olarak üretilir.
- Finalized Bill'in hesaplama girdileri değiştirilemediği için aynı durum her okumada aynı sonucu vermelidir.
- Son invariant şöyledir:

  ```text
  sum(participant totals) == sum(BillItem.Quantity * BillItem.UnitPrice) + ServiceCharge
  ```

## Açık ürün kararları

- Eş zamanlı Quantity kapasite çakışmasının kullanıcıya nasıl sunulacağı henüz kararlaştırılmadı. İş kuralı kesin olmakla birlikte eş zamanlılık uygulama yöntemi bu aşamada seçilmemelidir.
