# Mimari

## Repository yapısı

Repository iki ana uygulama dizininden oluşur:

- `backend/`: ASP.NET Core backend solution'ı.
- `frontend/`: React uygulamasının doğrudan root dizini.

Backend solution dosyası `backend/BenSanaAtarim.sln`dır. Solution içindeki fiziksel proje dizinleri doğrudan `backend/` altındadır. Visual Studio Solution Folder düzeni şöyledir:

- `Core`: `BenSanaAtarim.Application`, `BenSanaAtarim.Domain`
- `Infrastructure`: `BenSanaAtarim.Infrastructure`
- `Presentation`: `BenSanaAtarim.Api`

## Backend teknolojisi ve bağımlılıkları

Bütün backend projeleri .NET 10 hedefler; nullable reference types ve implicit usings özelliklerini kullanır.

Proje referansları:

- `BenSanaAtarim.Api` → `BenSanaAtarim.Application`, `BenSanaAtarim.Infrastructure`
- `BenSanaAtarim.Application` → `BenSanaAtarim.Domain`
- `BenSanaAtarim.Infrastructure` → `BenSanaAtarim.Application`, `BenSanaAtarim.Domain`
- `BenSanaAtarim.Domain` → başka proje referansı yok

Infrastructure paketleri EF Core 10, Npgsql EF Core sağlayıcısı, yapılandırma soyutlamaları ve HTTP client desteğidir. EF design/tools paketleri API projesinde geliştirme araçları olarak bulunur.

## Katman sorumlulukları

### Domain

`BenSanaAtarim.Domain` şu temel modeli içerir:

- `BaseEntity`: yalnızca `Guid Id`.
- `Bill`: code, status, service charge, UTC oluşturulma zamanı, participants ve items.
- `Participant`: Bill kimliği, username, host ve ready durumu ile nullable erişim token hash'i.
- `BillItem`: Bill kimliği, name, quantity, unit price ve split type.
- `ItemSelection`: BillItem kimliği, Participant kimliği ve quantity.
- `BillStatus`: `Active`, `Finalized`.
- `SplitType`: `Quantity`, `Shared`.

Entity setter'ları public değildir. Entity'lerde iş kuralı veya işlem metodu yoktur; yalnızca oluşturma için constructor'lar bulunur.

### Application

`BenSanaAtarim.Application` şunları tanımlar:

- Genel read/write repository sözleşmeleri.
- Bill, Participant, BillItem ve ItemSelection için entity için özel repository sözleşmeleri.
- `IBillService` kullanım akışı sözleşmesi.
- `IReceiptParser` AI entegrasyonu için arayüz.
- Fiş okuma, Bill ayrıntı, erişim oturumu ve hesaplama sonuç modelleri.

Application kalıcılık veya AI sağlayıcı uygulaması içermez.

### Infrastructure

`BenSanaAtarim.Infrastructure` şunları içerir:

- PostgreSQL için `BenSanaAtarimDbContext`.
- Genel ve entity için özel EF Core repository uygulamaları.
- `BillService` iş kuralları uygulaması.
- Gemini REST API kullanan `GeminiReceiptParser`.
- Bağımlılık kayıtları.
- EF Core migration dosyaları; ilk migration `InitialCreate`, son migration participant erişim token hash'i ekler.

Mevcut mimari service merkezlidir. İş kararları `BillService` içinde uygulanır. Repository'ler sorgular ve private setter'lı durumun EF Core üzerinden kaydedilmesi için kullanılır.

Bill üzerindeki mutasyonlar, hesaplama ve Bill ayrıntı okuması, aynı Bill satırında PostgreSQL `FOR UPDATE` kilidi alan bir transaction içinde yürütülür. Ayrıntı okumasında Bill/Items/Participants ve ItemSelections bu kilit altında okunur; böylece bağlı kayıtlar tutarlı bir snapshot oluşturur.

### API

`BenSanaAtarim.Api` bağımlılıkların birleştirildiği giriş noktasıdır. `Program.cs`, Infrastructure servislerini configuration ile kaydeder, Controller'ları ekler ve uygulamayı çalıştırır. HTTP arayüzü, `BillsController` üzerinden Bill oluşturma/okuma/katılma, fiş parse/onay, item selection, split type, ready, calculation, finalize ve reopen akışlarını sunar. Controller'lar service katmanını çağırır; iş kuralları `BillService` içinde kalır. Swagger yalnız Development ortamında `/swagger` UI ve `/swagger/v1/swagger.json` OpenAPI belgesini sunar. Hatalar HTTP status kodlarına eşlenen `ProblemDetails` yanıtlarıyla döner.

