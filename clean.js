// clean.js (Stop Word Silme Eklendi)

// Yaygın Türkçe Stop Word'ler listesi (Set olarak tanımlandı, araması daha hızlı)
// Bu listeyi ihtiyaçlarınıza göre genişletebilirsiniz.
const stopWords = new Set([
    "ama", "ile", "ve", "da", "de", "bana", "acaba"
]);


function cleanAndTokenize(text) {
    if (!text) {
        return [];
    }

    const rawTokens = text.split(/\s+/);
    const cleanedTokens = [];

    for (const rawToken of rawTokens) {
        if (!rawToken) {
            continue;
        }

        let processedToken = rawToken;

        const apostropheIndex = processedToken.indexOf("'");
        if (apostropheIndex !== -1) {
            processedToken = processedToken.substring(0, apostropheIndex);
        }

        processedToken = processedToken.replace(/[.,!?;:"()\[\]{}]/g, '');
        processedToken = processedToken.toLowerCase();

        // İşlem sonrası kelime boş kalmış mı kontrol et
        if (processedToken.length > 0) {
            // --- Stop Word Kontrolü ---
            // Eğer kelime stopWords listesinde DEĞİLSE, nihai listeye ekle
            if (!stopWords.has(processedToken)) {
                 cleanedTokens.push(processedToken);
            } else {
                 // console.log(`Stop word silindi: '${processedToken}'`); // Debug için eklenebilir
            }
        }
    }

    return cleanedTokens; // Temizlenmiş ve stop word'leri silinmiş kelimeler dizisi
}