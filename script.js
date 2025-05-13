// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton'); // Get send button
const fileInput = document.getElementById('fileInput'); // Get hidden file input
const fileInputLabel = document.querySelector('.file-input-label'); // Get file input label (the icon)
const chatContainer = document.getElementById('chatContainer');

let botData = {}; // Yüklenen JSON verilerini depolamak için
let fuse; // Fuse.js arama motoru değişkeni

// Tesseract.js worker değişkeni
let ocrWorker;

// --- Stopword Listesi ---
const turkishStopwords = new Set([
    "nedir", "kaçtır", "kaç", "kodu", "kodunu", "numarasını", "numarası", "neresidir", "ilinin", "ne", "peki", "canım", "ahraz", "biliyor", "musun", "mü", "mı", "mi", "değil", "söyler", "söyleyebilir", "misin", "hatırlatır", "söyle", "bana", "senin", "verir", "müsün", "mısın", "lütfen", "acaba", "bir", "birçok", "bile", "da", "de", "den", "diğer", "diye", "eden", "eğer", "en", "gibi", "hem", "ile", "işte", "itibaren", "kadar", "karşın", "katrilyon", "kez", "ki", "kim", "kime", "kimi", "kimden", "kimeyi", "kimler", "kimlere", "kimleri", "kimlerden", "kimlereyi", "kiminin", "kimisi", "kimseye", "kırk", "otuz", "şimdi", "şey", "şöyle", "şu", "şunlar", "şurası", "tabii", "tam", "tüm", "ve", "veya", "ya", "yani", "yine", "yirmi", "yoksa", "çok", "çünkü", "üzere"
    // Daha fazla stopword ekleyebilirsiniz
]);
// --- Stopword Listesi Sonu ---


