// script.js (Güncellenmiş)

// ... (clean.js ve stemmer.js import satırları - şimdilik hala yoruma alınmış)

// ... (HTML Element Referansları)

// ... (Olay Dinleyicileri)

// --- Kullanıcı Girdisini İşleyen Fonksiyon ---
function handleUserInput() {
    const rawInput = inputElement.value;
    if (!rawInput.trim()) {
        return; // Boş girdi işleme
    }

    // Kullanıcının mesajını ekrana ekle
    displayMessage(rawInput, 'user-message');

    // Botun işlemeye başlamasını tetikle
    processUserInput(rawInput)
        .then(processedResult => { // Artık token dizisi veya başka bir sonuç gelecek
             // Bottan gelen sonucu ekrana ekle
             // Sonucu ekrana basmadan önce formatlayalım (örneğin bir stringe çevirelim)
             let botResponse;
             if (Array.isArray(processedResult)) {
                 // Eğer işlem token dizisi döndürdüyse
                 botResponse = `_İşlem sonucu:_ ${processedResult.join(', ')}`;
             } else {
                 // Eğer başka bir string döndürdüyse (ilerideki cevaplar gibi)
                 botResponse = processedResult;
             }

             displayMessage(botResponse, 'bot-message');
        })
        .catch(error => {
            console.error("İşleme hatası:", error);
            displayMessage("Üzgünüm, bir hata oluştu.", 'bot-message');
        });

    inputElement.value = '';
    inputElement.focus();
}

// --- Botun Ana İşleme Hattı Fonksiyonu (Şimdilik Sadece Temizleme) ---
async function processUserInput(rawInput) {
    console.log("Ham Girdi:", rawInput);

    // 1. Girdiyi temizle ve kelimelere ayır (Tokenize)
    // clean.js dosyasındaki global cleanAndTokenize fonksiyonunu çağırıyoruz.
    const tokens = cleanAndTokenize(rawInput); // Doğrudan çağrı

    console.log("Temizlenmiş Tokenlar:", tokens);

    // --- Sonucu Döndür (Sadece Temizlenmiş Token Dizisi) ---
    // Bot bu aşamada sadece temizleme yapıyor.
    // Sadece token dizisini döndürüyoruz, formatlama displayMessage'dan önce handleUserInput'ta yapılıyor.
    return tokens; // Sadece token dizisini döndür

    // Sonraki adımlar buraya eklenecek.
}

// ... (displayMessage ve ilk bot mesajı fonksiyonları)