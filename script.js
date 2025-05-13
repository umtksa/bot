// script.js

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const chatContainer = document.getElementById('chatContainer'); // chat-container elementini yakala
let botData = {}; // Yüklenen JSON verilerini depolamak için

// Tesseract.js worker değişkeni
let ocrWorker;

// --- Türkçe Stopword Listesi ---
// Bu liste, metin işlenirken çıkarılacak yaygın kelimeleri içerir.
const turkishStopwords = new Set([
    "a", "acaba", "altı", "altmış", "ama", "ancak", "arada", "aslında", "ayrıca", "bana", "bazı", "bazıları", "belki", "ben", "benden", "beni", "benim", "beri", "beş", "bile", "bin", "bir", "biraz", "biri", "birkaç", "birşey", "biz", "bizden", "bize", "bizi", "bizim", "böyle", "böylece", "bu", "buna", "bunda", "burada", "bunu", "bunun", "çoğu", "çoğuna", "çoğunu", "çok", "çünkü", "da", "daha", "dahi", "de", "den", "derece", "diğer", "diğeri", "diğerleri", "doksan", "dokuz", "dolayı", "dört", "eğer", "elli", "en", "etmek", "etti", "ettiği", "ettik", "ettiğini", "ettiyseniz", "edecek", "eden", "eder", "ediyor", "edesin", "etmiş", "etmek", "etmiyor", "etmişsiniz", "etmez", "eylemeden", "edenler", "eylesem", "eyle", "fakat", "falan", "filan", "galiba", "gel", "gelir", "gibi", "göre", "görece", "göreceli", "görünüşe", "halde", "hala", "hangi", "hangisi", "hani", "haricinde", "hariç", "hatta", "hem", "henüz", "hep", "hepsi", "her", "herhangi", "herkes", "herkese", "herkesi", "herkesin", "hiç", "hiçbir", "hiçbiri", "için", "içinde", "iki", "ile", "ilgili", "ise", "işte", "itibaren", "itibariyle", "kaç", "kadar", "karşın", "katrilyon", "kendi", "kendine", "kendinden", "kendini", "kendisi", "kendisine", "kendisini", "kendilerinin", "kendi", "kime", "kimden", "kimi", "kimse", "kırk", "köken", "madem", "mademki", "masaüstü", "meğer", "milyar", "milyon", "mi", "mu", "mü", "nasıl", "nasılsa", "ne", "neden", "nedense", "nerde", "nereden", "nereye", "nesi", "neyse", "niçin", "niye", "o", "ondan", "onlar", "onlardan", "onları", "onların", "onu", "onun", "otuz", "oysa", "oysaki", "pek", "rağmen", "sana", "sanki", "sen", "senden", "seni", "senin", "seksen", "seksenbir", "şayet", "şey", "şeyden", "şeye", "şeyler", "şeyi", "şeyin", "şöyle", "şu", "şuna", "şunlar", "şunu", "şunun", "ta", "tabii", "tamam", "tamamen", "tıpkı", "trilyon", "tüm", "tümü", "üzere", "var", "vardı", "varken", "ve", "veya", "yahut", "ya", "yani", "yapacak", "yapılan", "yapmak", "yaptı", "yaptığı", "yaptığını", "yaptıkları", "yaptıktan", "yaptırdıktan", "yaptırılmaktadır", "yaptırmalı", "yaptırmasa", "yaptırmasın", "yaptırmıştır", "yapıyor", "yapıyorlar", "yapmadınmı", "yapamam", "yapamazsın", "yapabilir", "yapabilirim", "yapabilirsin", "yapabiliriz", "yapabilirsiniz", "yapabilirler", "yapmalıyım", "yapmalısın", "yapmalı", "yapmalıyız", "yapmalısınız", "yapmalılar", "yapmam", "yapmamalısın", "yapmamalıyız", "yapmaz", "yapıyorum", "yapıyorsun", "yapıyor", "yapıyoruz", "yapıyorsunuz", "yapıyorlar", "yine", "yirmi", "yüz", "zaten", "zira"
]);
// --- Stopword Listesi Sonu ---

