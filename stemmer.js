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
    "su": ["su", "suyun"], // "su" kelimesinin kendisini ekledik
    // iller
    "adana": ["adana", "adanada", "adananın"],
    "adıyaman": ["adıyaman", "adıyamanda", "adıyamanın"],
    "afyon": ["afyon", "afyonda", "afyonun"],
    "ağrı": ["ağrı", "ağrıda", "ağrının"],
    "amasya": ["amasya", "amasyada", "amasyanın"],
    "ankara": ["ankara", "ankarada", "ankaranın"],
    "antalya": ["antalya", "antalyada", "antalyanın"],
    "artvin": ["artvin", "artvinde", "artvinin"],
    "aydın": ["aydın", "aydında", "aydının"],
    "balıkesir": ["balıkesir", "balıkesirde", "balıkesirin"],
    "bilecik": ["bilecik", "bilecikte", "bilecikin"],
    "bingöl": ["bingöl", "bingöl'de", "bingöl'ün"],
    "bitlis": ["bitlis", "bitlis'te", "bitlis'in"],
    "bolu": ["bolu", "boluda", "bolunun"],
    "burdur": ["burdur", "burdura", "burdurun"],
    "bursa": ["bursa", "bursada", "bursanın"],
    "çanakkale": ["çanakkale", "çanakkalede", "çanakkalenin"],
    "çankırı": ["çankırı", "çankırıda", "çankırının"],
    "çorum": ["çorum", "çorumda", "çorumun"],
    "denizli": ["denizli", "denizlide", "denizlinin"],
    "diyarbakır": ["diyarbakır", "diyarbakırda", "diyarbakırın"],
    "edirne": ["edirne", "edirnede", "edirnenin"],
    "elazığ": ["elazığ", "elazığda", "elazığın"],
    "erzincan": ["erzincan", "erzincanda", "erzincanın"],
    "erzurum": ["erzurum", "erzurumda", "erzurumun"],
    "eskişehir": ["eskişehir", "eskişehirdede", "eskişehirin"],
    "gaziantep": ["gaziantep", "gaziantepte", "gaziantepin"],
    "giresun": ["giresun", "giresunda", "giresunun"],
    "gümüşhane": ["gümüşhane", "gümüşhanede", "gümüşhanenin"],
    "hakkari": ["hakkari", "hakkaride", "hakkarinin"],
    "hatay": ["hatay", "hatayda", "hatayın"],
    "ısparta": ["ısparta", "ıspartada", "ıspartanın"],
    "istanbul": ["istanbul", "istanbulda", "istanbulun"],
    "izmir": ["izmir", "izmirdede", "izmirin"],
    "karabük": ["karabük", "karabükte", "karabükün"],
    "karaman": ["karaman", "karamanda", "karamanın"]
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