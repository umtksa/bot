// stemmer.js (Sadeleştirildi - Tek Birleşik Sözlük)

// Tek Birleşik Sözlük: Anahtar (Kök veya Kategori) -> Değer (O köke/kategoriye karşılık gelen tüm tek kelimeler)
// Tek kelimeleri içerir, çok kelimeli ifadeler bu yapıya dahil değildir (şimdilik).
const processingDictionary = {
    // Kategoriler
    "soru": ["ne", "nedir", "neydi", "mi", "misin", "musun", "mısın", "söyler", "söyleyebilir", "yapar", "yapabilir", "verir", "verebilir", "bulur", "bulabilir", "kaç", "kaçtır"],
    "il": ["il", "ili", "ilinin"],
    "plaka": ["plaka", "plakası", "plakasını"], // "plaka" kelimesinin kendisini de ekledik
    "numara": ["numara", "numarası"], // "numara" kelimesinin kendisini de ekledik
    "kod": ["kod", "kodu", "kodunu", "kodlu"], // "kod" kelimesinin kendisini ekledik

};



function kokBul(word) { // Global olarak erişilebilir
    const lowerWord = word; // cleanAndTokenize'dan gelen kelimeler zaten küçük harf ve temizlenmiş olmalı.

    // Sözlükteki tüm anahtarların (kök/kategori) değerlerine bak.
    for (const key in processingDictionary) {
        if (processingDictionary.hasOwnProperty(key)) {
            const words = processingDictionary[key]; // O anahtarın tüm kelime varyasyonları

            // Aranan kelime, bu anahtarın varyasyonları arasında var mı?
            if (words.includes(lowerWord)) {
                return key; // Eşleşme bulundu, anahtarı (kök veya kategori adı) döndür.
            }
        }
    }

    // Eğer kelime sözlükte hiçbir yerde bulunamazsa, kelimenin kendisini döndür.
    return lowerWord;
}

// Sözlük ve fonksiyon bu dosyada kalacak.
// categories, traditionalStems, allCategoryNames artık yok.
// deduplicateTokens ve processAndDeduplicate de yok.