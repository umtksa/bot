// script.js

// clean.js dosyasındaki cleanAndTokenize fonksiyonu, bu script
// HTML'de clean.js'den SONRA yüklendiği için global olarak erişilebilir olacak.
// Modül import'u bu aşamada kullanılmıyor.

// --- HTML Elementlerine Referanslar ---
// Sizin HTML'inizdeki ID'lere göre güncellendi.
const inputElement = document.getElementById('userInput');
const outputElement = document.getElementById('chatMessages');
const sendButton = document.getElementById('sendButton');

// --- Olay Dinleyicileri (Event Listeners) ---
if (sendButton) {
    sendButton.addEventListener('click', handleUserInput);
} else {
    console.error("Hata: 'sendButton' id'li element bulunamadı!");
}

if (inputElement) {
    inputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Form submit olmasını engeller
            handleUserInput();
        }
    });
     inputElement.focus(); // Başlangıçta input'a odaklan
} else {
    console.error("Hata: 'userInput' id'li element bulunamadı!");
}

// --- Kullanıcı Girdisini İşleyen Fonksiyon ---
function handleUserInput() {
    const rawInput = inputElement.value;
    if (!rawInput.trim()) {
        return; // Boş girdi işleme
    }

    // Kullanıcının mesajını ekrana ekle
    // Sizin HTML'inizdeki stil sınıflarına göre 'user-message' kullandık.
    displayMessage(rawInput, 'user-message'); // Sadece mesaj içeriğini gönder

    // Botun işlemeye başlamasını tetikle (Şimdilik sadece temizleme)
    processUserInput(rawInput)
        .then(processedResult => { // Artık token dizisi gelecek
             // Bottan gelen sonucu (token dizisi) ekrana ekle
             // Sonucu ekrana basmadan önce formatlayalım (örneğin bir stringe çevirelim)
             let botResponse;
             if (Array.isArray(processedResult)) {
                 // Eğer işlem token dizisi döndürdüyse, formatlayarak göster
                 botResponse = `_Temizlenmiş kelimeler:_ ${processedResult.join(', ')}`;
             } else {
                 // Eğer başka bir şey döndürdüyse (olmamalı şu aşamada), doğrudan göster
                 botResponse = processedResult;
             }

             displayMessage(botResponse, 'bot-message');
        })
        .catch(error => {
            console.error("İşleme hatası:", error);
            displayMessage("Üzgünüm, bir hata oluştu.", 'bot-message');
        });

    inputElement.value = ''; // Input alanını temizle
    inputElement.focus(); // İmleci input alanında tut
}

// --- Botun Ana İşleme Hattı Fonksiyonu (Şimdilik Sadece Temizleme) ---
// Kullanıcı girdisini alır ve temizlenmiş tokenları döndürür.
async function processUserInput(rawInput) {
    console.log("Ham Girdi:", rawInput);

    // 1. Girdiyi temizle ve kelimelere ayır (Tokenize)
    // clean.js dosyasındaki global cleanAndTokenize fonksiyonunu çağırıyoruz.
    const tokens = cleanAndTokenize(rawInput); // Doğrudan global çağrı

    console.log("Temizlenmiş Tokenlar:", tokens);

    // --- Sonucu Döndür (Sadece Temizlenmiş Token Dizisi) ---
    // Bot bu aşamada sadece temizleme yapıyor.
    // Sadece token dizisini döndürüyoruz.
    return tokens;

    // Sonraki adımlar (stemming, entity recognition, vb.) buraya eklenecek.
}

// --- Yardımcı Fonksiyon: Mesajı Ekrana Ekle ---
// Sizin HTML'inizdeki yapı ve sınıflara göre güncellendi.
function displayMessage(message, className) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.textContent = message;

    // Küçük bir gecikme ekleyerek animasyonun düzgün görünmesini sağlar
    setTimeout(() => {
         outputElement.appendChild(messageElement);
          // Sohbet kutusunu otomatik olarak en son mesaja kaydır
         outputElement.scrollTop = outputElement.scrollHeight;
    }, 50); // 50ms gecikme

}

// Bot başladığında ilk mesajı göster (Sizin HTML'inizdeki hazır mesajı kullanıyoruz)
// displayMessage("Selam ben Ahraz. ...", 'bot-message'); // Bu satır yoruma alındı, HTML'deki görünecek