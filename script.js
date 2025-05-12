// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
let botData = {}; // Yüklenen JSON verilerini depolamak için

// data.json dosyasını yükleme fonksiyonu
async function loadBotData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        botData = await response.json();
        console.log("Bot verileri başarıyla yüklendi:", botData);
    } catch (error) {
        console.error("Bot verileri yüklenirken bir hata oluştu:", error);
        addMessage("Bot verileri yüklenirken bir hata oluştu.", "bot");
    }
}

// Sohbet arayüzüne mesaj ekleme fonksiyonu
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    // Otomatik olarak en aşağıya kaydır
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // Kullanıcı girdisini küçük harfe çevir ve Türkçe karakterleri normalleştir
    const cleanedInput = input.toLowerCase().normalize("NFC");
    // Kelimelere ayır
    const inputTokens = cleanedInput.split(/\s+/).filter(word => word.length > 0);

    let bestMatchScore = 0;
    let bestMatchResponse = "Üzgünüm, sorunuzu tam olarak anlayamadım."; // Varsayılan yanıt

    // Her bir data.json anahtarını (soru şablonunu) kontrol et
    for (const key in botData) {
        // Anahtarı küçük harfe çevir, virgüllerden ayır ve boşlukları temizle
        const normalizedKey = key.toLowerCase().normalize("NFC");
        const keyWords = normalizedKey.split(',').map(word => word.trim()).filter(word => word.length > 0);

        if (keyWords.length === 0) continue; // Boş anahtarları atla

        let matchCount = 0;
        // Anahtar kelimelerin kullanıcı girdisinde olup olmadığını kontrol et
        for (const keyWord of keyWords) {
            // inputToken.includes(keyWord) kullanarak esnek eşleşme sağlarız.
            // Örneğin, "plakası" içinde "plaka"yı bulur.
            const foundInInput = inputTokens.some(inputToken => inputToken.includes(keyWord));
            if (foundInInput) {
                matchCount++;
            }
        }

        // Eşleşme puanını hesapla (eşleşen kelime sayısı / toplam anahtar kelime sayısı)
        const currentScore = matchCount / keyWords.length;

        // Daha iyi bir eşleşme bulunursa güncelle
        if (currentScore > bestMatchScore) {
            bestMatchScore = currentScore;
            bestMatchResponse = botData[key];
        }
    }

    // Yanıtın dinamik içeriğini (saat, tarih) güncelle
    if (bestMatchResponse.includes('{{currentTime}}')) {
        bestMatchResponse = bestMatchResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR'));
    }
    if (bestMatchResponse.includes('{{currentDate}}')) {
        bestMatchResponse = bestMatchResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }

    // Minimum bir güven puanı eşiği belirleyebilirsiniz.
    // Örneğin, %30'dan az eşleşme varsa varsayılan mesajı döndür.
    const responseThreshold = 0.4; 
    if (bestMatchScore < responseThreshold) {
        return `Üzgünüm, sorunuzu tam olarak anlayamadım. ${bestMatchScore.toFixed(2)}`;
    }

    return `${bestMatchResponse} ${bestMatchScore.toFixed(2)}`;
}

// Mesaj gönderme fonksiyonu
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') {
        return; // Boş mesaj gönderme
    }

    // Kullanıcı mesajını arayüze ekle
    addMessage(messageText, 'user');
    userInput.value = ''; // Giriş alanını temizle

    // Bot yanıtını bir gecikmeyle işle ve ekle (yazıyormuş gibi bir his verir)
    setTimeout(() => {
        const botResponse = processUserInput(messageText);
        addMessage(botResponse, 'bot');
    }, 300 + Math.random() * 300);
}

// Gönder butonuna tıklama olay dinleyicisi
document.getElementById('sendButton').addEventListener('click', sendMessage);

// Giriş alanında 'Enter' tuşuna basma olay dinleyicisi
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Sayfa yüklendiğinde bot verilerini yükle
document.addEventListener('DOMContentLoaded', loadBotData);

// Sayfa yüklendiğinde hoş geldin mesajını ekle
// Not: HTML'de zaten bu mesaj varsa, buradan ekleme yapmaya gerek kalmayabilir.
// Eğer HTML'deki hoş geldin mesajının script tarafından yönetilmesini isterseniz
// HTML'deki <div class="message bot-message">Selam ben Ahraz...</div> kısmını kaldırabilirsiniz.
// addMessage("Selam ben Ahraz. Tarih, saat, matematik, plaka, başkentler falan hakimim.", "bot");