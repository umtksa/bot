// --- HTML Elementlerini Al ---
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// --- Bot Data Yapısı ---
// Ayrıştırılan tetikleyicileri ve yanıtları saklarız
let botBrain = [];
let isBrainLoaded = false;

// --- Türkçe Karakter Haritası (Opsiyonel, ama eşleştirmeyi kolaylaştırabilir) ---
// Şimdilik doğrudan karakterleri işleyeceğiz, bu haritayı eşleştirme mantığında kullanabiliriz.
const turkishCharMap = {
    'ı': 'i', 'ş': 's', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'ğ': 'g',
    'İ': 'I', 'Ş': 'S', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C', 'Ğ': 'G'
};

// --- Harici Fonksiyonlar (Call Tags İçin) ---
const externalCalls = {
    currentTime: () => {
        const now = new Date();
        // Saat dilimine dikkat ederek saati alabilirsiniz, basitçe lokal saat
        return now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    },
    triggerOcr: () => {
        // OCR tetiklendiğinde yapılacak işlem (örneğin bir event fırlatmak veya bir fonksiyon çağırmak)
        console.log("OCR tetiklendi!");
        // Buraya OCR işlemini başlatan kodu ekleyebilirsiniz
        return "OCR işlemi tetiklendi. Sonuç geldiğinde size bilgi vereceğim.";
    }
    // Buraya başka call tag fonksiyonları ekleyebilirsiniz
    // ornekCall: (arg1, arg2) => { ... return sonuç; }
};

// --- Mesajları Ekrana Yazdıran Fonksiyon ---
function displayMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    // Güvenlik için textContent kullanıyoruz, eğer HTML çıktısı üretecekseniz innerHTML kullanın.
    // RiveScript yanıtları genellikle HTML içermez, bu yüzden textContent daha güvenlidir.
    messageElement.textContent = message;

    chatMessages.appendChild(messageElement);
    // En alta kaydır
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- RiveScript Deseni -> Regex Dönüştürücü (Basit Versiyon) ---
// '*' -> '(.*?)' : Sıfır veya daha fazla karakter (non-greedy)
// '[...|...]' -> '(?:...|...)?' : Opsiyonel grup (non-capturing)
// '(...|...)' -> '(?:...|...)' : Alternatif grup (non-capturing)
// Dikkat: Bu dönüştürücü basit kalıplar için çalışır, RiveScript'in tüm karmaşık desenlerini kapsamaz.
function patternToRegex(pattern) {
    let regexString = pattern
        // Regex özel karakterlerini kaçış karakteri ekleyerek güvenli hale getir
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        // Sonra RiveScript özel karakterlerini geri dönüştür
        .replace(/\\\*/g, '(.*?)') // '*' -> '(.*?)'
        .replace(/\\[(.*)\\]/g, '(?:$1)?') // '[...]' -> '(?:...)?' (alternatifleri içerebilir)
        .replace(/\\\( (.*) \\\)/g, '(?:$1)'); // '( ... )' -> '(?: ... )' (alternatif grup)

    // Boşlukları bir veya daha fazla boşlukla eşleştirme (isteğe bağlı, RiveScript esnektir)
    // regexString = regexString.replace(/\s+/g, '\\s+'); // Birden fazla boşluğu tek boşluğa eşle

    // Satır başı ve sonu işaretlerini ekle (başı/sonu * değilse)
    if (!regexString.startsWith('(.*?)')) {
        regexString = '^' + regexString;
    }
    if (!regexString.endsWith('(.*?)')) {
        regexString = regexString + '$';
    }

     // Küçük/büyük harf duyarsız ve Türkçe karakterleri dikkate alan regex bayrağı (isteğe bağlı)
     // 'u' bayrağı, Unicode karakterlerle çalışmayı sağlar.
    return new RegExp(regexString, 'iu'); // 'i' case-insensitive, 'u' unicode

    /*
    // Alternatif regex oluşturma (daha kontrollü ama daha karmaşık olabilir)
    let parts = pattern.trim().split(/\s+/); // Boşluğa göre kelimeleri ayır (basit)
    let regexParts = parts.map(part => {
        if (part === '*') return '(.*?)';
        if (part.startsWith('[') && part.endsWith(']')) {
            // Opsiyonel grup: [word1|word2|...] -> (?:word1|word2...)?
             let options = part.slice(1, -1).split('|').map(opt => opt.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
            return '(?:' + options.join('|') + ')?';
        }
         if (part.startsWith('(') && part.endsWith(')')) {
            // Alternatif grup: (word1|word2|...) -> (?:word1|word2...)
             let options = part.slice(1, -1).split('|').map(opt => opt.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
            return '(?:' + options.join('|') + ')';
        }
         // Normal kelime, regex özel karakterlerini kaçış karakteri ekle
        return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
     });

     // Boşlukları regex'te bir veya daha fazla boşluğa eşle
     regexString = '^' + regexParts.join('\\s+') + '$';

    return new RegExp(regexString, 'iu'); // 'i' case-insensitive, 'u' unicode
    */
}


