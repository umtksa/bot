// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const chatContainer = document.getElementById('chatContainer'); // chat-container elementini yakala
const ocrSpinner = document.getElementById('ocrSpinner'); // Spinner elementini yakala
let botData = {}; // Yüklenen JSON verilerini depolamak için

// Tesseract.js worker değişkeni
let ocrWorker;

// Tesseract.js worker'ını başlatma fonksiyonu
async function initializeOcrWorker() {
    addMessage("OCR motoru başlatılıyor...", "bot");
    try {
        // 'tur' Türkçe dil paketi için. İhtiyaca göre başka diller de eklenebilir.
        // Örneğin: 'eng+tur' hem İngilizce hem Türkçe için.
        ocrWorker = await Tesseract.createWorker('tur');
        await ocrWorker.loadLanguage('tur');
        await ocrWorker.initialize('tur');
        addMessage("OCR motoru hazır. Görsel sürükleyip bırakabilirsiniz.", "bot");
    } catch (error) {
        console.error("Tesseract OCR motoru başlatılırken hata oluştu:", error);
        addMessage("OCR motoru başlatılamadı. Lütfen konsolu kontrol edin.", "bot");
    }
}

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
        bestMatchResponse = bestMatchResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    }
    if (bestMatchResponse.includes('{{currentDate}}')) {
        bestMatchResponse = bestMatchResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }

    // Minimum bir güven puanı eşiği belirleyebilirsiniz.
    // Örneğin, %30'dan az eşleşme varsa varsayılan mesajı döndür.
    const responseThreshold = 0.4;
    if (bestMatchScore < responseThreshold) {
        return `tam olarak anlayamadım.`;
    }

    return `${bestMatchResponse}`;
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

// OCR işlemini gerçekleştiren fonksiyon
async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil. Lütfen bekleyin veya sayfayı yenileyin.", "bot");
        return;
    }

    addMessage("Görsel işleniyor, lütfen bekleyin...", "bot");
    ocrSpinner.style.display = 'block'; // Spinner'ı göster

    try {
        const { data: { text } } = await ocrWorker.recognize(imageFile);
        ocrSpinner.style.display = 'none'; // Spinner'ı gizle

        if (text.trim()) {
            addMessage("Görselden tanınan metin: " + text, "bot");
            // İsteğe bağlı: Tanınan metni botun anlayacağı formatta işleyebilirsiniz
            // const botResponseForOcr = processUserInput(text);
            // addMessage("Metin için bot yanıtı: " + botResponseForOcr, "bot");
        } else {
            addMessage("Görselde metin bulunamadı veya tanınamadı.", "bot");
        }
    } catch (error) {
        console.error("OCR sırasında hata oluştu:", error);
        ocrSpinner.style.display = 'none'; // Hata durumunda da spinner'ı gizle
        addMessage("Görsel işlenirken bir hata oluştu. Lütfen konsolu kontrol edin.", "bot");
    }
}

// Sürükle-Bırak Olayları

// Sürükleme sırasında görsel geri bildirim vermek için
chatContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); // Varsayılan işlemi engelle (dosyanın açılmasını)
    chatContainer.classList.add('dragover'); // CSS sınıfı ekle
});

// Sürükleme alanı terk edildiğinde görsel geri bildirimi kaldır
chatContainer.addEventListener('dragleave', () => {
    chatContainer.classList.remove('dragover'); // CSS sınıfını kaldır
});

// Dosya bırakıldığında
chatContainer.addEventListener('drop', (e) => {
    e.preventDefault(); // Varsayılan işlemi engelle
    chatContainer.classList.remove('dragover'); // CSS sınıfını kaldır

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        // Sadece görsel dosyalarını kabul et
        if (file.type.startsWith('image/')) {
            performOcr(file);
        } else {
            addMessage("Sadece görsel dosyaları sürükleyebilirsiniz.", "bot");
        }
    }
});


// Gönder butonuna tıklama olay dinleyicisi
document.getElementById('sendButton').addEventListener('click', sendMessage);

// Giriş alanında 'Enter' tuşuna basma olay dinleyicisi
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Sayfa yüklendiğinde bot verilerini ve Tesseract'ı yükle
document.addEventListener('DOMContentLoaded', async () => {
    await loadBotData();
    await initializeOcrWorker();
});