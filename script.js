// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const chatContainer = document.getElementById('chatContainer');
let botData = {}; // Yüklenen JSON verilerini depolamak için
let fuse; // Fuse.js arama motoru değişkeni

// Tesseract.js worker değişkeni
let ocrWorker;

// --- Stopword Listesi (Fuse.js kendi algoritmalarını kullanabilir,
// ancak anahtarları temizlerken yine de kullanışlı olabilir) ---
// Bu liste, metin işlenirken çıkarılacak yaygın kelimeleri içerir.
const turkishStopwords = new Set([
    "nedir", "kaçtır", "ne", 

]);
// --- Stopword Listesi Sonu ---


// Tesseract.js worker'ını başlatma fonksiyonu
async function initializeOcrWorker() {
    console.log("OCR motoru başlatılıyor...");
    try {
        ocrWorker = await Tesseract.createWorker('tur+eng');
        await ocrWorker.loadLanguage('tur+eng');
        await ocrWorker.initialize('tur+eng');
        console.log("OCR motoru hazır. Görsel sürükleyip bırakabilirsiniz.");
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
        console.log("Bot verileri başarıyla yüklendi."); // Konsol mesajı

        // --- Fuse.js'i Başlat ---
        // Aranacak veriyi Fuse.js'in anlayacağı bir formatta hazırlayın.
        // data.json'ın anahtarlarını arayacağız.
        const searchableKeys = Object.keys(botData).map(key => ({ key: key }));

        const options = {
            includeScore: true, // Eşleşme puanını dahil et
            keys: ['key'], // Hangi alanda arama yapılacağını belirt (burada 'key' alanında)
            threshold: 0.3, // Eşleşme eşiği (0.0 = tam eşleşme, 1.0 = tamamen farklı). Ayarlayarak en iyi sonucu bul.
            // location: 0, // Aranacak metnin başından uzaklık
            // distance: 100, // Eşleşen karakterlerin maksimum mesafesi
            ignoreLocation: true, // Konumu önemseme (kelime sırası önemli değilse)
            // useExtendedSearch: true, // Gelişmiş arama modunu etkinleştir (ör: ' "term" !exclude)
            // includeMatches: true, // Eşleşen kısımları sonuçlara dahil et
            // minMatchCharLength: 1, // Eşleşme için minimum karakter uzunluğu
        };

        fuse = new Fuse(searchableKeys, options);
        console.log("Fuse.js arama motoru başlatıldı.");

    } catch (error) {
        console.error("Bot verileri veya Fuse.js yüklenirken bir hata oluştu:", error);
        addMessage("Veriler yüklenirken bir sorun oluştu.", "bot");
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

// --- CleanAndTokenize Kısmen Güncellendi (Sadece OCR ve Display İçin Gerekirse Kullanılır) ---
// Fuzzy search için bu fonksiyonun çıktılarını doğrudan kullanmayacağız, Fuse.js kendi işliyor.
// Ancak OCR sonucu veya kullanıcı girdisini görüntülemek için hala faydalı olabilir.
function cleanTextForDisplay(text) {
    if (!text) return "";
    // Sadece genel temizlik (küçük harf, kesme işareti kaldırma, çoklu boşlukları tek yapma)
    return text.toLowerCase()
               .normalize("NFC")
               .replace(/'/g, '')
               .replace(/[.,!?;:]/g, '') // Noktalamayı da kaldır
               .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa indirge
               .trim();
}


// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // --- Math.js kısmı (Bu kısım değişmedi) ---
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
                return result.toString();
             } else {
                console.warn("Math.js tanımsız bir sonuç döndürdü:", result);
             }
        } catch (e) {
            console.warn("Math.js hesaplaması başarısız oldu:", e.message);
        }
    }
    // --- Math.js kısmı sonu ---


    // --- Fuse.js ile Arama ---
    if (!fuse) {
        console.error("Fuse.js arama motoru henüz hazır değil.");
        return "Üzgünüm, arama motoru henüz hazır değil.";
    }

    // Kullanıcı girdisini arama için temizle (Basitçe küçük harf yapmak ve kesme işaretini kaldırmak Fuse için genellikle yeterlidir)
    const searchTerm = input.toLowerCase().replace(/'/g, '');
    // Bazı durumlarda noktalamaları da kaldırmak isteyebilirsin:
    // const searchTerm = input.toLowerCase().replace(/'/g, '').replace(/[.,!?;:]/g, '');


    // Fuse.js ile arama yap
    const results = fuse.search(searchTerm);

    console.log("Fuse.js Results:", results); // Debug için sonuçları yazdır

    // En iyi eşleşmeyi ve puanını al (Fuse.js sonuçları puana göre sıralar, 0 en iyi puan)
    if (results.length > 0) {
        const bestMatch = results[0];
        const matchedKey = bestMatch.item.key; // Eşleşen data.json anahtarı
        const score = bestMatch.score; // Eşleşme puanı (0 ile 1 arası, 0 en iyi)

        // Fuse.js'in eşik değerini (options.threshold) geçip geçmediğini kontrol etmemiz yeterli
        // Ancak burada sonucu manuel olarak da kontrol edebiliriz veya Fuse'un eşiğine güvenebiliriz.
        // Fuse'un eşiğine güvenmek daha Fuse-vari bir yaklaşımdır.
        // Eğer istersen burada ek bir kontrol ekleyebilirsin: if (score <= YOUR_CUSTOM_HIGHER_THRESHOLD) { ... }

        console.log(`Best Fuse Match Key: "${matchedKey}" | Score: ${score.toFixed(4)}`);


        // Eşleşen anahtarın yanıtını al
        let botResponse = botData[matchedKey];

        // Yanıtın dinamik içeriğini (saat, tarih) güncelle
        if (botResponse.includes('{{currentTime}}')) {
            botResponse = botResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        }
        if (botResponse.includes('{{currentDate}}')) {
            botResponse = botResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        }

        return botResponse; // En iyi eşleşmenin yanıtını döndür

    } else {
        // Fuse.js eşiği geçen bir sonuç bulamadı
        return "Üzgünüm, sorunuzu tam olarak anlayamadım."; // Varsayılan yanıt
    }
}


// Mesaj gönderme fonksiyonu
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') {
        return; // Boş mesaj gönderme
    }

    // Kullanıcı mesajını arayüze ekle (Burada tam temizlenmiş metni kullanabilirsin)
    // addMessage(cleanTextForDisplay(messageText), 'user'); // Veya daha az temizlenmiş halini kullan
    addMessage(messageText, 'user'); // Kullanıcının yazdığı orijinal metni göstermek genellikle daha iyi

    userInput.value = ''; // Giriş alanını temizle

    // Bot yanıtını bir gecikmeyle işle ve ekle
    setTimeout(() => {
        const botResponse = processUserInput(messageText);
        addMessage(botResponse, 'bot');
    }, 300 + Math.random() * 500);
}

// OCR işlemini gerçekleştiren fonksiyon (Bu fonksiyon değişmedi)
async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil!", "bot");
        return;
    }

    addMessage("Görsel işleniyor...", "bot");

    try {
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
    }
}

// Sürükle-Bırak Olayları (Bu kısım değişmedi)
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

// Sayfa yüklendiğinde bot verilerini, Fuse.js'i ve Tesseract'ı yükle
document.addEventListener('DOMContentLoaded', async () => {
    // loadBotData fonksiyonu artık Fuse.js'i de başlatıyor
    await loadBotData();
    await initializeOcrWorker();
});