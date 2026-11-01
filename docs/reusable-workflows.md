# Paylaşılan reusable workflow'lar

Bu repo (`Nergora/.github`), org'daki repoların **ortak CI kapılarını** barındırır. Amaç:
aynı kontrolü her repo kendi kopyasıyla taşımasın — kopyalar zamanla ayrışır ve biri
düzeltilince diğerleri eski kalır. Bir kontrol burada bir kez düzeltilir, çağıran repolar
kendiliğinden alır.

## `hygiene.yml`

Bir workflow dosyasındaki **tırnaksız** bir değerin içinde `": "` (iki nokta + boşluk)
geçemez. YAML bunu reddeder ve GitHub dosyayı **hiç parse edemez**:

- koşu `0 job` ile `failure` olur (log bile çıkmaz),
- workflow'un adı dosya yolu olarak görünür (`name` okunamaz),
- `on:` filtreleri uygulanmaz — workflow her branch'te koşar.

Bu hata `nergora-platform`'da `version.yml`'de günlerce sessizce durdu ve aynı gün üç kez
daha tekrarlandı. Bekçi, blok skaler gövdelerini (`run: |` altı) ve yorumları atlar; orada
`": "` serbesttir.

### Kullanım

Çağıran repo, kendi workflow dosyasına yalnız şunu ekler:

```yaml
jobs:
  hygiene:
    uses: Nergora/.github/.github/workflows/hygiene.yml@main
    with:
      node-version: "22"        # isteğe bağlı (varsayılan 22)
      workflows-path: ".github/workflows"   # isteğe bağlı
```

Yerelde aynı kontrol (çağıran repo kökünden):

```bash
git clone --depth 1 https://github.com/Nergora/.github /tmp/nergora-shared
node /tmp/nergora-shared/scripts/check-workflow-yaml.mjs .github/workflows
```

## Yeni bir ortak kontrol eklemek

Senaryoyu `scripts/` altına (bağımlılıksız Node) koyun ve `hygiene.yml`'e bir adım ekleyin.
Somut girdi gerekiyorsa `workflow_call.inputs`'a ekleyin; her repo varsayılanı aldığı için
mevcut çağıranlar değişmez.
