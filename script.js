// RiveScript objesini oluştur
const bot = new RiveScript();

// HTML elementlerini al
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Mesajları ekrana yazdıran fonksiyon
function displayMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    // HTML etiketlerini temizlemek için textContent kullanıyoruz
    messageElement.textContent = message; // Güvenlik için textContent kullanın
    // Eğer RiveScript'te HTML kullanacaksanız innerHTML kullanabilirsiniz, dikkatli olun
    // messageElement.innerHTML = message;

    chatMessages.appendChild(messageElement);
    // En alta kaydır
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// RiveScript'i yükle
// brain.rive dosyasının yüklenmesini bekleyin
// Bot yüklendiğinde başlangıç mesajını gösterelim
bot.loadFile("brain.rive").then(() => {
    console.log("RiveScript loaded!");
    bot.sortReplies(); // RiveScript'in yanıtları sıralamasını sağla
    // Bot yüklendikten hemen sonra veya kısa bir gecikmeyle hoş geldin mesajı
    displayMessage("Merhaba! Ben RiveScript botuyum. Nasıl yardımcı olabilirim?", "bot");

}).catch(error => {
    console.error("Error loading RiveScript:", error);
    displayMessage("Üzgünüm, sohbet botu yüklenirken bir hata oluştu.", "bot");
    // Hata durumunda giriş alanını devre dışı bırak
    userInput.disabled = true;
    sendButton.disabled = true;
});

// Kullanıcı mesajını gönderen fonksiyon
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "") {
        return; // Boş mesaj gönderme
    }

    // 1. Kullanıcı mesajını hemen göster
    displayMessage(message, "user");

    // Giriş alanını temizle
    userInput.value = "";
    userInput.disabled = true; // Kullanıcı yeni bir mesaj yazarken botun yanıtı bekleniyor gibi göstermek için devre dışı bırak

    // 2. Bot yanıtı için rastgele gecikmeyi hesapla
    const delay = 300 + Math.random() * 500; // 300ms ile 800ms arasında rastgele gecikme

    // 3. Gecikmeden sonra bot yanıtını al ve göster
    setTimeout(async () => {
        try {
            // RiveScript'ten yanıt al
            const reply = await bot.reply("local-user", message); // "local-user" kullanıcı ID'si

            // Bot yanıtını göster
            displayMessage(reply, "bot");
        } catch (error) {
            console.error("Error getting RiveScript reply:", error);
            displayMessage("Üzgünüm, bir hata oluştu. Tekrar deneyin.", "bot");
        } finally {
            // Bot yanıtı geldikten veya hata oluştuğunda giriş alanını tekrar etkinleştir
            userInput.disabled = false;
            userInput.focus(); // Giriş alanına odaklan
        }
    }, delay);
}

// Gönderme butonuna tıklama olayını dinle
sendButton.addEventListener('click', sendMessage);

// Enter tuşuna basılmasını dinle
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Varsayılan form göndermeyi engelle
        sendMessage();
    }
});