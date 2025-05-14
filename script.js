// script.js

// clean.js dosyasındaki cleanAndTokenize fonksiyonu, bu script
// HTML'de clean.js'den SONRA yüklendiği için global olarak erişilebilir olacak.
// import { cleanAndTokenize } from './clean.js'; // Artık import yok

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
            event.preventDefault();
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
    displayMessage(rawInput, 'user-message');

    // Botun işlemeye başlamasını tetikle (Şimdilik sadece temizleme)
    processUserInput(rawInput)
        .then(botResponse => {
             // Bottan gelen cevabı (temizlenmiş tokenlar) ekrana ekle
             displayMessage(botResponse, 'bot-message');
        })
        .catch(error => {
            console.error("İşleme hatası:", error);
            displayMessage("Üzgünüm, bir hata oluştu.", 'bot-message');
        });

    // Input alanını temizle
    inputElement.value = '';
}

// --- Botun Ana İşleme Hattı Fonksiyonu (Şimdilik Sadece Temizleme) ---
async function processUserInput(rawInput) {
    console.log("Ham Girdi:", rawInput);

    // 1. Girdiyi temizle ve kelimelere ayır (Tokenize)
    // clean.js dosyasındaki global cleanAndTokenize fonksiyonunu çağırıyoruz.
    const tokens = cleanAndTokenize(rawInput); // Doğrudan çağrı

    console.log("Temizlenmiş Tokenlar:", tokens);

    // --- Cevap Üretme (Temizlenmiş Tokenları Göster) ---
    // Bot şu aşamada sadece temizleme yapıyor ve sonucunu gösteriyor.
    if (tokens.length > 0) {
         return `_Temizlenmiş kelimeler:_ ${tokens.join(', ')}`;
    } else {
         return "_Bot: Lütfen geçerli bir şeyler yazın._";
    }

    // Sonraki adımlar (stemming, entity recognition, vb.) buraya eklenecek.
}

// --- Yardımcı Fonksiyon: Mesajı Ekrana Ekle ---
// Sizin HTML'inizdeki yapı ve sınıflara göre güncellendi.
function displayMessage(message, className) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.textContent = message;

    setTimeout(() => {
         outputElement.appendChild(messageElement);
         outputElement.scrollTop = outputElement.scrollHeight;
    }, 50); // Küçük gecikme animasyon için

}

// Bot başladığında ilk mesajı göster (Sizin HTML'inizdeki hazır mesajı kullanıyoruz)
// displayMessage("Selam ben Ahraz. ...", 'bot-message'); // Bu satır yoruma alındı, HTML'deki görünecek