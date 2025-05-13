---
File: /script.js
---

// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const chatContainer = document.getElementById('chatContainer');
const sendButton = document.getElementById('sendButton'); // Send butonunu alalım
const attachButton = document.getElementById('attachButton'); // Yeni ataş butonunu alalım
const fileInput = document.getElementById('fileInput'); // Yeni dosya inputunu alalım

let botData = {}; // Yüklenen JSON verilerini depolamak için
let fuse; // Fuse.js arama motoru değişkeni

// Tesseract.js worker değişkeni
let ocrWorker;

// --- Stopword Listesi ---
const turkishStopwords = new Set([
    "nedir", "kaçtır", "kaç", "kodu", "numarası", "neresidir", "ilinin", "ne" // "yapar" gibi ekler eklendi
    // Daha fazla stopword ekleyebilirsin
]);
// --- Stopword Listesi Sonu ---


// Tesseract.js worker'ını başlatma fonksiyonu
async function initializeOcrWorker() {
    console.log("OCR motoru başlatılıyor...");
    try {
        ocrWorker = await Tesseract.createWorker('tur+eng');
        await ocrWorker.loadLanguage('tur+eng');
        await ocrWorker.initialize('tur+eng');
        console.log("OCR motoru hazır. Görsel sürükleyip bırakabilir veya ataş butonunu kullanabilirsiniz.");
    } catch (error) {
        console.error("Tesseract OCR motoru başlatılırken hata oluştu:", error);
        addMessage("OCR motoru başlatılırken bir sorun oluştu.", "bot");
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
        console.log("Bot verileri başarıyla yüklendi.");

        // --- Fuse.js'i Başlat ---
        const searchableItems = Object.keys(botData).map(originalKey => {
            let cleanedKey = originalKey.toLowerCase().normalize("NFC");
            cleanedKey = cleanedKey.replace(/'[^\\s]+/g, '');
            cleanedKey = cleanedKey.replace(/[.,!?;:]/g, '');
            cleanedKey = cleanedKey.replace(/\s+/g, ' ').trim();

            return {
                cleanedKey: cleanedKey,
                originalKey: originalKey
            };
        });

        // Fuse.js seçenekleri - Eşleşme performansını ayarlamak için burası kritik!
        const options = {
            includeScore: true,
            keys: ['cleanedKey'],
            // threshold: 0.3, // Daha katı bir eşik (daha az sonuç ama daha ilgili olabilir)
            threshold: 0.4, // Biraz daha gevşek eşik (daha fazla sonuç, tam eşleşme olmasa bile)
            ignoreLocation: true,
            // isCaseSensitive: false, // Varsayılan olarak false zaten
        };

        fuse = new Fuse(searchableItems, options);
        console.log("Fuse.js arama motoru başlatıldı. Aranabilir temizlenmiş anahtarlar:", searchableItems.map(item => item.cleanedKey));

    } catch (error) {
        console.error("Bot verileri veya Fuse.js yüklenirken bir hata oluştu:", error);
        addMessage("Veriler yüklenirken bir sorun oluştu.", "bot");
    }
}

// Sohbet arayüzüne mesaj ekleme fonksiyonu
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    // textContent yerine innerHTML kullanabiliriz eğer basit HTML formatlama (örn: yeni satır) desteklenecekse
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- cleanSearchTerm: Kullanıcı girdisini Fuse.js araması için temizler ---
function cleanSearchTerm(input) {
    if (!input) return "";

    let cleaned = input.toLowerCase().normalize("NFC");

    cleaned = cleaned.replace(/'[^\\s]+/g, '');
    cleaned = cleaned.replace(/[.,!?;:]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // --- Stopwordleri çıkar ---
    const tokens = cleaned.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
    cleaned = tokens.join(' ');
    // --- Stopword Bitti ---

    if (cleaned.length === 0) {
        return "";
    }

    return cleaned;
}


// --- cleanTextForDisplay: Metni arayüzde göstermeden önce temizler ---
function cleanTextForDisplay(text) {
    if (!text) return "";
    return text.normalize("NFC")
               .replace(/\s+/g, ' ')
               .trim();
}


// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // --- Math.js kısmı ---
    const cleanedInputForMath = input.toLowerCase().normalize("NFC").replace(/,/g, '.');
    const hasNumber = /\d/.test(cleanedInputForMath);
    const looksLikeMathOrUnitConversion = hasNumber && (
        cleanedInputForMath.includes(' to ') ||
        /[+\-*/^()]/.test(cleanedInputForMath) ||
        cleanedInputForMath.includes('sqrt') ||
        cleanedInputForMath.includes('log') ||
        cleanedInputForMath.includes('sin') ||
        cleanedInputForMath.includes('cos') ||
        cleanedInputForMath.includes('tan')
    );

    if (looksLikeMathOrUnitConversion) {
        try {
            const result = math.evaluate(cleanedInputForMath);
            if (typeof result === 'number' || result instanceof math.Unit || result instanceof math.Complex || result instanceof math.BigNumber || (result !== null && typeof result === 'object' && typeof result.toString === 'function')) {
                 // Yanıta "Sonuç: " gibi bir prefix ekleyebiliriz
                return "Sonuç: " + result.toString();
            } else {
                console.warn("Math.js tanımsız bir sonuç döndürdü:", result);
            }
        } catch (e) {
            console.warn("Math.js hesaplaması başarısız oldu:", e.message);
            // Hesaplama hatası durumunda Math.js'in kendi hata mesajını döndürebiliriz
            return "Hesaplama hatası: " + e.message;
        }
    }
    // --- Math.js kısmı sonu ---


    // --- Fuse.js ile Arama ---
    if (!fuse) {
        console.error("Fuse.js arama motoru henüz hazır değil.");
        return "Üzgünüm, arama motoru henüz hazır değil.";
    }

    const searchTerm = cleanSearchTerm(input);

    if (searchTerm.length === 0) {
        // Math.js de sonuç vermediyse ve arama terimi boşsa varsayılan yanıt
        return "Üzgünüm, ne sorduğunu anlayamadım.";
    }

    // Fuse.js ile arama yap
    const results = fuse.search(searchTerm);

    console.log(`Searching for: "${searchTerm}"`);
    console.log("Fuse.js Results:", results);


    if (results.length > 0) {
        const bestMatch = results[0];
        const matchedOriginalKey = bestMatch.item.originalKey;
        const score = bestMatch.score;

        console.log(`Best Fuse Match Original Key: "${matchedOriginalKey}" | Score: ${score.toFixed(4)}`);

        let botResponse = botData[matchedOriginalKey];

        if (!botResponse) {
            console.error(`FATAL ERROR: Matched original key "${matchedOriginalKey}" not found in botData.`);
            return "Üzgünüm, dahili bir hata oluştu (yanıt eşleşmedi).";
        }

        // Yanıtın dinamik içeriğini (saat, tarih) güncelle
        if (botResponse.includes('{{currentTime}}')) {
            botResponse = botResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        }
        if (botResponse.includes('{{currentDate}}')) {
            botResponse = botResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        }

        return botResponse;

    } else {
        // Fuse.js eşiği geçen bir sonuç bulamadı
        return "Üzgünüm, sorunuzu tam olarak anlayamadım.";
    }
}


// Mesaj gönderme fonksiyonu
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') {
        return; // Boş mesaj gönderme
    }

    addMessage(messageText, 'user');
    userInput.value = ''; // Giriş alanını temizle

    // Bot yanıtını bir gecikmeyle işle ve ekle
    // Kullanıcı mesajı eklendikten sonra, yanıtı hesapla ve göster
    const botResponse = processUserInput(messageText);
    setTimeout(() => {
        addMessage(botResponse, 'bot');
    }, 300 + Math.random() * 500); // Rastgele gecikme ekle
}

