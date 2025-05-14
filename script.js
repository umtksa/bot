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

    // Kullanıcının girdisine göre bot cevabını bulan fonksiyon (Değişmedi, botRules'ı kullanıyor)
    function getBotResponse(input) {
        const lowerInput = input.toLowerCase(); // Girdiyi küçük harfe çevir

        for (const rule of botRules) {
            // Regex desenini test et (küçük harfe çevrilmiş girdi ile)
            if (rule.pattern.test(lowerInput)) {
                const randomIndex = Math.floor(Math.random() * rule.responses.length);
                return rule.responses[randomIndex];
            }
        }
        // Bu kısma düşmemeli çünkü en sonda .* kuralı var, ama yine de:
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

    // --- brain.txt dosyasını yükle ve parse et ---
    fetch('brain.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Cevabı metin olarak al
            return response.text();
        })
        .then(text => {
            // Metin dosyasını parse etme
            const lines = text.split(/\r?\n/); // Satırlara ayır (\r\n ve \n için)
            let currentPattern = null;
            let currentResponses = [];
            const parsedRules = []; // Geçici olarak parse edilmiş kuralları tutar (pattern string olarak)

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                    // Boş satırları veya yorumları yoksay
                    continue;
                }

                if (trimmedLine.startsWith('+')) {
                    // Yeni bir pattern satırı geldi
                    // Eğer daha önce bir pattern topluyorsak ve cevapları varsa, kuralı kaydet
                    if (currentPattern !== null && currentResponses.length > 0) {
                        parsedRules.push({
                            patternString: currentPattern,
                            responses: currentResponses
                        });
                    }

                    // Yeni pattern'ı başlat
                    currentPattern = trimmedLine.substring(1).trim();
                    currentResponses = []; // Cevapları sıfırla

                } else if (trimmedLine.startsWith('-')) {
                    // Cevap satırı geldi
                    // Eğer geçerli bir pattern varsa, cevabı currentResponses'a ekle
                    if (currentPattern !== null) {
                        currentResponses.push(trimmedLine.substring(1).trim());
                    } else {
                        console.warn("Uyarı: Bir pattern tanımlanmadan cevap satırı geldi:", trimmedLine);
                    }

                } else {
                    // Tanımlanmamış satır türü
                    console.warn("Uyarı: Bilinmeyen satır formatı yoksayıldı:", trimmedLine);
                }
            }

            // Döngü bittikten sonra son kuralı kaydet (eğer varsa ve cevapları varsa)
            if (currentPattern !== null && currentResponses.length > 0) {
                parsedRules.push({
                    patternString: currentPattern,
                    responses: currentResponses
                });
            }

            // ParsedRules'u botRules'a dönüştür: pattern stringlerini RegExp nesnelerine çevir
            botRules = parsedRules.map(rule => {
                try {
                    // Deseni RegExp nesnesine çevir, varsayılan olarak case-insensitive ('i')
                    const regexPattern = new RegExp(rule.patternString, 'i');

                     // responses zaten dizi ama boş olabilir mi kontrol edelim
                    if (rule.responses.length === 0) {
                         console.warn("Uyarı: Parsed kuralda boş cevap dizisi:", rule);
                         return null; // Bu kuralı atla
                    }

                    return {
                        pattern: regexPattern,
                        responses: rule.responses
                    };
                } catch (e) {
                    console.error("Hatalı regex deseni:", rule.patternString, "Hata:", e);
                    return null; // Hatalı kuralı atla
                }
            }).filter(rule => rule !== null); // Hatalı veya boş cevaplı kuralları filtrele

            // console.log("Bot kuralları başarıyla yüklendi ve işlendi:", botRules);

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
            // Dosya yükleme veya işleme sırasında bir hata oluşursa
            console.error('Bot kuralları yüklenirken bir hata oluştu:', error);
            addMessage(`Üzgünüm, bot kuralları yüklenemedi: ${error.message}`, 'bot');
            // Hata durumunda giriş alanını ve butonu devre dışı bırak
            sendButton.disabled = true;
            userInput.disabled = true;
            userInput.placeholder = "Bot devre dışı";
        });
    // --- Yükleme sonu ---

});