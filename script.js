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
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    // En alta kaydır
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// RiveScript'i yükle
// brain.rive dosyasının yüklenmesini bekleyin
bot.loadFile("brain.rive").then(() => {
    console.log("RiveScript loaded!");
    bot.sortReplies(); // RiveScript'in yanıtları sıralamasını sağla
    // İlk hoş geldin mesajı için bir delay eklemeyebiliriz veya ekleyebiliriz
    displayMessage("Merhaba! Ben Ahraz. Nasıl yardımcı olabilirim?", "bot");

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

    // Kullanıcı mesajını göster
    displayMessage(message, "user");

    // Giriş alanını temizle
    userInput.value = "";

    // RiveScript'ten yanıt al (await kullanarak asenkron işlemi bekle)
    try {
        // Yanıt gelmeden önce bir "..." veya benzeri yazma göstergesi ekleyebiliriz
        // Örneğin: displayMessage("...", "bot"); // Bu kısmı isterseniz ekleyebilirsiniz

        const reply = await bot.reply("local-user", message); // "local-user" kullanıcı ID'si

        // Bot yanıtını göstermeden önce rastgele bir gecikme ekle
        const delay = 300 + Math.random() * 500; // 300ms ile 800ms arasında rastgele gecikme (300 + 0-499.99)

        setTimeout(() => {
            // Yazma göstergesini kaldırma (eğer eklediyseniz)
            // Örneğin: chatMessages.lastChild.remove();

            // Bot yanıtını göster
            displayMessage(reply, "bot");
        }, delay);

    } catch (error) {
        console.error("Error getting RiveScript reply:", error);
        // Hata durumunda hata mesajını hemen göster
        displayMessage("Üzgünüm, bir hata oluştu. Tekrar deneyin.", "bot");
    }
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