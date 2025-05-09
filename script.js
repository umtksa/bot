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
// HTML'deki onclick="sendMessage()" için butonu seçmeye gerek yok, ama isterseniz event listener'ı JS ile de kurabilirsiniz.
const sendButton = document.querySelector('.chat-input button');


// --- VERİ YÜKLEME VE BAŞLATMA ---
async function loadDataAndInitialize() {
    // Başlangıçta input ve butonu devre dışı bırak
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
        capitals = data.capitals;
        licensePlates = data.licensePlates;
        console.log("Veriler başarıyla yüklendi.");

        // Veri yüklendikten sonra etkileşimleri etkinleştir
        if (userInputElement) {
            userInputElement.disabled = false;
            userInputElement.placeholder = "Mesajınızı yazın...";
            userInputElement.focus(); // Sayfa yüklenince direkt inputa odaklansın
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
        // Input ve buton zaten disabled kalacak.
    }
}

// --- BOT MANTIĞI ---
function getBotResponse(userInput) {
    // Verilerin yüklenip yüklenmediğini kontrol et (ekstra güvenlik)
    if (Object.keys(capitals).length === 0 || Object.keys(licensePlates).length === 0) {
        return "Veriler henüz tam olarak yüklenmedi. Lütfen biraz bekleyin.";
    }

    const lowerInput = userInput.toLowerCase().trim();
    let cityForPlate = "";
    let countryForCapital = "";

    // 1. Basit Matematik İşlemleri
    const mathMatch = lowerInput.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)$/);
    if (mathMatch) {
        const num1 = parseFloat(mathMatch[1]);
        const operator = mathMatch[2];
        const num2 = parseFloat(mathMatch[3]);
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
    const plateMatch = lowerInput.match(/(.+?)\s*(?:ilinin|'nin|nin)?\s*(plakas(ı|i)|plaka kodu)\s*(nedir|kaçtır)?\??$/i);
    if (plateMatch) {
        cityForPlate = normalizeText(plateMatch[1].trim());
        if (licensePlates[cityForPlate]) {
            return `${capitalizeFirstLetter(cityForPlate)} ilinin plaka kodu: ${licensePlates[cityForPlate]}`;
        }
    }
    const simplePlateMatch = lowerInput.match(/^(.+?)\s+plakas(ı|i)\??$/i);
    if (simplePlateMatch && !cityForPlate) {
         cityForPlate = normalizeText(simplePlateMatch[1].trim());
         if (licensePlates[cityForPlate]) {
            return `${capitalizeFirstLetter(cityForPlate)} ilinin plaka kodu: ${licensePlates[cityForPlate]}`;
        }
    }

    // 3. Başkent Sorgulama
    const capitalMatch = lowerInput.match(/(.+?)\s*(?:ülkesinin|'nin|nin)?\s*başkenti\s*(nedir|neresidir|hangisidir)?\??$/i);
    if (capitalMatch) {
        countryForCapital = normalizeText(capitalMatch[1].trim());
         if (capitals[countryForCapital]) {
            return `${capitalizeFirstLetter(countryForCapital)}'nin başkenti ${capitals[countryForCapital]}.`;
        }
    }
    const simpleCapitalMatch = lowerInput.match(/^(.+?)\s+başkenti\??$/i);
     if (simpleCapitalMatch && !countryForCapital) {
         countryForCapital = normalizeText(simpleCapitalMatch[1].trim());
         if (capitals[countryForCapital]) {
            return `${capitalizeFirstLetter(countryForCapital)}'nin başkenti ${capitals[countryForCapital]}.`;
        }
    }

    // Selamlama ve basit cevaplar
    if (["merhaba", "selam", "hey", "günaydın", "iyi günler"].some(word => lowerInput.includes(word))) {
        return "Merhaba! Size nasıl yardımcı olabilirim?";
    }
    if (["nasılsın", "naber"].some(word => lowerInput.includes(word))) {
        return "İyiyim, sorduğunuz için teşekkürler! Size nasıl yardımcı olabilirim?";
    }
    if (["teşekkür ederim", "teşekkürler", "sağ ol", "sağol"].some(word => lowerInput.includes(word))) {
        return "Rica ederim! Başka bir sorunuz var mı?";
    }

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Türkçe karakterleri normalleştirme ve küçük harfe çevirme
function normalizeText(text) {
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
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- ARAYÜZ ETKİLEŞİMİ ---
if (userInputElement) {
    userInputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !userInputElement.disabled) { // Buton/input devre dışı değilse çalışsın
            sendMessage();
        }
    });
}

function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.textContent = text;
    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// sendMessage fonksiyonu global scope'da olmalı çünkü HTML'deki onclick bunu çağırıyor.
function sendMessage() {
    // Input'un devre dışı olup olmadığını kontrol et
    if (userInputElement && userInputElement.disabled) {
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
    }, 500);
}

// Sayfa yüklendiğinde verileri yükle ve botu başlat
document.addEventListener('DOMContentLoaded', loadDataAndInitialize);