// Tesseract.js worker'ını başlatma fonksiyonu
async function initializeOcrWorker() {
    console.log("OCR motoru başlatılıyor...");
    try {
        // Tesseract worker'ı ilk mesaj eklenmeden veya dosya sürüklenmeden önce başlatılabilir
        // ya da ilk OCR ihtiyacı olduğunda tembel yükleme yapılabilir.
        // Şu an DocumentContentLoaded'da başlatılıyor, bu da yeterli.
        ocrWorker = await Tesseract.createWorker('tur+eng');
        await ocrWorker.loadLanguage('tur+eng');
        await ocrWorker.initialize('tur+eng');
        console.log("OCR motoru hazır. Görsel sürükleyip bırakabilir veya ekleyebilirsiniz.");
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
        const searchableItems = Object.keys(botData).map(originalKey => {
             // Orijinal anahtarı al, temizleme adımlarını uygula:
             let cleanedKey = originalKey.toLowerCase().normalize("NFC");
             cleanedKey = cleanedKey.replace(/'[^\\s]+/g, ''); // Kesme işaretli ekleri kaldır
             cleanedKey = cleanedKey.replace(/[.,!?;:]/g, ''); // Noktalamayı kaldır
             cleanedKey = cleanedKey.replace(/\s+/g, ' ').trim(); // Birden fazla boşluğu tek boşluğa indirge

             // data.json anahtarlarından stopwordleri ÇIKARMAYI seçiyoruz.
             // Neden? Kullanıcı "Adana'nın plakası nedir" sorduğunda "adana plaka" temizlenir.
             // Anahtar "adana plaka" ise Fuse doğrudan eşleştirir.
             // Anahtar "adana plaka" iken ondan stopword "plaka"yı çıkarmak anlamsız olur.
             // Stopword çıkarma sadece kullanıcı girdisinde yapılmalıdır.
             // const tokens = cleanedKey.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
             // cleanedKey = tokens.join(' ');


             return {
                 cleanedKey: cleanedKey, // Fuse bu alanda arama yapacak (sadece temel temizlik yapıldı)
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
             threshold: 0.4, // **BU DEĞERİ TEST EDEREK OPTİMİZE ETMELİSİN!**
             ignoreLocation: true, // Konumu önemseme (kelime sırası önemli değilse) - Çoğu chatbot sorusu için iyi
        };

        // Fuse.js'i oluştururken arama yapılacak diziyi (searchableItems) ve seçenekleri veriyoruz
        fuse = new Fuse(searchableItems, options);
        console.log("Fuse.js arama motoru başlatıldı. Aranabilir temizlenmiş anahtarlar:", searchableItems.map(item => item.cleanedKey)); // Debug için temizlenmiş anahtarları da logla

    } catch (error) {
        console.error("Bot verileri veya Fuse.js yüklenirken bir hata oluştu:", error);
        addMessage("Veriler yüklenirken bir sorun oluştu.", "bot");
    }
}

// Sohbet arayüzüne mesaj ekleme fonksiyonu
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);

    // Basit metin yerine innerHTML kullanarak linkleri tıklanabilir yapabiliriz
    // Ancak şu anki data.json yapısında link yok. Sadece metin yeterli.
    messageDiv.textContent = text;

    chatMessages.appendChild(messageDiv);

    // Yeni mesaj eklendiğinde animasyon uygula
    setTimeout(() => {
        messageDiv.style.opacity = 1;
        messageDiv.style.transform = 'translateY(0)';
         // Otomatik olarak en aşağıya kaydır
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 10); // Küçük bir gecikme animasyonun çalışmasını sağlar
}


// --- cleanSearchTerm: Kullanıcı girdisini Fuse.js araması için temizler ---
function cleanSearchTerm(input) {
    if (!input) return "";

    let cleaned = input.toLowerCase().normalize("NFC"); // Küçük harf yap ve normalize et

     // Kesme işareti ve sonrasındaki ekleri kaldır ('nın, 'si vb.)
    cleaned = cleaned.replace(/'[^\\s]+/g, '');

    // Yaygın noktalama işaretlerini kaldır
    cleaned = cleaned.replace(/[.,!?;:]/g, '');

     // Rakamları ve ilgili sembolleri koruyarak diğer özel karakterleri kaldır
     // Örn: 1+1, 5kg to lbs gibi ifadeleri bozmamak için daha dikkatli
    cleaned = cleaned.replace(/[^a-z0-9ğüşöçİı\s+\-*/^.]/g, '');


    // Birden fazla boşluğu tek boşluğa indirge ve baştan/sondan boşlukları sil
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

     // --- Yeni: Stopwordleri çıkar ---
     // Ancak Math.js ifadelerinden stopword ÇIKARMAMALIYIZ.
     // Örneğin "5 kg kaç lbs" -> "5 kg lbs" kalmalı.
     // Fuse.js zaten esnek olduğu için burada sadece metinsel ifadeler için stopword çıkaralım
     // veya çıkarmayalım. Önceki mantıkta çıkarmamıştık, devam edelim.
     // Kullanıcı sorusundan stopword çıkarmak daha mantıklı olabilir, denemek gerek.
     // Current logic: Don't remove stopwords from the *cleaned* search term fed to Fuse.
     // The searchableItems were created WITHOUT removing stopwords from the keys.
     // If the user types "Adana'nın plakası nedir", it becomes "adanann plakası nedir" (after accent removal), then "adanan plakasi nedir" (punctuation removal).
     // The 'nın' and 'nedir' are stopwords we *want* to remove from the user's input *before* searching Fuse.
     // Let's add stopword removal *here* for the user's search term.

     const tokens = cleaned.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
     cleaned = tokens.join(' ');
     // --- Stopword çıkarma Bitti ---


    // Eğer temizlenmiş arama terimi boşsa anlamlı bir girdi yok demektir
    if (cleaned.length === 0) {
         // Math.js de sonuç vermediyse buraya düşer.
         // Fuse.js boş string ile arama yaparsa sonuç bulamaz, bu erken dönüş doğru.
         return ""; // Boş string döndür ki processUserInput bunu algılayabilsin
    }

    return cleaned; // Temizlenmiş arama terimini döndür
}


// --- cleanTextForDisplay: Metni arayüzde göstermeden önce temizler ---
// Bu fonksiyon sadece görüntüleme amaçlıdır. Kullanıcının yazdığı orijinal mesaj için kullanışlı olabilir.
// Bot yanıtları genellikle data.json'da zaten formatlıdır.
function cleanTextForDisplay(text) {
    if (!text) return "";
    // Sadece temel temizlik (çoklu boşlukları tek yapma)
    return text.replace(/\s+/g, ' ').trim();
    // Lowercase yapmamaya karar verdim çünkü OCR bazen büyük harf algılar ve onu olduğu gibi göstermek isteyebiliriz.
}


// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // --- Math.js kısmı ---
    // Math için temizleme yaparken sadece virgülleri noktaya çevir ve sadece matematiksel ifadelere uygula
    const cleanedInputForMath = input.toLowerCase().normalize("NFC").replace(/,/g, '.');
    // Check if it contains numbers AND math operators or specific functions (sqrt, sin, etc.) OR unit conversion syntax
    const hasNumber = /\d/.test(cleanedInputForMath);
    const looksLikeMathOrUnitConversion = hasNumber && (
        cleanedInputForMath.includes(' to ') || // Unit conversion syntax
        /[+\-*/^%]/.test(cleanedInputForMath) || // Common math operators
        cleanedInputForMath.includes('sqrt') || cleanedInputForMath.includes('log') ||
        cleanedInputForMath.includes('sin') || cleanedInputForMath.includes('cos') || cleanedInputForMath.includes('tan')
        // Add more math function checks if needed
    );

    // It's tricky to perfectly distinguish math from regular text that happens to contain numbers.
    // A simple check for operators and numbers is a heuristic.
    // We should try Math.js first if it *looks like* math.
    if (looksLikeMathOrUnitConversion) {
        try {
            const result = math.evaluate(cleanedInputForMath);
            // Check if the result is a valid Math.js output type
            if (typeof result === 'number' || result instanceof math.Unit || result instanceof math.Complex || result instanceof math.BigNumber || (result !== null && typeof result === 'object' && typeof result.toString === 'function')) {
                 // Check if the result is not just the input itself (e.g., input "5" evaluates to 5)
                 // and if it's not an error or undefined state Math.js might return subtly.
                 // A simple check: if the input contains an operator/function but the output is just a number equal to a number in the input, it might not have evaluated properly,
                 // but this is complex. Let's trust math.evaluate for now if it doesn't throw.
                const mathResultString = result.toString();
                 // Check if the output is potentially a valid number or unit string
                 if (mathResultString && mathResultString !== cleanedInputForMath) { // Avoid returning input if it wasn't evaluated
                     console.log("Math.js Result:", mathResultString);
                    return mathResultString;
                 } else {
                     console.warn("Math.js evaluated but result was same as input or empty, trying Fuse:", mathResultString);
                 }
            } else {
                console.warn("Math.js returned an unexpected result type, trying Fuse:", result);
            }
        } catch (e) {
            console.warn("Math.js hesaplaması başarısız oldu, Fuse denenecek:", e.message);
            // If Math.js fails, fall through to the Fuse.js search
        }
    }
    // --- Math.js kısmı sonu ---


    // --- Fuse.js ile Arama ---
    if (!fuse) {
        console.error("Fuse.js arama motoru henüz hazır değil.");
        return "Üzgünüm, arama motoru henüz hazır değil.";
    }

    // Kullanıcı girdisini arama için temizle (stopwordleri çıkaracak)
    const searchTerm = cleanSearchTerm(input);

     // Eğer temizlenmiş arama terimi boşsa (yani sadece stopwordler veya anlamsız karakterlerdi)
    if (searchTerm.length === 0) {
         // Eğer buraya geldiyse Math.js de sonuç vermedi demektir.
         return "Üzgünüm, ne sorduğunu tam olarak anlayamadım."; // Varsayılan yanıt
    }


    // Fuse.js ile arama yap
    const results = fuse.search(searchTerm);

    console.log(`Searching Fuse for: "${searchTerm}" (Cleaned Input: "${cleanSearchTerm(input)}")`); // Debug: Arama terimini ve temizlenmiş halini yazdır
    console.log("Fuse.js Results:", results); // Debug: Tüm sonuçları yazdır


    // En iyi eşleşmeyi al (Fuse.js sonuçları puana göre sıralar, 0 en iyi puan)
    // Fuse'un eşiği (options.threshold) zaten sonuçları filtreler,
    // bu yüzden burada sonuç varsa, eşiği geçmiş demektir.
    if (results.length > 0) {
        const bestMatch = results[0];
         // Orijinal anahtarı alıyoruz
        const matchedOriginalKey = bestMatch.item.originalKey;
        const score = bestMatch.score; // Eşleşme puanı (0 ile 1 arası, 0 en iyi)

        console.log(`Best Fuse Match Original Key: "${matchedOriginalKey}" | Score: ${score.toFixed(4)}`);

         // Orijinal anahtarı kullanarak yanıtı data.json'dan al
        let botResponse = botData[matchedOriginalKey];

         // Eğer eşleşme bulundu ama yanıt boşsa (bu hata normalde olmamalı)
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

     // Kullanıcının yazdığı orijinal metni arayüze ekle
    addMessage(cleanTextForDisplay(messageText), 'user'); // Gösterirken temel temizlik yapabiliriz

    userInput.value = ''; // Giriş alanını temizle
    userInput.focus(); // Odaklanmayı giriş alanında tut

    // Bot yanıtını bir gecikmeyle işle ve ekle
    // Gecikme, botun düşündüğü izlenimini verir
    setTimeout(() => {
        const botResponse = processUserInput(messageText);
        addMessage(botResponse, 'bot');
    }, 300 + Math.random() * 500); // 300ms ile 800ms arası rastgele gecikme
}

// OCR işlemini gerçekleştiren fonksiyon
async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil!", "bot");
        return;
    }

    addMessage("Görsel işleniyor...", "bot"); // İşlem başladığını belirt

    try {
        // Tesseract recognize işlemi zaman alabilir, progress callback eklenebilir
        const { data: { text } } = await ocrWorker.recognize(imageFile);

        if (text && text.trim()) {
             // OCR sonucunu temizleyip göster
             addMessage("Görselden algılanan metin:\n" + cleanTextForDisplay(text), "bot");
        } else {
            addMessage("Görselde metin bulamadım!", "bot");
        }
    } catch (error) {
        console.error("OCR sırasında hata oluştu:", error);
        addMessage("OCR yapılırken bir sıkıntı oldu!", "bot");
    }
}


// --- Event Listeners ---

// Gönder butonuna tıklama olay dinleyicisi
sendButton.addEventListener('click', sendMessage);

// Giriş alanında 'Enter' tuşuna basma olay dinleyicisi
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Default formu gönderme davranışını engelle
        sendMessage();
    }
});

