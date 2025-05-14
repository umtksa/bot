// script.js

// --- HTML Elementlerine Referanslar ---
const inputElement = document.getElementById('userInput');
const outputElement = document.getElementById('chatMessages');
const sendButton = document.getElementById('sendButton');

// --- Sayfa Yüklendiğinde UI Aktif Hale Gelir ---
inputElement.placeholder = "hıms...";
inputElement.focus(); // Başlangıçta input'a odaklan


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
} else {
    console.error("Hata: 'userInput' id'li element bulunamadı!");
}

// --- Kullanıcı Girdisini İşleyen Fonksiyon ---
function handleUserInput() {
    const rawInput = inputElement.value;
    if (!rawInput.trim()) {
        return; // Boş girdi işleme
    }

    displayMessage(rawInput, 'user-message');

    // İşleme hattını başlat
    processUserInput(rawInput)
        .then(stemmedResult => { // Stemlenmiş (Tekrar silinmemiş) token dizisi dönecek
             let botResponseText = "İşlem sonucu:";
             if (Array.isArray(stemmedResult)) {
                 // Stemlenmiş tokenları göster
                 // Çıktı mesajı aynı kalıyor
                 botResponseText = `[${stemmedResult.join(', ')}]`;
             } else {
                  botResponseText = "_Bot: İşleme sonucu alınamadı._";
             }

             displayMessage(botResponseText, 'bot-message');
        })
        .catch(error => {
            console.error("İşleme hatası:", error);
            displayMessage("Üzgünüm, bir hata oluştu.", 'bot-message');
        });

    inputElement.value = '';
    inputElement.focus();
}


async function processUserInput(rawInput) {
    const cleanedTokens = cleanAndTokenize(rawInput);
    const stemmedTokens = cleanedTokens.map(token => kokBul(token));
    return stemmedTokens; 

}

// --- Yardımcı Fonksiyon: Mesajı Ekrana Ekle ---
function displayMessage(message, className) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.textContent = message;

    setTimeout(() => {
         outputElement.appendChild(messageElement);
         outputElement.scrollTop = outputElement.scrollHeight;
    }, 50); // Küçük gecikme animasyon için
}

// Bot başladığında ilk mesajı göster (HTML'inizdeki hazır mesajı kullanıyoruz)
displayMessage("Selam ben Ahraz...", 'bot-message'); // Bu satır hala yoruma alındı