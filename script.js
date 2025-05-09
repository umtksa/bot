// --- VERİ DEPOLAMA (JSON'dan yüklenecek) ---
let capitals = {};
let licensePlates = {};

const defaultResponses = [
    "Üzgünüm, bunu anlayamadım. Lütfen farklı bir şekilde sormayı deneyin.",
    "Bu konuda bir bilgim yok maalesef.",
    "Tam olarak ne demek istediğinizi çıkaramadım."
];

// --- ARAYÜZ ELEMANLARI ---
const chatMessagesContainer = document.getElementById('chatMessages');
const userInputElement = document.getElementById('userInput');
const sendButton = document.querySelector('.chat-input button');

// ARAMA ANAHTARI OLUŞTURMA FONKSİYONU
// Türkçe'ye uygun küçük harfe çevirir ve 'ı' ile 'i' harflerini birleştirir (tümünü 'i' yapar).
// Diğer Türkçe karakterleri (ö, ü, ş, ç, ğ) korur.
function getLookupKey(text) {
    if (typeof text !== 'string') return '';
    let key = text.toLocaleLowerCase('tr-TR'); // Türkçe'ye özgü doğru küçük harf dönüşümü
    key = key.replace(/ı/g, 'i'); // Tüm 'ı' harflerini 'i' harfine çevir
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
                capitals[getLookupKey(key)] = rawCapitals[key]; // Anahtarları normalize et
            }
        }

        const rawLicensePlates = data.licensePlates;
        licensePlates = {};
        for (const key in rawLicensePlates) {
            if (Object.prototype.hasOwnProperty.call(rawLicensePlates, key)) {
                licensePlates[getLookupKey(key)] = rawLicensePlates[key]; // Anahtarları normalize et
            }
        }

        console.log("Veriler başarıyla yüklendi ve arama anahtarları oluşturuldu.");
        // console.log("İşlenmiş Plakalar:", licensePlates);
        // console.log("İşlenmiş Başkentler:", capitals);

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
function getBotResponse(userInput) {
    if (Object.keys(capitals).length === 0 && Object.keys(licensePlates).length === 0) {
        const placeholderText = userInputElement ? userInputElement.placeholder : "";
        if (placeholderText === "Veriler yükleniyor..." || placeholderText === "Bot kullanılamıyor.") {
             return "Veriler henüz hazır değil, lütfen biraz bekleyin.";
        }
    }

    // Genel komutlar için kullanıcı girdisini Türkçe'ye uygun küçük harfe çevir
    const lowerInput = userInput.toLocaleLowerCase('tr-TR').trim();
    let cityForPlateRaw = ""; // Regex'ten yakalanan orijinal şehir adı
    let countryForCapitalRaw = ""; // Regex'ten yakalanan orijinal ülke adı

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
    const plateMatch = lowerInput.match(/(.+?)\s*(?:ilinin|'nin|nin| İli)?\s*(plakas(?:ı|i)|plaka kodu)\s*(?:nedir|kaç(?:tır)?)?\??$/i);
    if (plateMatch) {
        cityForPlateRaw = plateMatch[1].trim();
        const lookupKey = getLookupKey(cityForPlateRaw);
        if (licensePlates[lookupKey]) {
            return `${capitalizeFirstLetter(cityForPlateRaw)} ilinin plaka kodu: ${licensePlates[lookupKey]}`;
        }
    }
    const simplePlateMatch = lowerInput.match(/^(.+?)\s+plaka\s*\??$/i);
     if (simplePlateMatch && !cityForPlateRaw) {
         cityForPlateRaw = simplePlateMatch[1].trim();
         const lookupKey = getLookupKey(cityForPlateRaw);
         if (licensePlates[lookupKey]) {
            return `${capitalizeFirstLetter(cityForPlateRaw)} ilinin plaka kodu: ${licensePlates[lookupKey]}`;
        }
    }

    // 3. Başkent Sorgulama
    const capitalMatch = lowerInput.match(/(.+?)\s*(?:ülkesinin|'nin|nin)?\s*başkenti\s*(?:nedir|neresidir|hangisidir)?\??$/i);
    if (capitalMatch) {
        countryForCapitalRaw = capitalMatch[1].trim();
        const lookupKey = getLookupKey(countryForCapitalRaw);
         if (capitals[lookupKey]) {
            return `${capitalizeFirstLetter(countryForCapitalRaw)}'nin başkenti ${capitals[lookupKey]}.`;
        }
    }
    const simpleCapitalMatch = lowerInput.match(/^(.+?)\s+başkent\s*\??$/i);
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
        return "İyiyim, sorduğunuz için teşekkürler! Size nasıl yardımcı olabilirim?";
    }
    if (["teşekkür ederim", "teşekkürler", "sağ ol", "sağol", "çok teşekkürler"].some(word => lowerInput.includes(word))) {
        return "Rica ederim! Başka bir sorunuz var mı?";
    }
     if (["görüşürüz", "hoşça kal", "bay bay", "bye"].some(word => lowerInput.includes(word))) {
        return "Görüşmek üzere! Hoşça kalın.";
    }
    if (lowerInput === "saat kaç" || lowerInput === "saat") {
        const now = new Date();
        return `Şu an saat: ${now.toLocaleTimeString('tr-TR')}`;
    }
    if (lowerInput === "bugün ne gün" || lowerInput === "bugünün tarihi ne" || lowerInput === "tarih ne") {
        const now = new Date();
        return `Bugün: ${now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}


function capitalizeFirstLetter(string) {
    if (!string) return string;
    return string.toLocaleLowerCase('tr-TR').split(' ').map(word => {
        if (word.length === 0) return '';
        // 'i' harfi Türkçe'de büyük harfe çevrilirken 'İ' olmalı
        // Diğer harfler için standart toUpperCase() yeterli olacaktır (toLocaleUpperCase('tr-TR') de kullanılabilir)
        if (word.startsWith('i')) {
            return 'İ' + word.slice(1);
        }
        // Kelimenin ilk harfini Türkçe'ye uygun büyük harfe çevir
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

    setTimeout(() => {
        const botReply = getBotResponse(messageText);
        displayMessage(botReply, 'bot');
    }, 500 + Math.random() * 300);
}

document.addEventListener('DOMContentLoaded', loadDataAndInitialize);