// --- Brain.rive Dosyasını Yükle ve Ayrıştır ---
async function loadBrain() {
    try {
        const response = await fetch("brain.rive");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();

        const lines = text.split('\n');
        let currentTrigger = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Yorum satırlarını veya boş satırları atla
            if (trimmedLine === '' || trimmedLine.startsWith('//')) {
                continue;
            }

            const command = trimmedLine[0];
            const restOfLine = trimmedLine.substring(1).trim();

            if (command === '+') {
                // Yeni tetikleyici
                try {
                    const regex = patternToRegex(restOfLine);
                     currentTrigger = {
                        originalTrigger: restOfLine,
                        regex: regex,
                        replies: []
                    };
                    botBrain.push(currentTrigger);
                } catch (e) {
                    console.error("Error converting pattern to regex:", restOfLine, e);
                     // Hatalı paterni atla ama konsola yazdır
                     currentTrigger = null; // Bir sonraki '-' bu hataya bağlanmasın
                }

            } else if (command === '-') {
                // Yanıt
                if (currentTrigger) {
                    currentTrigger.replies.push(restOfLine);
                } else {
                    console.warn("Warning: Found reply '-' without a preceding trigger '+'. Line:", trimmedLine);
                }
            }
            // ! gibi diğer komutları isterseniz buraya ekleyebilirsiniz
            // else if (command === '!') { ... }
        }

        isBrainLoaded = true;
        console.log("Custom RiveScript brain loaded!", botBrain);
        displayMessage("Merhaba! Ben özel yapım botunuz. Nasıl yardımcı olabilirim?", "bot");

    } catch (error) {
        console.error("Error loading or parsing brain.rive:", error);
        displayMessage("Üzgünüm, sohbet botu yüklenirken bir hata oluştu.", "bot");
        // Hata durumunda giriş alanını devre dışı bırak
        userInput.disabled = true;
        sendButton.disabled = true;
    }
}

// --- Kullanıcı Girdisine Yanıt Üret ---
async function getReply(userInput) {
    if (!isBrainLoaded) {
        return "Bot henüz yüklenmedi, lütfen bekleyin.";
    }

    const cleanedInput = userInput.trim(); // Kullanıcı girdisini temizle

    // Tetikleyiciler arasında eşleşme ara
    // Basitlik için, brain.rive dosyasındaki sıraya göre ilk eşleşeni alıyoruz.
    // RiveScript'in gerçek önceliklendirme mantığı daha karmaşıktır.
    for (const trigger of botBrain) {
        if (trigger.regex && trigger.regex.test(cleanedInput)) {
            // Eşleşme bulundu, rastgele bir yanıt seç
            const randomIndex = Math.floor(Math.random() * trigger.replies.length);
            let reply = trigger.replies[randomIndex];

            // Call Tag'lerini işle
            const callTagRegex = /<call>(.*?)<\/call>/g;
            let match;
            let processedReply = reply;

            while ((match = callTagRegex.exec(reply)) !== null) {
                const callFunctionName = match[1];
                if (externalCalls[callFunctionName]) {
                    try {
                        // Fonksiyonu çalıştır ve sonucu yerine koy
                        const callResult = await externalCalls[callFunctionName](); // Parametre gönderme şimdilik desteklenmiyor
                        processedReply = processedReply.replace(match[0], callResult);
                    } catch (e) {
                        console.error("Error executing external call:", callFunctionName, e);
                        processedReply = processedReply.replace(match[0], `[Hata: ${callFunctionName}]`);
                    }
                } else {
                    console.warn("Warning: Unknown external call tag:", callFunctionName);
                    processedReply = processedReply.replace(match[0], `[Bilinmeyen komut: ${callFunctionName}]`);
                }
            }

            return processedReply;
        }
    }

    // Eşleşme bulunamadıysa, varsayılan yanıtı ara (Genellikle '+ *' desenidir)
    const defaultTrigger = botBrain.find(trigger => trigger.originalTrigger === '*');
    if (defaultTrigger && defaultTrigger.replies.length > 0) {
        const randomIndex = Math.floor(Math.random() * defaultTrigger.replies.length);
        return defaultTrigger.replies[randomIndex];
    }

    // Varsayılan yanıt da yoksa
    return "Üzgünüm, ne dediğinizi anlayamadım.";
}

// --- Kullanıcı Mesajını Gönderen Fonksiyon ---
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === "") {
        return; // Boş mesaj gönderme
    }

    // 1. Kullanıcı mesajını hemen göster
    displayMessage(messageText, "user");

    // Giriş alanını temizle ve devre dışı bırak
    userInput.value = "";
    userInput.disabled = true;
    sendButton.disabled = true; // Butonu da devre dışı bırak

    // 2. Bot yanıtı için rastgele gecikmeyi hesapla
    const delay = 300 + Math.random() * 500; // 300ms ile 800ms arasında rastgele gecikme

    // 3. Gecikmeden sonra bot yanıtını al ve göster
    setTimeout(async () => {
        try {
            // Özel getReply fonksiyonunu çağır
            const reply = await getReply(messageText);

            // Bot yanıtını göster
            displayMessage(reply, "bot");
        } catch (error) {
            console.error("Error getting bot reply:", error);
            // Hata durumunda hata mesajını hemen göster
            displayMessage("Üzgünüm, bir hata oluştu. Tekrar deneyin.", "bot");
        } finally {
            // Bot yanıtı geldikten veya hata oluştuğunda giriş alanını tekrar etkinleştir
            userInput.disabled = false;
            sendButton.disabled = false; // Butonu da etkinleştir
            userInput.focus(); // Giriş alanına odaklan
        }
    }, delay);
}

// --- Olay Dinleyicileri ---
sendButton.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// --- Botu Başlat ---
// Sayfa yüklendiğinde brain.rive dosyasını yükle
loadBrain();