// OCR işlemini gerçekleştiren fonksiyon
async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil!", "bot");
        return;
    }

    addMessage("Görsel işleniyor...", "bot");

    try {
        // OCR sürecindeki ilerlemeyi takip etmek isterseniz aşağıdaki satırları kullanabilirsiniz
        // ocrWorker.on('progress', (progress) => {
        //     console.log('OCR Progress:', progress);
        //     // Arayüzde ilerlemeyi göstermek için buraya kod ekleyebilirsiniz
        // });

        const { data: { text } } = await ocrWorker.recognize(imageFile);

        if (text && text.trim()) {
            // OCR sonucunu temizleyip gösterebilirsin
            addMessage("Görseldeki metin:\n\n" + cleanTextForDisplay(text), "bot");
        } else {
            addMessage("Görselde metin bulamadım!", "bot");
        }
    } catch (error) {
        console.error("OCR sırasında hata oluştu:", error);
        addMessage("OCR yapılırken bir sorun oluştu!", "bot");
    } finally {
        // İşlem bittikten sonra dosya inputunu sıfırla
        fileInput.value = '';
    }
}

// Sürükle-Bırak Olayları (Mevcut)
chatContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    chatContainer.classList.add('dragover');
});

chatContainer.addEventListener('dragleave', () => {
    chatContainer.classList.remove('dragover');
});

chatContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    chatContainer.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            performOcr(file);
        } else {
            addMessage("Sadece görsel işleyebiliyorum! (Şimdilik)", "bot");
        }
    }
});


// --- Yeni: Ataş Butonu ve Dosya Inputu Olay Dinleyicileri ---

// Ataş butonuna tıklama eventi: Gizli dosya inputunu tetikler
attachButton.addEventListener('click', () => {
    fileInput.click();
});

// Dosya inputuna dosya seçildiğinde tetiklenen event
fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            // Seçilen dosya bir görsel ise OCR yap
            performOcr(file);
        } else {
            // Farklı bir dosya türü ise şimdilik sadece bilgi ver
            // İleride buraya farklı dosya türlerini işleme mantığı eklenebilir
            addMessage(`Şimdilik sadece görsel (.jpg, .png vb.) işleyebiliyorum. Seçtiğiniz dosya türü: ${file.type}`, "bot");
        }
    }
    // Dosya seçimi iptal edilirse veya işlem bitince inputu sıfırlamak performOcr içinde
    // veya burada yapılabilir. performOcr içine ekledik.
});

// --- Yeni Olay Dinleyicileri Sonu ---


// Gönder butonuna tıklama olay dinleyicisi (Mevcut)
sendButton.addEventListener('click', sendMessage);

// Giriş alanında 'Enter' tuşuna basma olay dinleyicisi (Mevcut)
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Enter tuşunun varsayılan davranışını (yeni satır) engelle
        sendMessage();
    }
});

// Sayfa yüklendiğinde bot verilerini, Fuse.js'i ve Tesseract'ı yükle (Mevcut)
document.addEventListener('DOMContentLoaded', async () => {
    // loadBotData fonksiyonu artık Fuse.js'i de başlatıyor
    await loadBotData();
    // OCR worker'ı sadece ihtiyaç duyulursa başlatmak performans için daha iyi olabilir
    // Ama kullanıcıya hazır olduğunu belirtmek için başta başlatıyoruz.
    await initializeOcrWorker();
});