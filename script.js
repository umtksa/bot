// --- VERİ DEPOLAMA (JSON'dan yüklenecek) ---
let capitals = {};
let licensePlates = {};

const defaultResponses = [
    "Üzgünüm, anlayamadım.",
    "Bu konuda bir bilgim yok.",
    "Hiç bir fikrim yok!",
    "Tam olarak ne dediğini anlamadım."
];

// --- ARAYÜZ ELEMANLARI ---
const chatMessagesContainer = document.getElementById('chatMessages');
const userInputElement = document.getElementById('userInput');
const sendButton = document.querySelector('.chat-input button');

// ARAMA ANAHTARI OLUŞTURMA FONKSİYONU
function getLookupKey(text) {
    if (typeof text !== 'string') return '';
    let key = text.toLocaleLowerCase('tr-TR');
    key = key.replace(/ı/g, 'i');
    return key;
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

        const rawCapitals = data.capitals;
        capitals = {};
        for (const key in rawCapitals) {
            if (Object.prototype.hasOwnProperty.call(rawCapitals, key)) {
                capitals[getLookupKey(key)] = rawCapitals[key];
            }
        }

        const rawLicensePlates = data.licensePlates;
        licensePlates = {};
        for (const key in rawLicensePlates) {
            if (Object.prototype.hasOwnProperty.call(rawLicensePlates, key)) {
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

// Regex'leri bir kere oluşturup tekrar kullanmak daha performanslı olabilir, ancak burada okunurluk için fonksiyon içinde bırakıyorum.
// Veya global scope'ta tanımlayabilirsiniz:
const plateRegex = new RegExp(`^(.+?)\\s*(?:${plateSuffixPattern})?\\s*(plakas(?:ı|i)|plaka kodu)\\s*(?:nedir|kaç(?:tır)?)?\\??$`, 'i');
const capitalRegex = new RegExp(`^(.+?)\\s*(?:${capitalSuffixPattern})?\\s*başkenti\\s*(?:nedir|neresidir|hangisidir)?\\??$`, 'i');
const simplePlateRegex = new RegExp(/^(.+?)\s+plaka\s*\??$/i); // Basit sorgu: "ankara plaka"
const simpleCapitalRegex = new RegExp(/^(.+?)\s+başkent\s*\??$/i); // Basit sorgu: "türkiye başkent"


function getBotResponse(userInput) {
    if (Object.keys(capitals).length === 0 && Object.keys(licensePlates).length === 0) {
        const placeholderText = userInputElement ? userInputElement.placeholder : "";
        if (placeholderText === "Veriler yükleniyor..." || placeholderText === "Bot kullanılamıyor.") {
             return "Veriler henüz hazır değil, lütfen biraz bekleyin.";
        }
    }

    const lowerInput = userInput.toLocaleLowerCase('tr-TR').trim();
    let cityForPlateRaw = "";
    let countryForCapitalRaw = "";

    // 1. Basit Matematik İşlemleri
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
        return `${num1} ${operator} ${num2} = ${result}`;
    }

    // 2. Plaka Kodu Sorgulama
    const plateMatch = lowerInput.match(plateRegex);
    if (plateMatch) {
        cityForPlateRaw = plateMatch[1].trim(); // Yakalanan grup artık temizlenmiş olacak
        const lookupKey = getLookupKey(cityForPlateRaw);
        if (licensePlates[lookupKey]) {
            return `${capitalizeFirstLetter(cityForPlateRaw)} ilinin plaka kodu: ${licensePlates[lookupKey]}`;
        }
    }
    // Basit plaka sorgusu (eğer karmaşık olan eşleşmediyse)
    const simplePlateMatch = lowerInput.match(simplePlateRegex);
     if (simplePlateMatch && !cityForPlateRaw) { // Önceki eşleşmediyse ve bu eşleştiyse
         cityForPlateRaw = simplePlateMatch[1].trim();
         const lookupKey = getLookupKey(cityForPlateRaw);
         if (licensePlates[lookupKey]) {
            return `${capitalizeFirstLetter(cityForPlateRaw)} ilinin plaka kodu: ${licensePlates[lookupKey]}`;
        }
    }

    // 3. Başkent Sorgulama
    const capitalMatch = lowerInput.match(capitalRegex);
    if (capitalMatch) {
        countryForCapitalRaw = capitalMatch[1].trim(); // Yakalanan grup temizlenmiş olacak
        const lookupKey = getLookupKey(countryForCapitalRaw);
         if (capitals[lookupKey]) {
            return `${capitalizeFirstLetter(countryForCapitalRaw)}'nin başkenti ${capitals[lookupKey]}.`;
        }
    }
    // Basit başkent sorgusu
    const simpleCapitalMatch = lowerInput.match(simpleCapitalRegex);
     if (simpleCapitalMatch && !countryForCapitalRaw) {
         countryForCapitalRaw = simpleCapitalMatch[1].trim();
         const lookupKey = getLookupKey(countryForCapitalRaw);
         if (capitals[lookupKey]) {
            return `${capitalizeFirstLetter(countryForCapitalRaw)}'nin başkenti ${capitals[lookupKey]}.`;
        }
    }

    // Selamlama ve basit cevaplar
    if (["merhaba", "selam", "selamlar", "hey", "günaydın", "iyi günler", "iyi akşamlar", "iyi geceler"].some(word => lowerInput.startsWith(word) || lowerInput.endsWith(word) || lowerInput === word )) {
        return "Merhaba! Size nasıl yardımcı olabilirim?";
    }
    if (["nasılsın", "naber", "nasıl gidiyor"].some(word => lowerInput.includes(word))) {
        return "İyiyim, sorduğunuz için teşekkürler!";
    }
    if (["teşekkür ederim", "teşekkürler", "tenks", "thanks", "sağ ol", "sağol", "çok teşekkürler"].some(word => lowerInput.includes(word))) {
        return "Rica ederim!";
    }
    if (["adın ne", "kimsin", "ismin"].some(word => lowerInput.includes(word))) {
        return "adım ahraz.";
    }
    if (["mal mısın", "gerizekalı", "salak", "aptal"].some(word => lowerInput.includes(word))) {
        return "oldukça gerizekalıyım";
    }
     if (["görüşürüz", "hoşçakal", "bay bay", "siyu", "see you", "bye"].some(word => lowerInput.includes(word))) {
        return "Görüşmek üzere!";
    }
    if (lowerInput === "saat kaç" || lowerInput === "saat") {
    const now = new Date();
    // Saniyeyi gizlemek için seçenekler objesi kullanılır
    return `${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (lowerInput === "bugün ne gün" || lowerInput === "bugünün tarihi ne" || lowerInput === "tarih ne") {
        const now = new Date();
        return `${now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function capitalizeFirstLetter(string) {
    if (!string) return string;
    return string.toLocaleLowerCase('tr-TR').split(' ').map(word => {
        if (word.length === 0) return '';
        if (word.startsWith('i')) {
            return 'İ' + word.slice(1);
        }
        return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
    }).join(' ');
}

// --- ARAYÜZ ETKİLEŞİMİ ---
if (userInputElement) {
    userInputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !userInputElement.disabled) {
            sendMessage();
        }
    });
}
if (sendButton && userInputElement) {
    sendButton.addEventListener('click', function() {
        if (!userInputElement.disabled) {
            sendMessage();
        }
    });
}

function displayMessage(text, sender) {
    if (!chatMessagesContainer) return;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.textContent = text;
    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function sendMessage() {
    if (!userInputElement || userInputElement.disabled) {
        return;
    }
    const messageText = userInputElement.value.trim();
    if (messageText === '') return;

    displayMessage(messageText, 'user');
    userInputElement.value = '';
    userInputElement.focus();

    // Botun cevabını biraz gecikmeli vererek daha doğal bir his oluştur
    setTimeout(() => {
        const botReply = getBotResponse(messageText);
        displayMessage(botReply, 'bot');
    }, 500 + Math.random() * 300); // Rastgele küçük bir gecikme ekle
}

document.addEventListener('DOMContentLoaded', loadDataAndInitialize);
