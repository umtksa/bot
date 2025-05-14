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
    cleanedText = cleanedText.replace(/'[^\\s]*/g, '');

    // 3. Diğer yaygın noktalama işaretlerini kaldır
    cleanedText = cleanedText.replace(/[.,!?;:"()\[\]{}]/g, '');

    // 4. Birden fazla ardışık boşluğu tek boşluğa indirge ve baştaki/sondaki boşlukları sil
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    // 5. Metni boşluklara göre kelimelere (tokens) ayır
    const tokens = cleanedText.split(' ');

    // 6. Bölme işleminden sonra oluşmuş olabilecek boş string token'ları filtrele
    return tokens.filter(token => token.length > 0);
}

// NOT: 'export' kullanılmadığı için bu fonksiyon, script.js'de
// bu dosya HTML'de ondan önce yüklendiğinde global olarak erişilebilir olacak.