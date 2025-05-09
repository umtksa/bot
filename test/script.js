// --- VERİ DEPOLAMA (JSON'dan yüklenecek) ---
let capitals = {};
let licensePlates = {};

const defaultResponses = [
    "Üzgünüm, anlayamadım.",
    "Bu konuda bir bilgim yok.",
    "Hiç bir fikrim yok!",
    "Tam olarak ne dediğini anlamadım."
];

// Temizlenecek (yok sayılacak) kelimeler - Bu listeyi ihtiyaca göre genişletebilirsiniz.
const wordsToIgnore = [
    "kimdir", "nedir", "kaçtır", "ne", "kaç", "canım", "benim", "lütfen",
    "acaba", "bir", "bi", "mi", "mı", "mu", "mü", "misin", "mısın", "musun", "müsün",
    "mıdır", "midir", "mudur", "müdür", "acaba", "ki"
];

// --- ARAYÜZ ELEMANLARI ---
const chatMessagesContainer = document.getElementById('chatMessages');
const userInputElement = document.getElementById('userInput');
const sendButton = document.querySelector('.chat-input button');

// ARAMA ANAHTARI OLUŞTURMA FONKSİYONU
function getLookupKey(text) {
    if (typeof text !== 'string') return '';
    let key = text.toLocaleLowerCase('tr-TR');
    key = key.replace(/ı/g, 'i'); // 'ı' harfini 'i' yap
    key = key.replace(/ğ/g, 'g'); // 'ğ' harfini 'g' yap - isteğe bağlı, arama tutarlılığı için
    key = key.replace(/ü/g, 'u'); // 'ü' harfini 'u' yap
    key = key.replace(/ş/g, 's'); // 'ş' harfini 's' yap
    key = key.replace(/ö/g, 'o'); // 'ö' harfini 'o' yap
    key = key.replace(/ç/g, 'c'); // 'ç' harfini 'c' yap
     // Ek olarak boşlukları da temizleyebiliriz lookup key için, tamamen eşleşme isterseniz
    // key = key.replace(/\s+/g, '');
    return key;
}

// Girişi temizleyen fonksiyon - Belirlenen kelimeleri ve noktalama işaretlerini kaldırır
function cleanInput(input, wordsToIgnoreList) {
    if (typeof input !== 'string') return '';
    let cleaned = input.toLocaleLowerCase('tr-TR');

    // Noktalama işaretlerini boşlukla değiştir
    cleaned = cleaned.replace(/[.,!?;:]/g, ' ');

    // Birden fazla boşluğu tek boşluğa indirge ve baştaki/sondaki boşlukları kaldır
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    if (cleaned === "") return ""; // Temizleme sonrası boş kalırsa boş string döndür

    // Kelimelere ayır
    const words = cleaned.split(' ');

    // Yok sayılacak kelimeleri filtrele
    const filteredWords = words.filter(word => !wordsToIgnoreList.includes(word));

    // Tekrar birleştir
    return filteredWords.join(' ');
}


// --- VERİ YÜKLEME VE BAŞLATMA ---
async function loadDataAndInitialize() {
    if (userInputElement) {
        userInputElement.disabled = true;
        userInputElement.placeholder = "Veriler yükleniyor...";
    }
    if (sendButton) {
        sendButton.disabled = true;
    }

    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Başkent verilerini işle
        const rawCapitals = data.capitals;
        capitals = {};
        for (const key in rawCapitals) {
            if (Object.prototype.hasOwnProperty.call(rawCapitals, key)) {
                 // Başkent lookup key'i oluşturulurken kelimeler temizlenmeli mi?
                 // Genellikle ülke ismi temizlenmez, sadece arama anahtarı için formatlanır.
                 // O yüzden burada getLookupKey kullanmak yeterli.
                capitals[getLookupKey(key)] = rawCapitals[key];
            }
        }

        // Plaka verilerini işle
        const rawLicensePlates = data.licensePlates;
        licensePlates = {};
        for (const key in rawLicensePlates) {
            if (Object.prototype.hasOwnProperty.call(rawLicensePlates, key)) {
                 // İl/İlçe ismi için lookup key
                licensePlates[getLookupKey(key)] = rawLicensePlates[key];
            }
        }

        console.log("Veriler başarıyla yüklendi ve arama anahtarları oluşturuldu.");
        if (userInputElement) {
            userInputElement.disabled = false;
            userInputElement.placeholder = "Mesajınızı yazın...";
            userInputElement.focus();
        }
        if (sendButton) {
            sendButton.disabled = false;
        }
    } catch (error) {
        console.error("Veri yüklenirken hata oluştu:", error);
        displayMessage("Veri kaynakları yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.", "bot");
        if (userInputElement) {
            userInputElement.placeholder = "Bot kullanılamıyor.";
        }
    }
}

