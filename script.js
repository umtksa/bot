// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const chatContainer = document.getElementById('chatContainer'); // chat-container elementini yakala
// const ocrSpinner = document.getElementById('ocrSpinner'); // Spinner elemanı kaldırıldığı için bu satır da kaldırıldı.
let botData = {}; // Yüklenen JSON verilerini depolamak için

// Tesseract.js worker değişkeni
let ocrWorker;

// Tesseract.js worker'ını başlatma fonksiyonu
async function initializeOcrWorker() {
    // Bu mesajı konsola yazdırıyoruz, kullanıcıya değil.
    console.log("OCR motoru başlatılıyor..."); 
    try {
        // 'tur' Türkçe dil paketi için. İhtiyaca göre başka diller de eklenebilir.
        // Örneğin: 'eng+tur' hem İngilizce hem Türkçe için.
        ocrWorker = await Tesseract.createWorker('tur+eng');
        await ocrWorker.loadLanguage('tur+eng');
        await ocrWorker.initialize('tur+eng');
        // Bu mesajı da konsola yazdırıyoruz.
        console.log("OCR motoru hazır. Görsel sürükleyip bırakabilirsiniz."); 
    } catch (error) {
        console.error("Tesseract OCR motoru başlatılırken hata oluştu:", error);
        // Hata mesajlarını kullanıcıya göstermek genellikle iyi bir uygulamadır.
        addMessage("OCR şeyinde bir sıkıntı oldu!", "bot"); 
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
        console.log("Bot verileri başarıyla yüklendi:", botData); // Bu mesaj da konsola yazdırılıyor.
    } catch (error) {
        console.error("Bot verileri yüklenirken bir hata oluştu:", error);
        // Hata mesajlarını kullanıcıya göstermek genellikle iyi bir uygulamadır.
        addMessage("Veriler yüklenirken bir sıkıntı oldu!", "bot");
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
    const cleanedInput = input.toLowerCase().normalize("NFC");
    const inputTokens = cleanedInput.split(/\s+/).filter(word => word.length > 0);

    // --- Yeni: Math.js ile matematiksel ifadeleri ve birim çevirmelerini işle ---
    // Girişte bir sayı ve olası bir matematik/birim anahtar kelime var mı kontrol et
    const hasNumber = /\d/.test(cleanedInput);
    const looksLikeMathOrUnitConversion = hasNumber && (
        cleanedInput.includes(' to ') || // "inch to cm" gibi
        cleanedInput.includes('+') ||
        cleanedInput.includes('-') ||
        cleanedInput.includes('*') ||
        cleanedInput.includes('/') ||
        cleanedInput.includes('^') || // Üs alma
        cleanedInput.includes('sqrt') || // Karekök
        cleanedInput.includes('log') || // Logaritma
        cleanedInput.includes('sin') || // Trigonometrik fonksiyonlar
        cleanedInput.includes('cos') ||
        cleanedInput.includes('tan')
    );

    if (looksLikeMathOrUnitConversion) {
        try {
            const result = math.evaluate(cleanedInput);

            // Check if the result is a number, unit, complex, or BigNumber
            if (typeof result === 'number' || result instanceof math.Unit || result instanceof math.Complex || result instanceof math.BigNumber) {
                const formattedResult = math.format(result, { notation: 'fixed', precision: 3 });
                return formattedResult; // Formatlanmış stringi döndür
                // --- GÜNCELLEME SONU ---

            } else if (result && typeof result.toString === 'function') {
                 // For other math.js types that have a toString method
                return result.toString();
            } else {
                console.warn("Math.js tanımsız bir sonuç döndürdü:", result);
            }
        } catch (e) {
            // math.js geçerli bir ifade bulamazsa hata fırlatır
            console.warn("Math.js hesaplaması başarısız oldu:", e.message);
            // Bu durumda, varsayılan olarak JSON veri tabanında arama yapmaya devam et
        }
    }
    // --- Math.js kısmı sonu ---
    // Mevcut: data.json lookup (matematiksel ifade değilse veya math.js hata verirse)
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

    // Spinner kaldırıldığı için mesajı güncelledik
    addMessage("biraz bekleticem...", "bot"); 
    // ocrSpinner.style.display = 'block'; // Spinner kontrol satırı kaldırıldı

    try {
        const { data: { text } } = await ocrWorker.recognize(imageFile);
        // ocrSpinner.style.display = 'none'; // Spinner kontrol satırı kaldırıldı

        if (text.trim()) {
            addMessage(text, "bot");
        } else {
            addMessage("Görselde metin bulamadım!", "bot");
        }
    } catch (error) {
        console.error("OCR sırasında hata oluştu:", error);
        // ocrSpinner.style.display = 'none'; // Spinner kontrol satırı kaldırıldı
        addMessage("OCR yaparken bi sıkıntı oldu!", "bot");
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
            addMessage("Sadece görsel işleyebiliyorum!", "bot");
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