Bill oluşturan ve katılan participant'a 32 byte kriptografik rastgelelikten türetilen erişim token'ı bir kez verilir. `BillService` yalnızca SHA-256 hash'ini `Participant.AccessTokenHash` alanına kaydeder ve sonraki değişiklik akışlarında token'dan participant'ı belirler. API response ve `BillUpdated` snapshot'ları entity'leri doğrudan serialize etmez; erişim token'ı veya hash içermez. Önceki migration'lardan kalan participant kayıtlarının hash alanı nullable olduğu için verileri korunur, fakat bu kayıtlar yeni token olmadan değişiklik isteği yapamaz.

Fiş parse endpoint'i host bearer token'ını ve `Active` Bill durumunu doğrular. Yüklemeyi 10 MB ile sınırlar ve JPEG/PNG/WebP imza kontrolü yapar. Parse sonucu persistence'a yazılmaz. Başarılı Bill mutasyonlarından sonra `BillUpdated` olayı Bill'in SignalR grubuna gönderilir; yalnız parse işleminde yayın yapılmaz. SignalR `JoinBill(code, accessToken)` çağrısı token'ı doğrular, bağlantıyı gruba ekler ve döndürülecek güncel Bill snapshot'ını grup üyeliğinden sonra yeniden okur.

`Program.cs`, proxy'nin ilettiği istemci IP ve protokol başlıklarını işler. Masa kurma/katılma isteklerine IP başına 10 dakikada 30, fiş parse isteklerine IP başına 10 dakikada 10 deneme sınırı uygular; aşımda 429 döner. Derlenmiş React dosyaları `wwwroot` içindeyse API bunları ve istemci rotaları için `index.html` fallback'ini aynı origin'den sunar. `/api` ve `/hubs` yolları bu fallback'in dışındadır.

### Frontend

Frontend React 19, TypeScript 5.9 ve Vite 7 kullanır; yönlendirme `react-router-dom`, gerçek zamanlı bağlantı `@microsoft/signalr`, davet QR kodu `qrcode` ile yapılır. Paket adı `ben-sana-atarim`dır. Paket yöneticisi npm'dir; kilit dosyası `package-lock.json`dır.

Rotalar: `/` (karşılama), `/masa-kur` (host adıyla masa kurma), `/katil/:code?` (kod ve adla katılma) ve `/masa/:code` (masa). Masa ekranı duruma göre lobi/misafir bekleme, fiş okutma (`Scan`), fiş düzeltme (`Review`), kalem seçimi (`Selection`) ve hesap sonucu (`Result`) görünümlerini gösterir.

`useBill` masanın tek kaynağıdır: Bill önce `GET /api/bills/{code}` ile okunur, cihazda token varsa SignalR grubuna `JoinBill` ile girilir ve her `BillUpdated` olayı ile mutasyon yanıtı güncel snapshot'ı getirir. Yeniden bağlantıda gruba tekrar katılır. Katılımcı erişim token'ı ve kimlik bilgisi `localStorage`da masa koduna göre (`bsa:session:<KOD>`) saklanır; kayıt kaybolursa masadaki yer geri alınamaz. Hata türleri HTTP durum kodundan türetilir; backend `detail` metinleri iş mantığı için kullanılmaz. UI Türkçe durum ve hata mesajları gösterir; `Quantity` kapasite çakışmasında masayı yeniden okuyup ilgili kalemdeki mevcut dağılımı gösterir.

`describeItems` kalemlerin dağıtım durumunu yalnızca arayüz için türetir. Bütün kalemler tamamlanınca `useCalculation` backend'den hesap sonucunu ister; parasal payları frontend hesaplamaz. Host için finalize kontrol ekranı eksik kalemleri ve hazır olmayan katılımcıları gösterir; kesin doğrulama backend'de yapılır. `Finalized` Bill'de sonuç ve kişinin kendi dökümü gösterilir; host yeniden açabilir.

Para girişleri `parseMoney` ile okunur: virgül ondalık ayracıdır ve noktalar binliktir (`1.234,50`); virgülsüz yazımda `95.50` ondalık, `1.250` ve `1.234.567` binlik sayılır. Geçersiz ya da ikiden fazla ondalıklı giriş ve 99.999.999,99 üstü tutar gönderilmeden reddedilir.

Geliştirmede Vite, `/api` ve `/hubs` (WebSocket dahil) isteklerini `http://localhost:5037` adresindeki backend'e yönlendirir; backend'de CORS yapılandırması yoktur.