// Tesseract.js worker'ını başlatma fonksiyonu
async function initializeOcrWorker() {
    console.log("OCR motoru başlatılıyor...");
    try {
        // 'tur' Türkçe, 'eng' İngilizce dil paketleri için. İhtiyaca göre başka diller de eklenebilir.
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
    } catch (error) {
        console.error("Bot verileri yüklenirken bir hata oluştu:", error);
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

// --- Güncellendi: Metni temizleme, tokenlara ayırma ve stopword'leri çıkarma fonksiyonu ---
function cleanAndTokenize(text, removeStopwords = true) {
    if (!text) return []; // Boş veya tanımsız metin gelirse boş dizi döndür

    // Küçük harf yap
    const cleanedText = text.toLowerCase();

    // Kesme işaretini kaldır (')
    const textWithoutApostrophes = cleanedText.replace(/'/g, '');

    // Noktalama işaretlerini (virgül dahil) ve diğer özel karakterleri boşluğa çevir,
    // ardından metni kelimelere (tokenlara) ayır.
    const tokens = textWithoutApostrophes
        .replace(/[.,!?;:\s]+/g, ' ') // Noktalama ve birden fazla boşluğu tek boşluğa çevir
        .trim() // Baştaki ve sondaki boşlukları sil
        .split(' ') // Tek boşluğa göre ayır
        .filter(word => word.length > 0); // Boş stringleri filtrele

    if (removeStopwords) {
        return tokens.filter(token => !turkishStopwords.has(token));
    }
    return tokens;
}

// --- Yeni: Jaccard Index hesaplama fonksiyonu ---
// İki token dizisi arasındaki Jaccard benzerliğini hesaplar.
function getJaccardIndex(tokens1, tokens2) {
    if (!tokens1 || !tokens2 || tokens1.length === 0 || tokens2.length === 0) {
        // Kümelerden biri boşsa benzerlik 0'dır.
        // Ancak kullanıcı girdisi boş değil, sadece stopword'lerden oluşuyorsa,
        // bu durumda karşılaştıracak bir şey olmadığı için 0 döndürmek mantıklıdır.
         if (tokens1.length === 0 && tokens2.length === 0) return 1; // İkisi de boşsa %100 benzerlik gibi düşünülebilir
         return 0;
    }

    // Token dizilerini Set'lere dönüştür (benzersiz kelimeler için)
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    // Kesişim kümesini bul
    const intersection = new Set([...set1].filter(token => set2.has(token)));

    // Birleşim kümesini bul
    const union = new Set([...set1, ...set2]);

    // Jaccard Index'i hesapla: Kesişim boyutu / Birleşim boyutu
    // Birleşim kümesi boşsa (iki küme de boşsa) 0'a bölme hatasını engelle
     if (union.size === 0) return 0;

    const jaccard = intersection.size / union.size;

    return jaccard;
}


// Kullanıcı girdisini işleme ve bot yanıtı oluşturma fonksiyonu
function processUserInput(input) {
    // --- Math.js kısmı (Bu kısım değişmedi, önce matematik kontrolü hala mantıklı) ---
    // Matematik için temizleme yaparken sadece virgülleri noktaya çevir, diğer işlemleri Math.js yapsın
    const cleanedInputForMath = input.toLowerCase().normalize("NFC").replace(/,/g, '.');
    const hasNumber = /\d/.test(cleanedInputForMath);
    // Matematiksel veya birim çevirme gibi görünen ifadeler için kontrol
    const looksLikeMathOrUnitConversion = hasNumber && (
        cleanedInputForMath.includes(' to ') || // Birim çevirme gibi
        /[+\-*/^()]/.test(cleanedInputForMath) || // Basit matematiksel operatörler
        cleanedInputForMath.includes('sqrt') ||
        cleanedInputForMath.includes('log') ||
        cleanedInputForMath.includes('sin') ||
        cleanedInputForMath.includes('cos') ||
        cleanedInputForMath.includes('tan')
    );

    if (looksLikeMathOrUnitConversion) {
        try {
            const result = math.evaluate(cleanedInputForMath);
             // math.js geçerli bir sayı, birim, kompleks sayı veya BigNumber döndürdüyse
             if (typeof result === 'number' || result instanceof math.Unit || result instanceof math.Complex || result instanceof math.BigNumber || (result !== null && typeof result === 'object' && typeof result.toString === 'function')) {
                return result.toString(); // Sonucu string olarak döndür
             } else {
                // math.evaluate hata fırlatmadı ama tanımsız/geçersiz bir şey döndürdü
                console.warn("Math.js tanımsız bir sonuç döndürdü:", result);
                // JSON aramasına devam etmek için burayı atla
             }
        } catch (e) {
            // math.js geçerli bir ifade bulamazsa veya hesaplama hatası olursa hata fırlatır
            console.warn("Math.js hesaplaması başarısız oldu:", e.message);
            // Bu durumda, varsayılan olarak JSON veri tabanında arama yapmaya devam et
        }
    }
    // --- Math.js kısmı sonu ---


    // --- JSON data.json Lookup (Jaccard Index ile) ---
    // Kullanıcı girdisini temizle ve tokenlara ayır (stopwords çıkarılmış)
    const userInputTokensFiltered = cleanAndTokenize(input, true);

    // Eğer kullanıcı girdisi temizlendikten ve stopword'ler çıkarıldıktan sonra boşsa,
    // anlamlı bir soru sorulmamıştır.
    if (userInputTokensFiltered.length === 0) {
         // Math.js de sonuç vermediyse buraya düşer.
        return "Üzgünüm, ne sorduğunu anlayamadım.";
    }


    let bestMatchScore = 0;
    let bestMatchResponse = "Üzgünüm, sorunuzu tam olarak anlayamadım."; // Varsayılan yanıt
    // Eşik değeri: Jaccard Index'in en az bu kadar olması durumunda yanıtı kabul et.
    // Bu değeri test ederek ayarlayabilirsin. 0.2 - 0.4 arası başlangıç için makul olabilir.
    const responseThreshold = 0.2; // Jaccard Index için eşik değeri (0-1 arası)


    // Her bir data.json anahtarını (soru şablonunu) kontrol et
    for (const key in botData) {
        // Anahtar metnini alıp temizle ve tokenlara ayır (stopwords çıkarılmış)
        // data.json anahtarları virgülle ayrılmıştı, cleanAndTokenize bunu artık içeriyor
        const keyTokensFiltered = cleanAndTokenize(key, true);

        // Anahtarın kendisi stopword'lerden oluşuyorsa veya boşsa atla
        if (keyTokensFiltered.length === 0) continue;

        // --- Yeni: Jaccard Index'i hesapla ---
        const currentScore = getJaccardIndex(userInputTokensFiltered, keyTokensFiltered);

        // Konsola her anahtar için skoru yazdırmak debug için faydalı olabilir
        // console.log(`Key: "${key}" -> Filtered Tokens: [${keyTokensFiltered.join(', ')}] | User Tokens: [${userInputTokensFiltered.join(', ')}] | Jaccard Score: ${currentScore.toFixed(2)}`);

        // Daha iyi bir eşleşme bulunursa güncelle
        // Eşik değeri üzerinde ve mevcut en iyi skordan yüksek olmalı
        if (currentScore > bestMatchScore && currentScore >= responseThreshold) {
            bestMatchScore = currentScore;
            bestMatchResponse = botData[key];
        }
         // Eğer mükemmel bir eşleşme (score 1.0) bulursak aramayı durdurabiliriz
         if (bestMatchScore === 1.0) break;
    }

    // Konsola bulunan en iyi skoru yazdır
    console.log(`Final Best Match Score: ${bestMatchScore.toFixed(2)}`);

    // Yanıtın dinamik içeriğini (saat, tarih) güncelle
    // Eğer hiç eşleşme bulunamazsa (bestMatchScore < responseThreshold), varsayılan yanıt kullanılır,
    // ancak onda {{placeholder}} olmadığı için bu satırlar sorun çıkarmaz.
    if (bestMatchResponse.includes('{{currentTime}}')) {
        bestMatchResponse = bestMatchResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    }
    if (bestMatchResponse.includes('{{currentDate}}')) {
        bestMatchResponse = bestMatchResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }

    // Eğer en iyi skor eşik değerinin altındaysa, varsayılan 'anlayamadım' yanıtını kullan
    if (bestMatchScore < responseThreshold) {
         // bestMatchResponse zaten varsayılan 'anlayamadım' mesajı olarak ayarlanmıştı
         // ancak buraya tekrar açıkça belirtebiliriz veya varsayılanı kullanmaya devam ederiz.
         // Şimdiki kod varsayılanı döndürecek.
    }


    return bestMatchResponse; // Hesaplanan en iyi yanıtı döndür
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
    // Spinner kaldırıldığı için yerine küçük bir gecikme koymak iyi
    setTimeout(() => {
        const botResponse = processUserInput(messageText);
        addMessage(botResponse, 'bot');
    }, 300 + Math.random() * 500); // Gecikme süresini biraz artırabilirsin
}

// OCR işlemini gerçekleştiren fonksiyon (Bu fonksiyon değişmedi)
async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil!", "bot");
        return;
    }

    addMessage("Görsel işleniyor...", "bot"); // OCR başladığında mesaj
    // ocrSpinner.style.display = 'block'; // Spinner kaldırıldı

    try {
        const { data: { text } } = await ocrWorker.recognize(imageFile);
        // ocrSpinner.style.display = 'none'; // Spinner kaldırıldı

        if (text && text.trim()) { // text null veya undefined olabilir kontrolü eklendi
            addMessage("Görseldeki metin:\n\n" + text.trim(), "bot"); // OCR sonucunu belirt
        } else {
            addMessage("Görselde metin bulamadım!", "bot");
        }
    } catch (error) {
        console.error("OCR sırasında hata oluştu:", error);
        // ocrSpinner.style.display = 'none'; // Spinner kaldırıldı
        addMessage("OCR yapılırken bir sorun oluştu!", "bot");
    }
}

// Sürükle-Bırak Olayları (Bu kısım değişmedi)

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