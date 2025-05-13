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
// Fuse.js kendi algoritmalarını kullanabilir, ancak arama terimini temizlerken kullanışlı olabilir.
const turkishStopwords = new Set([
    "nedir", "kaçtır", "ne", "kaç","neresidir"
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
        // Her anahtar için HEM TEMİZLENMİŞ HALİNİ (arama için) HEM DE ORİJİNAL HALİNİ (yanıt almak için) saklıyoruz.
         const searchableItems = Object.keys(botData).map(originalKey => {
             // Orijinal anahtarı al, temizleme adımlarını uygula:
             let cleanedKey = originalKey.toLowerCase().normalize("NFC");
             cleanedKey = cleanedKey.replace(/'[^\\s]+/g, ''); // Kesme işaretli ekleri kaldır
             cleanedKey = cleanedKey.replace(/[.,!?;:]/g, ''); // Noktalamayı kaldır
             cleanedKey = cleanedKey.replace(/\s+/g, ' ').trim(); // Birden fazla boşluğu tek boşluğa indirge

             // İstersen burada cleanedKey'den stopwordleri de çıkarabilirsin
             // const tokens = cleanedKey.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
             // cleanedKey = tokens.join(' ');

             return {
                 cleanedKey: cleanedKey, // Fuse bu alanda arama yapacak
                 originalKey: originalKey // Biz bu anahtarı kullanarak botData'dan yanıtı alacağız
             };
         });

        // Fuse.js seçenekleri - Eşleşme performansını ayarlamak için burası kritik!
        const options = {
            includeScore: true, // Eşleşme puanını dahil et (debug için iyi)
            keys: ['cleanedKey'], // Fuse'un arama yapacağı alanın adı
            // --- BURASI ÇOK ÖNEMLİ: EŞİK DEĞERİNİ AYARLA! ---
            // 0.0 = tam eşleşme, 1.0 = tamamen farklı.
            // 0.2 - 0.4 arası başlangıç için denenebilir.
            // Önceki kodda 0.3 yapmıştık, sorun yanıt almada olduğu için 0.3 kalsın.
            threshold: 0.3, // **BU DEĞERİ TEST EDEREK OPTİMİZE ETMELİSİN!**
            // location: 0, // Aranacak metnin başından uzaklık
            // distance: 100, // Eşleşen karakterlerin maksimum mesafesi
            ignoreLocation: true, // Konumu önemseme (kelime sırası önemli değilse) - Çoğu chatbot sorusu için iyi
            // useExtendedSearch: true, // Gelişmiş arama modunu etkinleştir (istekliysen deneyebilirsin)
            // includeMatches: true, // Eşleşen kısımları sonuçlara dahil et (debug için iyi)
            // minMatchCharLength: 1, // Eşleşme için minimum karakter uzunluğu
            // isCaseSensitive: false, // Küçük/büyük harf duyarlılığı (false varsayılan)
            // shouldSort: true, // Sonuçları puana göre sırala (true varsayılan)
        };

        // Fuse.js'i oluştururken arama yapılacak diziyi (searchableItems) ve seçenekleri veriyoruz
        fuse = new Fuse(searchableItems, options);
        console.log("Fuse.js arama motoru başlatıldı. Aranabilir anahtarlar:", searchableItems.map(item => item.cleanedKey)); // Debug için temizlenmiş anahtarları da logla

    } catch (error) {
        console.error("Bot verileri veya Fuse.js yüklenirken bir hata oluştu:", error);
        addMessage("Veriler yüklenirken bir sorun oluştu.", "bot");
    }
}

// Sohbet arayüzüne mesaj ekleme fonksiyonu (Aynı)
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    // Otomatik olarak en aşağıya kaydır
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- cleanSearchTerm: Kullanıcı girdisini Fuse.js araması için temizler ---
// Bu fonksiyon, processUserInput içindeki temizleme mantığını buraya taşıyor.
// Fuse.js'e verilmeden önce kullanıcı girdisine uygulanır.
function cleanSearchTerm(input) {
    if (!input) return "";

    let cleaned = input.toLowerCase().normalize("NFC"); // Küçük harf yap ve normalize et

    // Kesme işareti ve sonrasındaki ekleri kaldır ('nın, 'si vb.)
    // Regex: ' işaretini ve ardından gelen bir veya daha fazla boşluk olmayan karakteri yakalar
    cleaned = cleaned.replace(/'[^\\s]+/g, '');

    // Yaygın noktalama işaretlerini kaldır
    cleaned = cleaned.replace(/[.,!?;:]/g, '');

    // Birden fazla boşluğu tek boşluğa indirge ve baştan/sondan boşlukları sil
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

     // İstersen burada stopwordleri de çıkarabilirsin, ancak Fuse'un iç algoritmaları
     // bazen stopwordler varken de iyi çalışabilir.
     // Deneyerek karar verebilirsin. Şimdilik bu adımı atlıyoruz.
     // const tokens = cleaned.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
     // cleaned = tokens.join(' ');


    return cleaned;
}


// --- cleanTextForDisplay: Metni arayüzde göstermeden önce temizler ---
// Bu fonksiyon sadece görüntüleme amaçlıdır.
function cleanTextForDisplay(text) {
    if (!text) return "";
    // Sadece temel temizlik (küçük harf, çoklu boşlukları tek yapma)
    return text.toLowerCase()
               .normalize("NFC") // Türkçe karakterleri normalleştir
               // Kesme işaretini kaldırmak veya noktalamayı kaldırmak istersen buraya ekleyebilirsin
               .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa indirge
               .trim();
}


// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // --- Math.js kısmı (Aynı) ---
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

    // Kullanıcı girdisini arama için temizle
    const searchTerm = cleanSearchTerm(input);

    // Eğer temizlenmiş arama terimi boşsa anlamlı bir girdi yok demektir
    if (searchTerm.length === 0) {
         // Math.js de sonuç vermediyse buraya düşer.
         return "Üzgünüm, ne sorduğunu anlayamadım.";
    }

    // Fuse.js ile arama yap
    const results = fuse.search(searchTerm);

    console.log(`Searching for: "${searchTerm}"`); // Arama terimini konsola yazdır
    console.log("Fuse.js Results:", results); // Debug için tüm sonuçları yazdır


    // En iyi eşleşmeyi al (Fuse.js sonuçları puana göre sıralar, 0 en iyi puan)
    if (results.length > 0) {
        const bestMatch = results[0];
        // --- BURASI DÜZELTİLDİ: Orijinal anahtarı alıyoruz ---
        const matchedOriginalKey = bestMatch.item.originalKey;
        const score = bestMatch.score; // Eşleşme puanı (0 ile 1 arası, 0 en iyi)

        // Fuse'un kendi eşiği (options.threshold) zaten sonuçları filtreler.
        // Burada sadece bulunan en iyi sonucun puanını logluyoruz.
        console.log(`Best Fuse Match Original Key: "${matchedOriginalKey}" | Score: ${score.toFixed(4)}`);

        // --- BURASI DÜZELTİLDİ: Orijinal anahtarı kullanarak yanıtı alıyoruz ---
        let botResponse = botData[matchedOriginalKey];

        // Eğer eşleşme bulundu ama yanıt boşsa (beklenmez, originalKey botData'dan gelmeli)
        if (!botResponse) {
            console.error(`FATAL ERROR: Matched original key "${matchedOriginalKey}" not found in botData.`);
            // Bu hata normalde olmamalı, eğer oluyorsa mantık hatası var demektir.
            return "Üzgünüm, dahili bir hata oluştu (yanıt eşleşmedi).";
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


// Mesaj gönderme fonksiyonu (Aynı)
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') {
        return; // Boş mesaj gönderme
    }

    addMessage(messageText, 'user'); // Kullanıcının yazdığı orijinal metni göstermek
    userInput.value = ''; // Giriş alanını temizle

    // Bot yanıtını bir gecikmeyle işle ve ekle
    setTimeout(() => {
        const botResponse = processUserInput(messageText);
        addMessage(botResponse, 'bot');
    }, 300 + Math.random() * 500);
}

// OCR işlemini gerçekleştiren fonksiyon (Aynı)
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

// Sürükle-Bırak Olayları (Aynı)
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


// Gönder butonuna tıklama olay dinleyicisi (Aynı)
document.getElementById('sendButton').addEventListener('click', sendMessage);

// Giriş alanında 'Enter' tuşuna basma olay dinleyicisi (Aynı)
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Sayfa yüklendiğinde bot verilerini, Fuse.js'i ve Tesseract'ı yükle (Aynı)
document.addEventListener('DOMContentLoaded', async () => {
    // loadBotData fonksiyonu artık Fuse.js'i de başlatıyor
    await loadBotData();
    await initializeOcrWorker();
});