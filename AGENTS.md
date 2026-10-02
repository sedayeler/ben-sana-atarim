# Repository Agent Rehberi

Bu repository üzerinde çalışmadan önce ilgili `docs/` belgelerini oku ve source of truth olarak kullan:

- Ürün kapsamı ve açık kararlar: `docs/product.md`
- Teknik yapı: `docs/architecture.md`
- Kesin business kuralları: `docs/business-rules.md`

## Çalışma kuralları

- Mevcut service-centric mimariyi koru.
- İş kuralları service katmanında uygulanmalı.
- Entity'lere iş kuralı veya işlem metotları ekleme; constructor'lar kullanılabilir.
- Gereksiz soyutlama veya refactor yapma.
- CQRS, MediatR, Unit of Work ya da benzeri bir yapı gerekliyse önce kullanıcıya sor.
- Yeni soyutlama oluşturmadan önce mevcut service ve repository kalıplarını kullan.
- Normal teknik uygulama ayrıntılarında mevcut mimariye ve repository kalıplarına uygun en basit çözümü seç. Ürün veya iş davranışını etkileyen, mevcut source of truth belgelerinde cevabı bulunmayan veya mevcut mimariden anlamlı biçimde sapmayı gerektiren kararları kullanıcıya sor. Gelecekteki özelliklere ait kararları gereksiz yere önceden tasarlama.
- Eksik ürün veya iş kararlarını kendin verme; kullanıcıya sor ve ilgili belgeye ekle.
- İstenen kapsamın dışındaki production koduna dokunma.
- Doküman ile kod çelişirse değişiklik yapmadan önce çelişkiyi kullanıcıya bildir.

## Dil standardı

- İnsan tarafından okunacak proje ve agent dokümantasyonunun ana dili Türkçe'dir.
- Kod identifier'ları ve teknik isimler mevcut İngilizce halleriyle korunur.
- Kod ve komutlar dil standardizasyonu amacıyla değiştirilmez.

## Lead ve subagent akışı

Kapsamı belirli backend feature görevlerinde ana agent Lead'dir. Lead önce bu dosyayı, ilgili `docs/` belgelerini, ilgili skill'leri ve gerekli mevcut kodu inceler. Mevcut feature için zorunlu, belgelerde yanıtı olmayan ürün veya iş kararını kullanıcıya sorar; yanıt gelmeden karara bağlı işe devam etmez. Gerekirse karar ilgili source of truth belgesine işlenir. Olağan teknik ayrıntıları mevcut mimariye uygun en basit yöntemle çözer; gelecekteki özellikleri önceden tasarlamaz.
Lead, uygulamayı `.codex/agents/implementer.toml` rolüne sınırları belirli görev olarak devreder ve tamamlanmasını bekler. Ardından `.codex/agents/reviewer.toml` rolüyle bağımsız review başlatır. Reviewer somut hata bulursa Lead bulguyu değerlendirir; doğrulanmış hata için Implementer'a yalnızca gerekli düzeltmeyi verir ve gerektiğinde yeniden review yaptırır. Varsayımsal mimari önerilerini otomatik kabul etmez. Her iki agent'tan gelen `decision-needed` bildirimini değerlendirir; gerçek ürün veya iş kararını kullanıcıya yönlendirir. Sonunda uygulama, build ve review sonucunu kullanıcıya kısaca raporlar.
Implementer production backend kodunun tek yazarıdır. Reviewer read-only çalışır; review, implementation tamamlanmadan başlamaz. Lead olağan akışta production kodunun başlıca yazarı değildir. Bu akışta test agent veya hook oluşturulmaz ve commit atılmaz.
Codex istemcisi named agent seçimini sunuyorsa `implementer` ve `reviewer` rollerini kullan. İstemci yalnızca genel subagent başlatmayı sunuyorsa göreve rolü ve ilgili skill yolunu açıkça ver; iki subagent için de `gpt-6-luna` modelini seç ve aynı sıralı akışı koru.