## Dağıtım

Kök `Dockerfile` üç aşamalıdır: Node 22 Alpine ile `npm ci` ve frontend build, .NET 10 SDK ile API publish, ardından .NET 10 ASP.NET runtime imajı. Frontend çıktısı son imajdaki `wwwroot` dizinine kopyalanır; API ve frontend tek container'da çalışır. `ASPNETCORE_ENVIRONMENT=Production` ayarlanır ve işlem `app` kullanıcısıyla başlar. Platform `PORT` ortam değişkeni verirse API `0.0.0.0` üzerinde o portu dinler; aksi halde imajın varsayılan port ayarı kullanılır. Veritabanı bağlantısı ve Gemini anahtarı runtime configuration ile sağlanmalıdır. Repository belirli bir canlı adres veya barındırma servisi yapılandırması içermez.

## Kalıcılık modeli

`BenSanaAtarimDbContext` dört DbSet içerir: Bills, Participants, BillItems ve ItemSelections. PostgreSQL tablo adları sırasıyla `bills`, `participants`, `bill_items` ve `item_selections` olarak eşlenir.

Kesin EF Core kuralları:

- Bill code zorunlu, en fazla 12 karakter ve benzersiz bir indexe sahiptir.
- Participant username zorunlu ve en fazla 50 karakterdir; username yalnızca boşluk veya görünmez karakterlerden oluşamaz ve PostgreSQL text alanında saklanamayan karakterler (NUL gibi) içeremez. `Participant.UsernameNormalized`, `lower("Username")` ile hesaplanan stored computed kolondur ve `(BillId, UsernameNormalized)` unique indexi aynı Bill içinde case-insensitive benzersizliği sağlar; ASCII dışı harflerde karşılaştırma PostgreSQL `lower()` davranışına bağlıdır. Kullanıcının girdiği casing gösterim için `Username` alanında korunur.
- `Participant.AccessTokenHash` en fazla 64 karakterli nullable bir alandır. Yeni kayıtlar SHA-256 hash saklar; eski satırlar migration sırasında değiştirilmez.
- BillItem name zorunlu ve en fazla 150 karakterdir.
- ServiceCharge ve UnitPrice `decimal(10,2)` precision kullanır.
- Bir Participant ile BillItem çifti için yalnızca bir ItemSelection olabilir.
- Bill silinirse Participants ve BillItems zincirleme olarak silinir.
- BillItem veya Participant silinirse ilişkili ItemSelections zincirleme olarak silinir.

## Hesaplama sonuçlarının kalıcılığı

Participant nihai toplamları ayrıca kaydedilmez. Hesaplama sonucu mevcut Bill, Participant, BillItem, ItemSelection ve ServiceCharge durumundan deterministik olarak üretilir. Bill `Finalized` durumundayken hesaplama girdileri değiştirilemez; host Bill'i yeniden açarsa girdi state'i yeniden değiştirilebilir. Aynı girdi durumu her okumada aynı sonucu vermelidir.

## AI ile fiş okuma

`IReceiptParser`, bir görsel akışı ve medya türü alıp `ReceiptParseResult` döndürür. Infrastructure uygulaması Gemini REST API'ye gömülü base64 görsel gönderir ve yapılandırılmış JSON ister. Parser yalnızca item name, quantity, unit price ve service charge çıkarır; okuma sonucu kendiliğinden veritabanına yazılmaz.

Gemini modeli sürüm kontrolündeki `appsettings.json` dosyasının `Gemini:Model` değerinden okunur. PostgreSQL bağlantı bilgisi `ConnectionStrings:PostgreSQL`, Gemini anahtarı `Gemini:ApiKey` yapılandırma anahtarlarından okunur. Geliştirme ortamındaki gizli değerler User Secrets içinde tutulur; sürüm kontrolündeki yapılandırma dosyalarında gizli değer bulunmamalıdır.

## Bağımlılıkların kaydı

`AddInfrastructureServices` uzantısı DbContext, Gemini için türlendirilmiş HTTP client, genel repository'ler, entity için özel repository'ler ve `IBillService` kaydını yapar. Service ve repository yaşam süreleri scoped'tur.

## Çalıştırma ve build

Backend:

```powershell
dotnet build backend/BenSanaAtarim.sln
dotnet run --project backend/BenSanaAtarim.Api/BenSanaAtarim.Api.csproj
```

Frontend:

```powershell
cd frontend
npm ci
npm run dev
npm run build
```