// --- BOT MANTIĞI ---

// İyelik eklerini ve ilişkili kelimeleri içeren regex desenleri
// En uzun ve en spesifik olanlar başa gelecek şekilde sıralandı.
const plateSuffixPattern = "(?:ilinin|şehrinin|'?nın|'?nin|'?nun|'?nün|'?ın|'?in|'?un|'?ün|ili)";
const capitalSuffixPattern = "(?:ülkesinin|'?nın|'?nin|'?nun|'?nün|'?ın|'?in|'?un|'?ün)";

// Regex'leri global scope'ta tanımlayalım
// NOT: Regex kalıpları, GİRİŞ TEMİZLENDİKTEN SONRA KALAN METİN üzerinde çalışır.
// Bu nedenle, artık regex'lerin sonuna "nedir", "kaçtır" gibi kelimeleri eklemeye gerek kalmayabilir,
// çünkü bu kelimeler zaten cleanInput tarafından kaldırılmış olacak.
// Sadece anahtar kelime + belki iyelik eklerini hedeflemek yeterli olabilir.
// Yeni regex'ler temizlenmiş girişi hedefleyecek şekilde:
const plateRegex = new RegExp(`^(.+?)\\s*(?:${plateSuffixPattern})?\\s*(plakas(?:ı|i)|plaka kodu)\\s*?$`, 'i'); // Sonundaki soru kelimeleri kaldırıldı
const capitalRegex = new RegExp(`^(.+?)\\s*(?:${capitalSuffixPattern})?\\s*başkenti\\s*?$`, 'i'); // Sonundaki soru kelimeleri kaldırıldı
const simplePlateRegex = new RegExp(/^(.+?)\s+plaka\s*?$/i); // Basit sorgu: "ankara plaka" - sonundaki soru işareti opsiyonel
const simpleCapitalRegex = new RegExp(/^(.+?)\s+başkent\s*?$/i); // Basit sorgu: "türkiye başkent" - sonundaki soru işareti opsiyonel


