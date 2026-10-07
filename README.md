# ben sana atarım

**HESAP GELDİ. PANİK YOK.**

Arkadaşlarla restoran hesabını bölüşmenin en kolay yolu.

**Fişi çek → QR'ı ortaya koy → herkes kendi yediğini seçsin → kimin ne kadar ödeyeceği kuruşu kuruşuna belli olsun.**

**Canlı:** [https://bensanaatarim.onrender.com/](CANLI_SITE_LINKI)  

## Nasıl çalışır?

1. **Masa kur**: Bir kişi adını girerek masayı oluşturur. Paylaşılabilir bir masa kodu ve QR oluşur.
2. **Arkadaşlarını çağır**: Masadakiler QR, davet linki veya masa koduyla kendi isimlerini girerek katılır. Üyelik gerekmez.
3. **Fişi okut**: Host fişin fotoğrafını yükler. Gemini fişteki kalemleri ve servis ücretini yapılandırılmış veriye dönüştürür. Host sonucu kontrol edip gerekirse düzeltir ve onaylar.
4. **Yediklerini seç**: Herkes kendi tükettiği kalemleri seçer. Birden fazla adet içeren ürünler adet bazında, paylaşımlı ürünler ise seçen kişiler arasında bölüştürülebilir.
5. **Hazır ol**: Seçimini tamamlayan herkes **“Seçimim bitti”** diyerek hazır durumuna geçer.
6. **Hesabı kes**: Tüm kalemler dağıtılıp herkes hazır olduğunda host hesabı keser. Herkesin ödeyeceği tutar kuruşu kuruşuna hesaplanır.

Gerekirse host hesabı yeniden açabilir. Mevcut seçimler korunur, hazır durumları sıfırlanır ve masa tekrar düzenlenebilir.
Masadaki değişiklikler **SignalR** üzerinden gerçek zamanlı olarak tüm katılımcılara yansır.

## Özellikler

- 📷 Fiş fotoğrafından Gemini ile otomatik kalem okuma
- 📱 QR ve davet linki ile hızlı katılım
- 👤 Üyeliksiz, masa bazlı katılımcı sistemi
- ⚡ SignalR ile gerçek zamanlı masa güncellemeleri
- 🍽️ Adetli ve paylaşımlı kalem bölüşümü
- 💸 Servis ücretinin katılımcılar arasında eşit dağıtılması
- 🧮 Kuruş kaybı olmayan deterministik hesaplama
- 🔒 Eşzamanlı seçimlerde adet çakışmalarına karşı backend koruması
- 🔑 Cihaza bağlı, kişiye özel erişim token'ı
- 🔄 Kesilmiş hesabı yeniden açabilme
- 🇹🇷 Türkçe ve mobil öncelikli arayüz
- 💰 TRY para birimi ve iki ondalık basamaklı hesaplama

Fiş yükleme JPEG, PNG ve WebP formatlarını destekler. Maksimum dosya boyutu **10 MB**'tır.

## Teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Backend | .NET 10, ASP.NET Core Web API |
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Realtime | SignalR |
| Veri | PostgreSQL |
| ORM | Entity Framework Core 10 |
| Yapay zekâ | Google Gemini |

## Gereksinimler

Projeyi local ortamda çalıştırmak için:

- .NET 10 SDK
- Node.js 24
- npm
- PostgreSQL
- Google Gemini API anahtarı

gereklidir.

## Local kurulum

### 1. Repository'yi klonla

```bash
git clone <REPOSITORY_URL>
cd ben-sana-atarim
```

### 2. Backend secret'larını ayarla

Gizli bilgiler kaynak kod içerisinde tutulmamalıdır.

Development ortamında .NET User Secrets kullanılabilir:

```bash
cd backend/BenSanaAtarim.Api

dotnet user-secrets set \
  "ConnectionStrings:PostgreSQL" \
  "Host=localhost;Port=5432;Database=bensanaatarim;Username=<kullanici>;Password=<parola>"

dotnet user-secrets set \
  "Gemini:ApiKey" \
  "<gemini-api-anahtari>"
```

Kullanılacak Gemini modeli `appsettings.json` içerisindeki:

```text
Gemini:Model
```

ayarı üzerinden yapılandırılabilir.

### 3. Veritabanını oluştur

```bash
cd backend

dotnet ef database update \
  --project BenSanaAtarim.Infrastructure \
  --startup-project BenSanaAtarim.Api
```

### 4. Backend'i çalıştır

```bash
cd backend

dotnet run \
  --project BenSanaAtarim.Api \
  --launch-profile http
```

Development ortamında backend varsayılan olarak:

```text
http://localhost:5037
```

adresinde çalışır.

Swagger:

```text
http://localhost:5037/swagger
```

### 5. Frontend'i çalıştır

Yeni bir terminal aç:

```bash
cd frontend

npm install
npm run dev
```

Development ortamında Vite, `/api` ve `/hubs` isteklerini backend'e proxy eder.

SignalR WebSocket bağlantıları da aynı proxy üzerinden yönlendirilir.
