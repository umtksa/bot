document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    let botRules = []; // Yüklenen ve işlenen kurallar burada saklanacak

    // Mesajı sohbet kutusuna ekleyen fonksiyon (Değişmedi)
    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        msgDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        msgDiv.textContent = text; // Güvenlik için textContent kullanın
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Sohbeti en alta kaydır
    }

    // Kullanıcının girdisine göre bot cevabını bulan fonksiyon (Değişmedi)
    function getBotResponse(input) {
        const lowerInput = input.toLowerCase(); // Girdiyi küçük harfe çevir

        for (const rule of botRules) {
            // Regex desenini test et (küçük harfe çevrilmiş girdi ile)
            if (rule.pattern.test(lowerInput)) {
                const randomIndex = Math.floor(Math.random() * rule.responses.length);
                return rule.responses[randomIndex];
            }
        }
        // Bu kısma düşmemeli çünkü en sonda (.*) kuralı var, ama yine de:
        return "Bir hata oluştu (getBotResponse).";
    }

    // Mesaj gönderme işlemini başlatan fonksiyon (Değişmedi)
    function sendMessage() {
        const input = userInput.value.trim();
        if (input === "") return;

        addMessage(input, 'user');
        userInput.value = '';

        const botResponse = getBotResponse(input);
        setTimeout(() => {
            addMessage(botResponse, 'bot');
        }, 300);

        userInput.focus();
    }

    // --- Özel söz dizimi pattern stringini standart Regex source stringine çeviren yardımcı fonksiyon ---
    function convertCustomPatternToRegexSource(customPattern) {
        // customPattern: "(grup1) [grup2] (grup3)" gibi bir string
        const parts = customPattern.match(/\(([^)]+)\)|\[([^\]]+)\]|\S+/g); // () veya [] içindekileri veya boşluk olmayan kelimeleri yakala

        if (!parts) {
             console.warn("Warning: Could not parse any parts from custom pattern:", customPattern);
             return null; // Geçersiz desen
        }

        const regexParts = parts.map(part => {
            if (part.startsWith('(') && part.endsWith(')')) {
                const content = part.slice(1, -1); // Parantez içini al
                // Zorunlu grup: (?:...) non-capturing group
                 if (content.trim() === '') {
                     console.warn("Warning: Empty required group () in pattern:", customPattern);
                     // Boş zorunlu grup teknik olarak (?:) olur, ama muhtemelen hata. Yine de geçerli regex.
                 }
                return `(?:${content})`;
            } else if (part.startsWith('[') && part.endsWith(']')) {
                const content = part.slice(1, -1); // Köşeli parantez içini al
                // İsteğe bağlı grup: (?:...)? non-capturing group ve komple optional
                 if (content.trim() === '') {
                     console.warn("Warning: Empty optional group [] in pattern:", customPattern);
                     // Boş isteğe bağlı grup teknik olarak (?:)? olur, geçerli regex.
                 }
                return `(?:${content})?`;
            } else {
                // Beklenmedik format veya literal kelime - Regex özel karakterlerini kaçır
                console.warn("Warning: Unexpected part format in custom pattern, treating as literal:", part, "in", customPattern);
                // . + ? ^ $ { } ( ) | [ ] \ karakterlerini kaçır
                 return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
            }
        }).filter(part => part !== null); // Hata durumunda null dönenleri filtrele

        // Parçaları bir veya daha fazla boşluk (\s+) ile birleştir
        // Optional: Başına ve sonuna kelime sınırı (\b) ekleyebiliriz,
        // ancak şimdilik sadece boşluklarla birleştirelim,
        // input'u küçük harfe çevirip test etmek çoğunlukla yeterli.
        let regexSource = regexParts.join('\\s+');

        // Optional: Cümlenin başı ve sonuyla tam eşleşme istersen ^ ve $ eklersin.
        // Ama örnekler cümle ortasını da içerdiği için eklemeyelim.

        // Optional: Sondaki olası noktalama işaretlerini ve boşlukları yakala
         regexSource += '\\s*[?.!]?';


        return regexSource;
    }

    // --- brain.txt dosyasını yükle ve parse et ---
    fetch('brain.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            const lines = text.split(/\r?\n/); // Satırlara ayır
            let currentCustomPattern = null;
            let currentResponses = [];
            const parsedRules = []; // Geçici olarak parse edilmiş kuralları tutar (custom pattern string olarak)

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === '' || trimmedLine.startsWith('#')) continue;

                if (trimmedLine.startsWith('+')) {
                    // Yeni bir pattern satırı geldi
                    // Eğer daha önce bir pattern topluyorsak ve cevapları varsa, kuralı kaydet
                    if (currentCustomPattern !== null && currentResponses.length > 0) {
                         parsedRules.push({
                             customPattern: currentCustomPattern,
                             responses: currentResponses
                         });
                    }

                    // Yeni pattern'ı başlat
                    currentCustomPattern = trimmedLine.substring(1).trim();
                    currentResponses = []; // Cevapları sıfırla

                } else if (trimmedLine.startsWith('-')) {
                    // Cevap satırı geldi
                    if (currentCustomPattern !== null) {
                        currentResponses.push(trimmedLine.substring(1).trim());
                    } else {
                         console.warn("Uyarı: Bir pattern tanımlanmadan cevap satırı geldi:", trimmedLine);
                    }

                } else {
                    console.warn("Uyarı: Bilinmeyen satır formatı yoksayıldı:", trimmedLine);
                }
            }

            // Döngü bittikten sonra son kuralı kaydet
            if (currentCustomPattern !== null && currentResponses.length > 0) {
                parsedRules.push({
                    customPattern: currentCustomPattern,
                    responses: currentResponses
                });
            }

            // ParsedRules'u botRules'a dönüştür: custom pattern stringlerini RegExp nesnelerine çevir
            botRules = parsedRules.map(rule => {
                try {
                    // Özel söz dizimi stringini standart regex source stringine çevir
                    const regexSource = convertCustomPatternToRegexSource(rule.customPattern);

                    if (!regexSource) {
                        console.error("Error: Failed to convert custom pattern to regex source:", rule.customPattern);
                        return null; // Dönüşüm başarısızsa kuralı atla
                    }

                    // Regex source'u RegExp nesnesine çevir, varsayılan olarak case-insensitive ('i')
                    const regexPattern = new RegExp(regexSource, 'i');

                     if (rule.responses.length === 0) {
                         console.warn("Warning: Parsed rule has empty responses:", rule);
                         return null;
                    }

                    return {
                        pattern: regexPattern, // Bu, RegExp nesnesi
                        responses: rule.responses // Bu, cevaplar dizisi
                    };
                } catch (e) {
                    console.error("Error creating RegExp from source:", regexSource, "Original custom pattern:", rule.customPattern, "Error:", e);
                    return null; // RegExp oluşturma hatası varsa kuralı atla
                }
            }).filter(rule => rule !== null); // Hatalı veya boş cevaplı kuralları filtrele

            console.log("Bot kuralları başarıyla yüklendi ve işlendi:", botRules);

            // Kurallar yüklendikten sonra olay dinleyicilerini ayarla
            sendButton.addEventListener('click', sendMessage);

            userInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    sendMessage();
                }
            });

            // Bot'tan ilk mesaj (opsiyonel)
             setTimeout(() => {
                 addMessage("Merhaba! Size nasıl yardımcı olabilirim?", 'bot');
             }, 500);

        })
        .catch(error => {
            console.error('Bot kuralları yüklenirken bir hata oluştu:', error);
            addMessage(`Üzgünüm, bot kuralları yüklenemedi: ${error.message}`, 'bot');
            // Hata durumunda giriş alanını ve butonu devre dışı bırak
            sendButton.disabled = true;
            userInput.disabled = true;
            userInput.placeholder = "Bot devre dışı";
        });
    // --- Yükleme sonu ---

});