function getBotResponse(userInput) {
    // Veri yüklenmediyse bekleme mesajı
    if (Object.keys(capitals).length === 0 && Object.keys(licensePlates).length === 0) {
        const placeholderText = userInputElement ? userInputElement.placeholder : "";
        if (placeholderText === "Veriler yükleniyor..." || placeholderText === "Bot kullanılamıyor.") {
             return "Veriler henüz hazır değil, lütfen biraz bekleyin.";
        }
    }

    // Orijinal girişi küçük harfe çevir (Bazı spesifik kontroller için lazım olabilir)
    const lowerInput = userInput.toLocaleLowerCase('tr-TR').trim();

    // Girişi temizle - Yok sayılacak kelimeler ve noktalama işaretleri kaldırılır
    const cleanedLowerInput = cleanInput(userInput, wordsToIgnore);

    let cityForPlateRaw = "";
    let countryForCapitalRaw = "";

    // --- BOT CEVAP MANTIĞI ---

    // 1. Basit Matematik İşlemleri (Orijinal girişte yapmak daha doğru)
    const mathMatch = lowerInput.match(/^(\d+(\.\d+)?)\s*([\+\-\*\/])\s*(\d+(\.\d+)?)$/);
    if (mathMatch) {
        const num1 = parseFloat(mathMatch[1]);
        const operator = mathMatch[3];
        const num2 = parseFloat(mathMatch[4]);
        let result;
        switch (operator) {
            case '+': result = num1 + num2; break;
            case '-': result = num1 - num2; break;
            case '*': result = num1 * num2; break;
            case '/':
                if (num2 === 0) return "Sıfıra bölme hatası!";
                result = num1 / num2;
                break;
            default: return "Geçersiz matematik operatörü.";
        }
        // Sonucu tam sayıysa .00 olmadan göster, değilse 2 ondalık basamak göster
        const formattedResult = Number.isInteger(result) ? result : result.toFixed(2);
        return `${num1} ${operator} ${num2} = ${formattedResult}`;
    }

    // 2. Plaka Kodu Sorgulama (Temizlenmiş giriş üzerinde çalış)
    const plateMatch = cleanedLowerInput.match(plateRegex);
    if (plateMatch) {
        cityForPlateRaw = plateMatch[1].trim(); // Yakalanan grup temizlenmiş olacak
        const lookupKey = getLookupKey(cityForPlateRaw); // Arama anahtarını oluştur
        if (licensePlates[lookupKey]) {
            return `${capitalizeFirstLetter(cityForPlateRaw)} ilinin plaka kodu: ${licensePlates[lookupKey]}`;
        }
    }
    // Basit plaka sorgusu (eğer karmaşık olan eşleşmediyse ve temizlenmiş giriş üzerinde çalış)
    const simplePlateMatch = cleanedLowerInput.match(simplePlateRegex);
     if (simplePlateMatch && !cityForPlateRaw) { // Önceki eşleşmediyse ve bu eşleştiyse
         cityForPlateRaw = simplePlateMatch[1].trim();
         const lookupKey = getLookupKey(cityForPlateRaw); // Arama anahtarını oluştur
         if (licensePlates[lookupKey]) {
            return `${capitalizeFirstLetter(cityForPlateRaw)} ilinin plaksı ${licensePlates[lookupKey]}`;
        }
    }

    // 3. Başkent Sorgulama (Temizlenmiş giriş üzerinde çalış)
    const capitalMatch = cleanedLowerInput.match(capitalRegex);
    if (capitalMatch) {
        countryForCapitalRaw = capitalMatch[1].trim(); // Yakalanan grup temizlenmiş olacak
        const lookupKey = getLookupKey(countryForCapitalRaw); // Arama anahtarını oluştur
         if (capitals[lookupKey]) {
            return `${capitalizeFirstLetter(countryForCapitalRaw)} başkenti ${capitals[lookupKey]}.`;
        }
    }
    // Basit başkent sorgusu (Temizlenmiş giriş üzerinde çalış)
    const simpleCapitalMatch = cleanedLowerInput.match(simpleCapitalRegex);
     if (simpleCapitalMatch && !countryForCapitalRaw) { // Önceki eşleşmediyse ve bu eşleştiyse
         countryForCapitalRaw = simpleCapitalMatch[1].trim();
         const lookupKey = getLookupKey(countryForCapitalRaw); // Arama anahtarını oluştur
         if (capitals[lookupKey]) {
            return `${capitalizeFirstLetter(countryForCapitalRaw)} başkenti ${capitals[lookupKey]}.`;
        }
    }

    // Selamlama ve basit cevaplar (Burada ORIGINAL düşük harfli girişi kullanmak daha doğal olabilir)
    // "Merhaba canım benim" -> lowerInput kullanılır, "canım benim" temizlenmez.
    // "Merhaba" kelimesi içeriliyor mu diye bakılır.
    if (["merhaba", "selam", "selamlar", "hey", "günaydın", "iyi günler", "iyi akşamlar", "iyi geceler"].some(word => lowerInput.includes(word) || lowerInput === word )) {
        return "Merhaba! Size nasıl yardımcı olabilirim?";
    }
    if (["nasılsın", "naber", "nasıl gidiyor"].some(word => lowerInput.includes(word))) {
        return "İyiyim, sorduğunuz için teşekkürler!";
    }
    if (["teşekkür ederim", "teşekkürler", "tenks", "thanks", "sağ ol", "sağol", "çok teşekkürler"].some(word => lowerInput.includes(word))) {
        return "Rica ederim!";
    }
    if (["adın ne", "kimsin", "ismin"].some(word => lowerInput.includes(word))) {
        return "adım ahraz."; // Botunuzun adı
    }
    // Sakıncalı ifadeler (Orijinal girişte kontrol etmek uygun)
    if (["mal mısın", "gerizekalı", "salak", "aptal"].some(word => lowerInput.includes(word))) {
        return "oldukça gerizekalıyım"; // Botunuzun cevabı
    }
     if (["görüşürüz", "hoşçakal", "bay bay", "siyu", "see you", "bye"].some(word => lowerInput.includes(word))) {
        return "Görüşmek üzere!";
    }

    // Saat ve Tarih sorguları (Temizlenmiş giriş üzerinde çalışmak daha esnek olur)
    // "Saat kaç canım benim" -> "saat" olur temizlenince.
    // "Bugünün tarihi ne acaba?" -> "bugünün tarihi" olur temizlenince.
    if (cleanedLowerInput === "saat" || cleanedLowerInput === "zaman") {
        const now = new Date();
        // toLocaleTimeString zaten bölgesel formatı kullanır, saniyeyi kapatmak için seçenek ekledik
        return `Şu an saat: ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    // "Bugünün tarihi ne" temizlenince "bugünün tarihi" kalır
    // "Tarih ne" temizlenince "tarih" kalır
    if (cleanedLowerInput === "bugün ne gün" || cleanedLowerInput === "bugünün tarihi" || cleanedLowerInput === "tarih") {
        const now = new Date();
         // toLocaleDateString tarih formatını ayarlar
        return `Bugün: ${now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }


    // Eğer temizlenmiş giriş tamamen boş kaldıysa (sadece yok sayılan kelimelerden oluşuyorsa)
    // veya hiçbir kurala uymuyorsa varsayılan cevap
    if (cleanedLowerInput === "") {
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]; // Veya özel bir mesaj: "Sanırım sadece sohbet etmek istediniz?"
    }

    // Hiçbiri eşleşmezse varsayılan cevap
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// İlk harfi büyük yapan fonksiyon (Türkçe karakterlere duyarlı)
function capitalizeFirstLetter(string) {
    if (!string) return string;
    // Tüm stringi küçük harfe çevirip kelimelere ayır
    return string.toLocaleLowerCase('tr-TR').split(' ').map(word => {
        if (word.length === 0) return ''; // Boş kelimeleri atla
        // İlk harfi al
        const firstChar = word.charAt(0);
        // Geri kalanını al
        const rest = word.slice(1);

        // Türkçe büyük/küçük harf kurallarına göre ilk harfi büyüt
        if (firstChar === 'i') {
            return 'İ' + rest.toLocaleLowerCase('tr-TR'); // 'i' -> 'İ'
        } else if (firstChar === 'ı') {
             return 'I' + rest.toLocaleLowerCase('tr-TR'); // 'ı' -> 'I'
        }
        // Diğer harfler için varsayılan büyük harf
        return firstChar.toLocaleUpperCase('tr-TR') + rest.toLocaleLowerCase('tr-TR');

    }).join(' '); // Kelimeleri boşlukla birleştir
}

// --- ARAYÜZ ETKİLEŞİMİ ---
if (userInputElement) {
    userInputElement.addEventListener('keypress', function(event) {
        // Enter tuşu ve input aktifse mesaj gönder
        if (event.key === 'Enter' && !userInputElement.disabled) {
            sendMessage();
        }
    });
}
if (sendButton && userInputElement) {
    sendButton.addEventListener('click', function() {
        // Buton aktifse mesaj gönder
        if (!userInputElement.disabled) {
            sendMessage();
        }
    });
}

// Mesajı sohbet alanına ekler
function displayMessage(text, sender) {
    if (!chatMessagesContainer) return;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.textContent = text;
    chatMessagesContainer.appendChild(messageDiv);
    // En son mesaja kaydır
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Kullanıcı mesajını alır, gösterir ve bot yanıtını tetikler
function sendMessage() {
    // Input alanı yoksa veya devre dışıysa çık
    if (!userInputElement || userInputElement.disabled) {
        return;
    }
    // Mesajı al ve baştaki/sondaki boşlukları temizle
    const messageText = userInputElement.value.trim();
    // Boş mesaj göndermeyi engelle
    if (messageText === '') return;

    // Kullanıcı mesajını göster
    displayMessage(messageText, 'user');
    // Input alanını temizle ve odaklan
    userInputElement.value = '';
    userInputElement.focus();

    // Botun cevabını al ve biraz gecikmeli göster
    setTimeout(() => {
        const botReply = getBotResponse(messageText);
        displayMessage(botReply, 'bot');
    }, 500 + Math.random() * 300); // 500ms + 0-300ms arası rastgele gecikme
}

// Sayfa yüklendiğinde verileri yüklemeyi başlat
document.addEventListener('DOMContentLoaded', loadDataAndInitialize);