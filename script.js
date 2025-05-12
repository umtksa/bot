class ChatBot {
    constructor(config = {}) {
        // Varsayılan konfigürasyon ve kullanıcı tarafından sağlananları birleştirme
        this.config = {
            dataUrl: 'data.json',
            selectors: {
                chatMessagesContainer: '#chatMessages',
                userInputElement: '#userInput',
                sendButton: '.chat-input button'
            },
            wordsToIgnore: [
                "kimdir", "nedir", "kaçtır", "ne", "kaç", "neresi", "neresidir", "canım", "benim", "lütfen",
                "acaba", "bir", "bi", "mi", "mı", "mu", "mü", "misin", "mısın", "musun", "müsün",
                "mıdır", "midir", "mudur", "müdür", "acaba", "ki"
            ],
            defaultResponses: [
                "Üzgünüm, anlayamadım.",
                "Bu konuda bir bilgim yok.",
                "Hiç bir fikrim yok!",
                "Tam olarak ne dediğini anlamadım."
            ],
            regex: {
                // İyelik eklerini ve ilişkili kelimeleri içeren regex desenleri
                plateSuffixPattern: "(?:ilinin|şehrinin|'?nın|'?nin|'?nun|'?nün|'?ın|'?in|'?un|'?ün|ili)",
                capitalSuffixPattern: "(?:ülkesinin|'?nın|'?nin|'?nun|'?nün|'?ın|'?in|'?un|'?ün)",
                // Regex'leri burada tanımlayalım - temizlenmiş giriş üzerinde çalışacaklar
                plateRegex: null, // constructor'da oluşturulacak
                capitalRegex: null, // constructor'da oluşturulacak
                simplePlateRegex: /^(.+?)\s+plaka\s*?$/i,
                simpleCapitalRegex: /^(.+?)\s+başkent\s*?$/i,
                mathRegex: /^(\d+(\.\d+)?)\s*([\+\-\*\/])\s*(\d+(\.\d+)?)$/,
                // Hava durumu sorgusu için regex
                weatherRegex: /(.+?)\s+(?:için\s+)?(?:hava durumu|hava nasıl)\s*?$/i
            },
            greetingKeywords: ["merhaba", "selam", "selamlar", "hey", "günaydın", "iyi günler", "iyi akşamlar", "iyi geceler"],
            howAreYouKeywords: ["nasılsın", "naber", "nasıl gidiyor"],
            thanksKeywords: ["teşekkür ederim", "teşekkürler", "tenks", "thanks", "sağ ol", "sağol", "çok teşekkürler"],
            nameKeywords: ["adın ne", "kimsin", "ismin"],
            insultKeywords: ["mal", "gerizekalı", "salak", "aptal"],
            farewellKeywords: ["görüşürüz", "hoşçakal", "bay bay", "siyu", "see you", "bye"],
            ...config // Kullanıcı konfigürasyonunu varsayılanların üzerine yaz
        };

        // Regex'leri dinamik olarak oluştur
        this.config.regex.plateRegex = new RegExp(`^(.+?)\\s*(?:${this.config.regex.plateSuffixPattern})?\\s*(plakas(?:ı|i)|plaka kodu)\\s*?$`, 'i');
        this.config.regex.capitalRegex = new RegExp(`^(.+?)\\s*(?:${this.config.regex.capitalSuffixPattern})?\\s*başkenti\\s*?$`, 'i');


        // Veri depoları
        this.capitals = {};
        this.licensePlates = {};

        // Arayüz elemanları
        this.ui = {
            chatMessagesContainer: document.querySelector(this.config.selectors.chatMessagesContainer),
            userInputElement: document.querySelector(this.config.selectors.userInputElement),
            sendButton: document.querySelector(this.config.selectors.sendButton)
        };

         // Verilerin yüklenip yüklenmediğini takip etmek için bir bayrak
        this.dataLoaded = false;

        // Metotları bağlama (event listener'lar için 'this' bağlamını korumak)
        this.sendMessage = this.sendMessage.bind(this);
        this._handleKeyPress = this._handleKeyPress.bind(this);
    }

    // --- Yardımcı Metotlar ---
    _getLookupKey(text) {
        if (typeof text !== 'string') return '';
        let key = text.toLocaleLowerCase('tr-TR');
        key = key.replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
                   .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
        // key = key.replace(/\s+/g, ''); // Boşlukları kaldırmak isterseniz
        return key;
    }

    _cleanInput(input) {
        if (typeof input !== 'string') return '';
        let cleaned = input.toLocaleLowerCase('tr-TR');
        cleaned = cleaned.replace(/[.,!?;:]/g, ' ');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        if (cleaned === "") return "";

        const words = cleaned.split(' ');
        const filteredWords = words.filter(word => !this.config.wordsToIgnore.includes(word));
        return filteredWords.join(' ');
    }

    _capitalizeFirstLetter(string) {
        if (!string) return string;
        return string.toLocaleLowerCase('tr-TR').split(' ').map(word => {
            if (word.length === 0) return '';
            const firstChar = word.charAt(0);
            const rest = word.slice(1);
            if (firstChar === 'i') return 'İ' + rest.toLocaleLowerCase('tr-TR');
            if (firstChar === 'ı') return 'I' + rest.toLocaleLowerCase('tr-TR');
            return firstChar.toLocaleUpperCase('tr-TR') + rest.toLocaleLowerCase('tr-TR');
        }).join(' ');
    }

    _getRandomDefaultResponse() {
        const index = Math.floor(Math.random() * this.config.defaultResponses.length);
        return this.config.defaultResponses[index];
    }

    // --- Veri Yükleme ---
    async _loadData() {
        this.dataLoaded = false; // Yükleme başlarken bayrağı sıfırla
        try {
            const response = await fetch(this.config.dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Başkent verilerini işle
            const rawCapitals = data.capitals;
            this.capitals = {};
            for (const key in rawCapitals) {
                if (Object.prototype.hasOwnProperty.call(rawCapitals, key)) {
                    this.capitals[this._getLookupKey(key)] = rawCapitals[key];
                }
            }

            // Plaka verilerini işle
            const rawLicensePlates = data.licensePlates;
            this.licensePlates = {};
            for (const key in rawLicensePlates) {
                if (Object.prototype.hasOwnProperty.call(rawLicensePlates, key)) {
                    this.licensePlates[this._getLookupKey(key)] = rawLicensePlates[key];
                }
            }

            console.log("Veriler başarıyla yüklendi.");
            this.dataLoaded = true; // Yükleme başarılıysa bayrağı set et
            return true;
        } catch (error) {
            console.error("Veri yüklenirken hata oluştu:", error);
            this.displayMessage("Veri kaynakları yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.", "bot");
            this.dataLoaded = false; // Hata durumunda bayrak false kalır
            return false;
        }
    }

    // --- Arayüz Yönetimi ---
    _setUIState(isLoading, loadError = false) {
        if (!this.ui.userInputElement || !this.ui.sendButton) return;

        if (isLoading) {
            this.ui.userInputElement.disabled = true;
            this.ui.userInputElement.placeholder = "Veriler yükleniyor...";
            this.ui.sendButton.disabled = true;
        } else {
            if (loadError || !this.dataLoaded) {
                // Hata durumunda veya veri yüklenemediğinde UI'ı kilitli tut
                this.ui.userInputElement.disabled = true;
                this.ui.userInputElement.placeholder = "Bot kullanılamıyor.";
                this.ui.sendButton.disabled = true;
            } else {
                 // Yükleme başarılıysa UI'ı aktif et
                this.ui.userInputElement.disabled = false;
                this.ui.userInputElement.placeholder = "Mesajınızı yazın...";
                this.ui.userInputElement.focus();
                this.ui.sendButton.disabled = false;
            }
        }
    }

    displayMessage(text, sender) {
        if (!this.ui.chatMessagesContainer) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        // Potansiyel HTML içeriğini güvenli hale getirmek için textContent kullanıyoruz
        messageDiv.textContent = text;
        this.ui.chatMessagesContainer.appendChild(messageDiv);
        // Yeni mesaj eklendikten sonra en alta kaydır
        this.ui.chatMessagesContainer.scrollTop = this.ui.chatMessagesContainer.scrollHeight;
    }

    // --- Mesaj İşleme ve Bot Mantığı ---

    // İşleyici (Handler) Metotları
    _handleMath(lowerInput) {
        const mathMatch = lowerInput.match(this.config.regex.mathRegex);
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
                default: return null; // Geçersiz operatör, devam et
            }
            const formattedResult = Number.isInteger(result) ? result : result.toFixed(2);
            return `${num1} ${operator} ${num2} = ${formattedResult}`;
        }
        return null; // Eşleşme yok
    }

    _handlePlateLookup(cleanedInput) {
        if (!this.dataLoaded) return null; // Veri yoksa kontrol etme
        let cityForPlateRaw = null;
        let lookupKey = null;

        const plateMatch = cleanedInput.match(this.config.regex.plateRegex);
        if (plateMatch) {
            cityForPlateRaw = plateMatch[1].trim();
            lookupKey = this._getLookupKey(cityForPlateRaw);
            if (this.licensePlates[lookupKey]) {
                return `${this._capitalizeFirstLetter(cityForPlateRaw)} ilinin plakası ${this.licensePlates[lookupKey]}`;
            }
        }

        const simplePlateMatch = cleanedInput.match(this.config.regex.simplePlateRegex);
        if (simplePlateMatch && !cityForPlateRaw) { // Önceki eşleşmediyse
            cityForPlateRaw = simplePlateMatch[1].trim();
            lookupKey = this._getLookupKey(cityForPlateRaw);
            if (this.licensePlates[lookupKey]) {
                return `${this._capitalizeFirstLetter(cityForPlateRaw)} ilinin plakası ${this.licensePlates[lookupKey]}`;
            }
        }
        return null; // Eşleşme yok
    }

    _handleCapitalLookup(cleanedInput) {
         if (!this.dataLoaded) return null; // Veri yoksa kontrol etme
        let countryForCapitalRaw = null;
        let lookupKey = null;

        const capitalMatch = cleanedInput.match(this.config.regex.capitalRegex);
        if (capitalMatch) {
            countryForCapitalRaw = capitalMatch[1].trim();
            lookupKey = this._getLookupKey(countryForCapitalRaw);
            if (this.capitals[lookupKey]) {
                return `${this._capitalizeFirstLetter(countryForCapitalRaw)} başkenti ${this.capitals[lookupKey]}.`;
            }
        }

        const simpleCapitalMatch = cleanedInput.match(this.config.regex.simpleCapitalRegex);
        if (simpleCapitalMatch && !countryForCapitalRaw) { // Önceki eşleşmediyse
            countryForCapitalRaw = simpleCapitalMatch[1].trim();
            lookupKey = this._getLookupKey(countryForCapitalRaw);
            if (this.capitals[lookupKey]) {
                return `${this._capitalizeFirstLetter(countryForCapitalRaw)} başkenti ${this.capitals[lookupKey]}.`;
            }
        }
        return null; // Eşleşme yok
    }

    _handleDateTime(cleanedInput) {
        if (cleanedInput === "saat" || cleanedInput === "zaman") {
            const now = new Date();
            return `Saat şu an: ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (cleanedInput === "bugün" || cleanedInput === "bugünün tarihi" || cleanedInput === "tarih") {
            const now = new Date();
            return `Bugünün tarihi: ${now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }
        return null; // Eşleşme yok
    }

    _handleWeather(cleanedInput) {
        const weatherMatch = cleanedInput.match(this.config.regex.weatherRegex);
        if (weatherMatch) {
            const location = weatherMatch[1].trim();
            // Asenkron işlemi tetikle (arka planda çalışacak)
            setTimeout(() => this._fetchAndDisplayWeather(location), 0);
            // Kullanıcıya hemen bilgi ver
            return `${this._capitalizeFirstLetter(location)} için hava durumu bilgisi alınıyor...`;
        }
        return null; // Eşleşme yok
    }

    async _fetchAndDisplayWeather(location) {
        const apiUrl = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
        let weatherString = `${this._capitalizeFirstLetter(location)} için hava durumu bilgisi alınamadı.`; // Varsayılan hata

        try {
            console.log(`Workspaceing weather data from: ${apiUrl}`);
            const response = await fetch(apiUrl);

            // Hata durumunu daha detaylı ele alalım
            if (!response.ok) {
                 console.error(`wttr.in API error! Status: ${response.status}`);
                 try {
                     // API'nin JSON formatında hata mesajı verip vermediğini kontrol et
                     const errorData = await response.json();
                     // Örnek hata yapısı: data.weather[0].error_description (varsayımsal)
                     // Gerçek yapı farklı olabilir, API dokümantasyonuna veya yanıta bakmak gerekir.
                     // Basitlik adına, sadece 404 durumunu ele alalım:
                     if (response.status === 404) {
                         weatherString = `${this._capitalizeFirstLetter(location)} konumu bulunamadı.`;
                     } else {
                         // Diğer HTTP hataları için genel mesaj
                         weatherString = `Hava durumu alınırken bir sorun oluştu (Hata Kodu: ${response.status}).`;
                     }
                 } catch (jsonError) {
                     // Hata yanıtı JSON değilse veya parse edilemezse
                     weatherString = `Hava durumu servisi (${location} için) yanıt vermiyor veya konum bulunamadı.`;
                     console.error("Could not parse wttr.in error response:", jsonError);
                 }
            } else {
                const data = await response.json();
                console.log('Weather data received:', data);

                if (data.current_condition && data.current_condition.length > 0) {
                    const current = data.current_condition[0];
                    // Türkçe açıklama varsa onu, yoksa İngilizce açıklamayı al
                    const description = current.lang_tr && current.lang_tr.length > 0 ? current.lang_tr[0].value : (current.weatherDesc && current.weatherDesc.length > 0 ? current.weatherDesc[0].value : 'Açıklama yok');
                    const tempC = current.temp_C;
                    const feelsLikeC = current.FeelsLikeC;
                    const humidity = current.humidity;
                    const windSpeed = current.windspeedKmph;

                    weatherString = `${this._capitalizeFirstLetter(location)}: ${description}, Sıcaklık: ${tempC}°C (Hissedilen: ${feelsLikeC}°C), Nem: %${humidity}, Rüzgar: ${windSpeed} km/s.`;
                } else {
                     // current_condition yoksa ama hata da değilse? Belki API formatı değişti.
                     weatherString = `${this._capitalizeFirstLetter(location)} için güncel hava durumu verisi bulunamadı.`;
                }
            }
        } catch (error) {
            console.error("Hava durumu alınırken ağ hatası veya başka bir hata oluştu:", error);
            weatherString = "Hava durumu servisine bağlanırken bir sorun oluştu.";
        }

        // Sonucu ayrı bir mesaj olarak göster
        this.displayMessage(weatherString, 'bot');
    }


    _handleGreeting(lowerInput) {
        if (this.config.greetingKeywords.some(word => lowerInput.includes(word) || lowerInput === word)) {
            return "Merhaba! Nasıl yardımcı olabilirim?";
        }
        return null;
    }

    _handleHowAreYou(lowerInput) {
         if (this.config.howAreYouKeywords.some(word => lowerInput.includes(word))) {
            return "İyiyim, sorduğunuz için teşekkürler!";
        }
        return null;
    }

    _handleThanks(lowerInput) {
        if (this.config.thanksKeywords.some(word => lowerInput.includes(word))) {
            return "Rica ederim!";
        }
        return null;
    }

     _handleNameQuery(lowerInput) {
        if (this.config.nameKeywords.some(word => lowerInput.includes(word))) {
            return "Adım Ahraz."; // Botunuzun adı
        }
        return null;
    }

    _handleInsult(lowerInput) {
        if (this.config.insultKeywords.some(word => lowerInput.includes(word))) {
             return "Lütfen daha nazik bir dil kullanalım."; // Daha yapıcı bir cevap
        }
        return null;
    }

    _handleFarewell(lowerInput) {
        if (this.config.farewellKeywords.some(word => lowerInput.includes(word))) {
            return "Görüşmek üzere!";
        }
        return null;
    }


    // Ana Cevap Üretme Metodu
    _getBotResponse(userInput) {
        // Veriler yüklenmediyse erken çıkış veya özel mesaj
        if (!this.dataLoaded) {
            // Yükleme hala devam ediyorsa veya hata oluştuysa
            const placeholderText = this.ui.userInputElement ? this.ui.userInputElement.placeholder : "";
            if (placeholderText.includes("yükleniyor")) {
                 return "Veriler henüz hazır değil, lütfen biraz bekleyin.";
            } else if (placeholderText.includes("kullanılamıyor")) {
                 return "Üzgünüm, şu anda hizmet veremiyorum.";
            }
             // Beklenmedik durum
             return "Bot henüz hazır değil."
        }

        const lowerInput = userInput.toLocaleLowerCase('tr-TR').trim();
        const cleanedLowerInput = this._cleanInput(lowerInput);

        // İşleyici (Handler) Zinciri
        const handlers = [
            // Spesifik komutlar önce
            { handler: this._handleMath, input: lowerInput },
            { handler: this._handlePlateLookup, input: cleanedLowerInput },
            { handler: this._handleCapitalLookup, input: cleanedLowerInput },
            { handler: this._handleDateTime, input: cleanedLowerInput },
            { handler: this._handleWeather, input: cleanedLowerInput }, // Hava durumu eklendi
            // Genel sohbet ifadeleri sonra
            { handler: this._handleGreeting, input: lowerInput },
            { handler: this._handleHowAreYou, input: lowerInput },
            { handler: this._handleThanks, input: lowerInput },
            { handler: this._handleNameQuery, input: lowerInput },
            { handler: this._handleInsult, input: lowerInput },
            { handler: this._handleFarewell, input: lowerInput },
        ];

        for (const item of handlers) {
            const response = item.handler.call(this, item.input);
            if (response !== null) {
                return response;
            }
        }

        // Eğer temizlenmiş giriş tamamen boş kaldıysa (sadece yok sayılan kelimelerden oluşuyorsa)
        if (cleanedLowerInput === "" && lowerInput !== "") {
            return "Sanırım sadece sohbet etmek istediniz?"; // Veya varsayılan cevap
        }

        // Hiçbir handler eşleşmezse varsayılan cevabı döndür
        return this._getRandomDefaultResponse();
    }

    // Kullanıcı mesajını işleyen ana metot
    processUserMessage(messageText) {
        this.displayMessage(messageText, 'user');

        if (this.ui.userInputElement) {
            this.ui.userInputElement.value = '';
            this.ui.userInputElement.focus();
        }

        // Bot cevabını almak için biraz bekle (asenkron handler'lar için de zaman tanır)
        // Ancak _getBotResponse artık senkron "Yükleniyor..." döndürebilir.
        const botReply = this._getBotResponse(messageText);

        // Cevabı hemen göster (eğer "Yükleniyor..." değilse)
        // Eğer "Yükleniyor..." ise, _fetchAndDisplayWeather sonucu ayrıca gösterecek.
        // "Yükleniyor..." mesajını da göstermek kullanıcıya geri bildirim verir.
         setTimeout(() => {
             this.displayMessage(botReply, 'bot');
         }, 50 + Math.random() * 100); // Çok kısa bir gecikme, yazıyormuş gibi hissettirmek için
    }

    // Event Handlers
    _handleKeyPress(event) {
        if (event.key === 'Enter' && this.ui.userInputElement && !this.ui.userInputElement.disabled) {
            this.sendMessage();
        }
    }

    sendMessage() {
        if (!this.ui.userInputElement || this.ui.userInputElement.disabled) {
            return;
        }
        const messageText = this.ui.userInputElement.value.trim();
        if (messageText === '') return;

        this.processUserMessage(messageText);
    }

    // --- Başlatma ---
    _attachEventListeners() {
        if (this.ui.userInputElement) {
            this.ui.userInputElement.addEventListener('keypress', this._handleKeyPress);
        }
        if (this.ui.sendButton) {
            this.ui.sendButton.addEventListener('click', this.sendMessage);
        }
         // Başlangıç mesajını SADECE ilk açılışta ekle
         // Eğer chatMessagesContainer zaten doluysa (sayfa yenilenmediyse), tekrar ekleme.
         // Ancak basitlik adına, her başlangıçta ekleyebiliriz, çok sorun olmaz.
        this.displayMessage("Selam ben Ahraz. Tarih, saat, matematik, plaka, başkentler, hava durumu falan hakimim.", "bot");
    }

    async initialize() {
        this._attachEventListeners();
        this._setUIState(true); // UI'ı yükleme moduna al
        const dataLoadedSuccessfully = await this._loadData(); // Verileri yükle
        this._setUIState(false, !dataLoadedSuccessfully); // Yükleme sonrası UI durumunu ayarla (hata varsa belirt)
        console.log(`Bot başlatıldı. Veri yükleme ${dataLoadedSuccessfully ? 'başarılı' : 'başarısız'}.`);
    }
}

// --- BOT'U BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    const bot = new ChatBot();

    bot.initialize().catch(error => {
        console.error("Bot başlatılırken kritik bir hata oluştu:", error);
        // Kritik hata durumunda kullanıcıya bilgi ver ve UI'ı kilitle
        if (bot.ui.chatMessagesContainer) {
             bot.displayMessage("Üzgünüm, bir hata oluştu ve başlatılamadım.", "bot");
        }
        bot._setUIState(false, true); // UI'ı hata durumuyla kilitle
    });
});