// Sürükle-Bırak Olayları
chatContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); // Varsayılan davranışı (dosyayı açmayı) engelle
    chatContainer.classList.add('dragover'); // Görsel geri bildirim için sınıf ekle
    e.dataTransfer.dropEffect = 'copy'; // İmleci kopyalama olarak ayarla
});

chatContainer.addEventListener('dragleave', () => {
    chatContainer.classList.remove('dragover'); // Sınıfı kaldır
});

chatContainer.addEventListener('drop', (e) => {
    e.preventDefault(); // Varsayılan davranışı engelle
    chatContainer.classList.remove('dragover'); // Sınıfı kaldır

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            performOcr(file); // Görselse OCR yap
        } else {
            addMessage("Sadece görsel dosyalarını sürükleyip bırakabilirsin!", "bot");
        }
    }
});

// File input (ataç butonu) change olayı
fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            performOcr(file); // Görselse OCR yap
        } else {
            addMessage("Sadece görsel dosyaları seçebilirsin!", "bot");
        }
         // Input alanını temizle ki aynı dosyayı tekrar seçince change olayı tetiklensin
         event.target.value = '';
    }
});


// Sayfa yüklendiğinde bot verilerini, Fuse.js'i ve Tesseract'ı yükle
document.addEventListener('DOMContentLoaded', async () => {
    // loadBotData fonksiyonu artık Fuse.js'i de başlatıyor
    await loadBotData();
    // Tesseract worker'ı hemen başlat, drop/select events rely on it being ready.
    initializeOcrWorker(); // No need to await here if it's non-blocking or handled internally
});