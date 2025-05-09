// --- VERİ DEPOLAMA ---
const capitals = {
    "türkiye": "Ankara",
    "almanya": "Berlin",
    "fransa": "Paris",
    "japonya": "Tokyo",
    "amerika": "Washington D.C.",
    "ingiltere": "Londra",
    "italya": "Roma",
    "ispanya": "Madrid",
    "rusya": "Moskova",
    "çin": "Pekin",
    "azerbaycan": "Bakü"
    // Daha fazla ülke eklenebilir
};

const licensePlates = {
    "adana": "01", "adiyaman": "02", "afyonkarahisar": "03", "ağri": "04", "amasya": "05",
    "ankara": "06", "antalya": "07", "artvin": "08", "aydin": "09", "balikesir": "10",
    "bilecik": "11", "bingöl": "12", "bitlis": "13", "bolu": "14", "burdur": "15",
    "bursa": "16", "çanakkale": "17", "çankiri": "18", "çorum": "19", "denizli": "20",
    "diyarbakir": "21", "edirne": "22", "elaziğ": "23", "erzincan": "24", "erzurum": "25",
    "eskişehir": "26", "gaziantep": "27", "giresun": "28", "gümüşhane": "29", "hakkari": "30",
    "hatay": "31", "isparta": "32", "mersin": "33", "istanbul": "34", "izmir": "35",
    "kars": "36", "kastamonu": "37", "kayseri": "38", "kirklareli": "39", "kirşehir": "40",
    "kocaeli": "41", "konya": "42", "kütahya": "43", "malatya": "44", "manisa": "45",
    "kahramanmaraş": "46", "mardin": "47", "muğla": "48", "muş": "49", "nevşehir": "50",
    "niğde": "51", "ordu": "52", "rize": "53", "sakarya": "54", "samsun": "55",
    "siirt": "56", "sinop": "57", "sivas": "58", "tekirdağ": "59", "tokat": "60",
    "trabzon": "61", "tunceli": "62", "şanliurfa": "63", "uşak": "64", "van": "65",
    "yozgat": "66", "zonguldak": "67", "aksaray": "68", "bayburt": "69", "karaman": "70",
    "kirikkale": "71", "batman": "72", "şirnak": "73", "bartin": "74", "ardahan": "75",
    "iğdir": "76", "yalova": "77", "karabük": "78", "kilis": "79", "osmaniye": "80",
    "düzce": "81"
    // Tüm iller eklendi
};

const defaultResponses = [
    "Üzgünüm, bunu anlayamadım. Lütfen farklı bir şekilde sormayı deneyin.",
    "Bu konuda bir bilgim yok maalesef.",
    "Tam olarak ne demek istediğinizi çıkaramadım."
];

// --- BOT MANTIĞI ---
function getBotResponse(userInput) {
    const lowerInput = userInput.toLowerCase().trim();
    let cityForPlate = "";
    let countryForCapital = "";

    // 1. Basit Matematik İşlemleri
    // Güvenlik nedeniyle eval() yerine daha kontrollü bir yapı kullanalım
    // Örnek: "5 + 3", "10 * 2", "100 / 4", "50 - 10"
    // Daha karmaşık ifadeler için (örn: "5 artı 3") regex genişletilebilir
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
    // Örnek: "ankara plakası", "istanbul plaka kodu", "34 hangi şehir" (bu yönü eklemedik, sadece şehirden plakaya)
    const plateMatch = lowerInput.match(/(.+?)\s*(?:ilinin|'nin|nin)?\s*(plakas(ı|i)|plaka kodu)\s*(nedir|kaçtır)?\??$/i);
    if (plateMatch) {
        cityForPlate = normalizeText(plateMatch[1].trim());
        if (licensePlates[cityForPlate]) {
            return `${capitalizeFirstLetter(cityForPlate)} ilinin plaka kodu: ${licensePlates[cityForPlate]}`;
        }
    }
    // Sadece şehir adı ve "plakası"
    const simplePlateMatch = lowerInput.match(/^(.+?)\s+plakas(ı|i)\??$/i);
    if (simplePlateMatch && !cityForPlate) { // Eğer önceki daha spesifik regex eşleşmediyse
         cityForPlate = normalizeText(simplePlateMatch[1].trim());
         if (licensePlates[cityForPlate]) {
            return `${capitalizeFirstLetter(cityForPlate)} ilinin plaka kodu: ${licensePlates[cityForPlate]}`;
        }
    }


    // 3. Başkent Sorgulama
    // Örnek: "türkiye başkenti", "fransa'nın başkenti nedir"
    const capitalMatch = lowerInput.match(/(.+?)\s*(?:ülkesinin|'nin|nin)?\s*başkenti\s*(nedir|neresidir|hangisidir)?\??$/i);
    if (capitalMatch) {
        countryForCapital = normalizeText(capitalMatch[1].trim());
         if (capitals[countryForCapital]) {
            return `${capitalizeFirstLetter(countryForCapital)}'nin başkenti ${capitals[countryForCapital]}.`;
        }
    }
     // Sadece ülke adı ve "başkenti"
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


    // Anlaşılmadıysa rastgele bir varsayılan cevap ver
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
const chatMessagesContainer = document.getElementById('chatMessages');
const userInputElement = document.getElementById('userInput');

userInputElement.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.textContent = text; // textContent XSS'e karşı daha güvenlidir
    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // En alta kaydır
}

function sendMessage() {
    const messageText = userInputElement.value.trim();
    if (messageText === '') return;

    displayMessage(messageText, 'user');
    userInputElement.value = ''; // Giriş alanını temizle
    userInputElement.focus();

    // Botun cevap vermesi için kısa bir gecikme ekleyelim (daha doğal görünmesi için)
    setTimeout(() => {
        const botReply = getBotResponse(messageText);
        displayMessage(botReply, 'bot');
    }, 500); // 0.5 saniye gecikme
}
