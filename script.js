// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const chatContainer = document.getElementById('chatContainer');
let botData = {}; // Yüklenen JSON verilerini depolamak için
let fuse; // Fuse.js arama motoru değişkeni

// Tesseract.js worker değişkeni
let ocrWorker;

// --- Stopword Listesi ---
// Bu liste, metin işlenirken çıkarılacak yaygın kelimeleri içerir.
// Fuse.js kendi algoritmalarını kullanabilir, ancak anahtarları temizlerken yine de kullanışlı olabilir.
// Listeyi daha önceki kapsamlı halinden daralttık, ihtiyaca göre genişletebilirsin.
const turkishStopwords = new Set([
    "nedir", "kaçtır", "ne", "kaç", "neresidir"
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
        // Anahtarları Fuse'a vermeden önce temizlemek, eşleştirmeyi iyileştirebilir.
         const searchableKeys = Object.keys(botData).map(key => ({
             // Anahtarları da küçük harf yapıp, virgülleri boşluğa çeviriyoruz.
             // Fuse'un kendi temizliği olsa da ön hazırlık iyi olabilir.
             key: key.toLowerCase().replace(/,/g, ' ')
             // Ek olarak: Anahtarlardan stopwordleri veya kesme işaretli ekleri temizlemek istersen buraya ekleyebilirsin,
             // ancak bu anahtarların orijinal halini bozabilir ve Fuse'un kendi esnekliğinden faydalanmanı azaltabilir.
             // Şimdilik sadece küçük harf ve virgül temizliği ile bırakalım,
             // kullanıcının girdisini temizlemeye odaklanalım.
         }));


        const options = {
            includeScore: true, // Eşleşme puanını dahil et
            keys: ['key'], // Hangi alanda arama yapılacağını belirt (burada 'key' alanında)
            threshold: 0.5, // Eşleşme eşiği (0.0 = tam eşleşme, 1.0 = tamamen farklı). Ayarlayarak en iyi sonucu bul.
            // location: 0, // Aranacak metnin başından uzaklık
            // distance: 100, // Eşleşen karakterlerin maksimum mesafesi
            ignoreLocation: true, // Konumu önemseme (kelime sırası önemli değilse) - Çoğu chatbot sorusu için iyi
            // useExtendedSearch: true, // Gelişmiş arama modunu etkinleştir (ör: ' "term" !exclude)
            // includeMatches: true, // Eşleşen kısımları sonuçlara dahil et
            // minMatchCharLength: 1, // Eşleşme için minimum karakter uzunluğu
            // isCaseSensitive: false, // Küçük/büyük harf duyarlılığı (false varsayılan)
            // shouldSort: true, // Sonuçları puana göre sırala (true varsayılan)
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

// --- CleanTextForDisplay Kısmen Güncellendi (Görüntüleme için) ---
// Bu fonksiyon sadece metni arayüzde göstermeden önce temel temizlik yapar.
function cleanTextForDisplay(text) {
    if (!text) return "";
    // Sadece genel temizlik (küçük harf, kesme işareti kaldırma, çoklu boşlukları tek yapma)
    return text.toLowerCase()
               .normalize("NFC") // Türkçe karakterleri normalleştir
               // .replace(/'/g, '') // Kesme işaretini kaldırmak istersen aktif et
               .replace(/[.,!?;:]/g, '') // Noktalamayı kaldır
               .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa indirge
               .trim();
}


// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // --- Math.js kısmı ---
    // Math için temizleme yaparken sadece virgülleri noktaya çevir
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

    // --- Kullanıcı girdisini arama için temizle (Yeni Özel Temizlik) ---
    let searchTerm = input.toLowerCase().normalize("NFC");

    // Kesme işareti ve sonrasındaki ekleri kaldır ('nın, 'si vb.)
    // Regex: ' işaretini ve ardından gelen bir veya daha fazla boşluk olmayan karakteri yakalar
    searchTerm = searchTerm.replace(/'[^\\s]+/g, '');

    // Yaygın noktalama işaretlerini kaldır
    searchTerm = searchTerm.replace(/[.,!?;:]/g, '');

    // Birden fazla boşluğu tek boşluğa indirge ve baştan/sondan boşlukları sil
    searchTerm = searchTerm.replace(/\s+/g, ' ').trim();

     // İstersen burada stopwordleri de çıkarabilirsin, ancak Fuse'un iç algoritmaları
     // bazen stopwordlerin varlığını veya yokluğunu dikkate alabilir.
     // Deneyerek karar verebilirsin. Şimdilik çıkarma adımını atlıyoruz.
     // const searchTermTokens = searchTerm.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
     // searchTerm = searchTermTokens.join(' ');


    // Eğer temizlenmiş arama terimi boşsa anlamlı bir girdi yok demektir
    if (searchTerm.length === 0) {
         // Math.js de sonuç vermediyse buraya düşer.
         return "Üzgünüm, ne sorduğunu anlayamadım.";
    }


    // Fuse.js ile arama yap
    const results = fuse.search(searchTerm);

    console.log(`Searching for: "${searchTerm}"`); // Arama terimini konsola yazdır
    console.log("Fuse.js Results:", results);


    // En iyi eşleşmeyi ve puanını al (Fuse.js sonuçları puana göre sıralar, 0 en iyi puan)
    if (results.length > 0) {
        const bestMatch = results[0];
        const matchedKey = bestMatch.item.key; // Eşleşen data.json anahtarı (objeden alıyoruz)
        const score = bestMatch.score; // Eşleşme puanı (0 ile 1 arası, 0 en iyi)

        // Fuse'un eşiği otomatik olarak filtreleme yapar, bu yüzden results.length > 0 kontrolü yeterli.
        // Ancak yine de puanı görmek faydalı.
        console.log(`Best Fuse Match Key: "${matchedKey}" | Score: ${score.toFixed(4)}`);


        // Eşleşen anahtarın yanıtını al
        // Dikkat: matchedKey, searchableKeys objesindeki 'key' alanıdır.
        // botData objesinde doğrudan bu key'i bulmak için bir lookup yapmalıyız.
        // Bunu Fuse'un searchConfigs veya keys ayarlarıyla daha doğrudan yapmanın yolları olabilir,
        // ama bu yapı mevcut botData'ya uygun.
        let botResponse = botData[matchedKey.replace(/ /g, ',')]; // Anahtarı orijinal formatına (virgülle ayrılmış) çevirerek botData'dan çek

        // Eğer çevrimde veya lookup'ta sorun olursa (beklenmez ama)
        if (!botResponse) {
            console.error(`Could not find response for matched key: "${matchedKey}"`);
            return "Üzgünüm, bir eşleşme buldum ama yanıtını alamadım.";
        }


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

    // Kullanıcı mesajını arayüze ekle (Kullanıcının yazdığı orijinal metni göstermek genellikle daha iyi)
    addMessage(messageText, 'user');

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