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
- `Participant`: Bill kimliği, username, host ve ready durumu.
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
- Fiş okuma ve Bill ayrıntı sonuç modelleri.

Application kalıcılık veya AI sağlayıcı uygulaması içermez.

### Infrastructure

`BenSanaAtarim.Infrastructure` şunları içerir:

- PostgreSQL için `BenSanaAtarimDbContext`.
- Genel ve entity için özel EF Core repository uygulamaları.
- `BillService` iş kuralları uygulaması.
- Gemini REST API kullanan `GeminiReceiptParser`.
- Bağımlılık kayıtları.
- EF Core migration dosyaları; mevcut ilk migration `InitialCreate`dır.

Mevcut mimari service merkezlidir. İş kararları `BillService` içinde uygulanır. Repository'ler sorgular ve private setter'lı durumun EF Core üzerinden kaydedilmesi için kullanılır.

### API

`BenSanaAtarim.Api` bağımlılıkların birleştirildiği giriş noktasıdır. `Program.cs`, Infrastructure servislerini configuration ile kaydeder ve uygulamayı çalıştırır. Henüz controller, minimal API endpoint veya başka bir HTTP arayüzü yoktur.

### Frontend

Frontend React 19, TypeScript 5.9 ve Vite 7 kullanır. Paket adı `ben-sana-atarim`dır. `App` şu anda boş bir `<main />` render eder; ürün UI'ı henüz geliştirilmemiştir. Paket yöneticisi dosyaları pnpm kullanıldığını gösterir.

## Kalıcılık modeli

`BenSanaAtarimDbContext` dört DbSet içerir: Bills, Participants, BillItems ve ItemSelections. PostgreSQL tablo adları sırasıyla `bills`, `participants`, `bill_items` ve `item_selections` olarak eşlenir.

Kesin EF Core kuralları:

- Bill code zorunlu, en fazla 12 karakter ve benzersiz bir indexe sahiptir.
- Participant username zorunlu ve en fazla 50 karakterdir; aynı Bill içindeki username değerleri case-insensitive unique olmalıdır. Kullanıcının girdiği casing gösterim için korunur.
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
pnpm install
pnpm dev
pnpm build
```

## Henüz bulunmayan teknik yapılar

Repository'de test projesi, CQRS, MediatR, Unit of Work, controller, endpoint, SignalR veya frontend özellik yapısı bulunmaz.
