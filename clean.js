// clean.js

/**
 * Metni temizler, küçük harfe çevirir, tırnaklı ekleri ve diğer yaygın noktalama işaretlerini kaldırır,
 * ve kelimelere ayırır.
 *
 * @param {string} text - İşlenecek ham metin.
 * @returns {string[]} - Temizlenmiş ve kelimelere ayrılmış kelimeler dizisi (tokens).
 */
function cleanAndTokenize(text) { // 'export' kelimesi kaldırıldı
    if (!text) {
        return []; // Boş veya null girdi için boş dizi döndür
    }

    // 1. Küçük harfe çevir
    let cleanedText = text.toLowerCase();

    // 2. Özel isimlere eklenen tırnaklı ekleri kaldır (örn: Ankara'nın -> Ankara)
    // Regex: ' karakterini ve ardından gelen boşluk olmayan (herhangi bir) karakter grubunu bul.
    // Bu desenleri boş string ile değiştiriyoruz. Bu, kelimeye bitişik tırnak ve eki kaldırır.
    // Global flag (g) ile metindeki tüm eşleşmeleri değiştir.
    cleanedText = cleanedText.replace(/'[^\\s]*/g, '');

    // 3. Diğer yaygın noktalama işaretlerini kaldır
    // Noktalama işaretlerini bir karakter sınıfı içinde listeledik.
    // Global flag (g) ile metindeki tüm eşleşmeleri değiştir.
    cleanedText = cleanedText.replace(/[.,!?;:"()\[\]{}]/g, '');

    // 4. Birden fazla ardışık boşluğu tek boşluğa indirge ve baştaki/sondaki boşlukları sil
    // Regex: Bir veya daha fazla boşluk karakterini bul. Global flag (g) ile tümünü değiştir.
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    // 5. Metni boşluklara göre kelimelere (tokens) ayır
    // trim() sonrası split('') boş stringe sahip tek elemanlı dizi dönebilir, bu yüzden filter lazım.
    const tokens = cleanedText.split(' ');

    // 6. Bölme işleminden sonra oluşmuş olabilecek boş string token'ları filtrele
    return tokens.filter(token => token.length > 0);
}

// clean.js dosyasındaki cleanAndTokenize fonksiyonu, script.js'de
// bu dosya HTML'de ondan önce yüklendiğinde global olarak erişilebilir olacak.