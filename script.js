// --- VERİ DEPOLAMA (JSON'dan yüklenecek) ---
let capitals = {};
let licensePlates = {};

// Bu sabit kalabilir veya JSON'a taşınabilir. Şimdilik burada bırakalım.
const defaultResponses = [
    "Üzgünüm, bunu anlayamadım. Lütfen farklı bir şekilde sormayı deneyin.",
    "Bu konuda bir bilgim yok maalesef.",
    "Tam olarak ne demek istediğinizi çıkaramadım."
];

// --- ARAYÜZ ELEMANLARI ---
const chatMessagesContainer = document.getElementById('chatMessages');
const userInputElement = document.getElementById('userInput');
const sendButton = document.querySelector('.chat-input button');


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
        const response = await fetch('data.json'); // JSON dosyasının yolu
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // data.json'dan yüklenen anahtarları normalize et
        const rawCapitals = data.capitals;
        capitals = {}; // Yeniden başlat
        for (const key in rawCapitals) {
            if (Object.prototype.hasOwnProperty.call(rawCapitals, key)) {
                capitals[normalizeText(key)] = rawCapitals[key];
            }
        }

        const rawLicensePlates = data.licensePlates;
        licensePlates = {}; // Yeniden başlat
        for (const key in rawLicensePlates) {
            if (Object.prototype.hasOwnProperty.call(rawLicensePlates, key)) {
                licensePlates[normalizeText(key)] = rawLicensePlates[key];
            }
        }

        console.log("Veriler başarıyla yüklendi ve anahtarlar normalleştirildi.");
        // İsteğe bağlı: Normalleştirilmiş verileri kontrol etmek için
        // console.log("Normalleştirilmiş Plakalar:", licensePlates);
        // console.log("Normalleştirilmiş Başkentler:", capitals);


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
        // Veriler yüklenememişse veya henüz yükleniyorsa bu kontrol önemli.
        // loadDataAndInitialize'daki placeholder'ı beklemek daha iyi olabilir,
        // ama bir güvenlik katmanı olarak kalabilir.
        const placeholderText = userInputElement ? userInputElement.placeholder : "";
        if (placeholderText === "Veriler yükleniyor..." || placeholderText === "Bot kullanılamıyor.") {
             return "Veriler henüz hazır değil, lütfen biraz bekleyin.";
        }
    }


    const lowerInput = userInput.toLowerCase().trim();
    let cityForPlate = "";
    let countryForCapital = "";

    // 1. Basit Matematik İşlemleri
    const mathMatch = lowerInput.match(/^(\d+(\.\d+)?)\s*([\+\-\*\/])\s*(\d+(\.\d+)?)$/); // Ondalıklı sayıları da destekler
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
            default: return "Geçersiz matematik operatörü."; // Bu durum regex ile yakalanmamalı
        }
        return `${num1} ${operator} ${num2} = ${result}`;
    }

    // 2. Plaka Kodu Sorgulama
    // Örnek: "izmirin plakası nedir", "izmir plaka kodu", "izmir plakası"
    const plateMatch = lowerInput.match(/(.+?)\s*(?:ilinin|'nin|nin| İli)?\s*(plakas(?:ı|i)|plaka kodu)\s*(?:nedir|kaç(?:tır)?)?\??$/i);
    if (plateMatch) {
        cityForPlate = normalizeText(plateMatch[1].trim());
        if (licensePlates[cityForPlate]) {
            return `${capitalizeFirstLetter(plateMatch[1].trim())} ilinin plaka kodu: ${licensePlates[cityForPlate]}`;
        }
    }
    // Örnek: "izmir plaka"
    const simplePlateMatch = lowerInput.match(/^(.+?)\s+plaka\s*\??$/i);
     if (simplePlateMatch && !cityForPlate) { // Eğer önceki regex yakalamadıysa
         cityForPlate = normalizeText(simplePlateMatch[1].trim());
         if (licensePlates[cityForPlate]) {
            return `${capitalizeFirstLetter(simplePlateMatch[1].trim())} ilinin plaka kodu: ${licensePlates[cityForPlate]}`;
        }
    }

    // 3. Başkent Sorgulama
    // Örnek: "türkiye'nin başkenti nedir", "almanya başkenti"
    const capitalMatch = lowerInput.match(/(.+?)\s*(?:ülkesinin|'nin|nin)?\s*başkenti\s*(?:nedir|neresidir|hangisidir)?\??$/i);
    if (capitalMatch) {
        countryForCapital = normalizeText(capitalMatch[1].trim());
         if (capitals[countryForCapital]) {
            return `${capitalizeFirstLetter(capitalMatch[1].trim())}'nin başkenti ${capitals[countryForCapital]}.`;
        }
    }
    // Örnek: "japonya başkent" (daha basit sorgu)
    const simpleCapitalMatch = lowerInput.match(/^(.+?)\s+başkent\s*\??$/i);
     if (simpleCapitalMatch && !countryForCapital) { // Eğer önceki regex yakalamadıysa
         countryForCapital = normalizeText(simpleCapitalMatch[1].trim());
         if (capitals[countryForCapital]) {
            return `${capitalizeFirstLetter(simpleCapitalMatch[1].trim())}'nin başkenti ${capitals[countryForCapital]}.`;
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

// Türkçe karakterleri normalleştirme ve küçük harfe çevirme
function normalizeText(text) {
    if (typeof text !== 'string') return ''; // Güvenlik önlemi
    return text.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
}

function capitalizeFirstLetter(string) {
    if (!string) return string;
    // Kelime kelime baş harf büyütme (örneğin "KAHRAMANMARAŞ" -> "Kahramanmaraş")
    return string.toLowerCase().split(' ').map(word => {
        if (word.length === 0) return '';
        // Özel durum: 'i' harfi büyük harfe çevrilirken 'İ' olmalı
        if (word.startsWith('i')) {
            return 'İ' + word.slice(1);
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
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
// Butona da event listener ekleyelim, HTML'deki onclick'e ek olarak
if (sendButton && userInputElement) {
    sendButton.addEventListener('click', function() {
        if (!userInputElement.disabled) {
            sendMessage();
        }
    });
}


function displayMessage(text, sender) {
    if (!chatMessagesContainer) return; // Element yoksa işlem yapma
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
    userInputElement.focus(); // Gönderdikten sonra inputa tekrar odaklan

    // Botun cevabını biraz gecikmeli vererek daha doğal bir his oluştur
    setTimeout(() => {
        const botReply = getBotResponse(messageText);
        displayMessage(botReply, 'bot');
    }, 500 + Math.random() * 300); // Rastgele küçük bir gecikme ekle
}

// Sayfa yüklendiğinde verileri yükle ve botu başlat
document.addEventListener('DOMContentLoaded', loadDataAndInitialize);
