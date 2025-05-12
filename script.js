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
                // En uzun ve en spesifik olanlar başa gelecek şekilde sıralandı.
                plateSuffixPattern: "(?:ilinin|şehrinin|'?nın|'?nin|'?nun|'?nün|'?ın|'?in|'?un|'?ün|ili)",
                capitalSuffixPattern: "(?:ülkesinin|'?nın|'?nin|'?nun|'?nün|'?ın|'?in|'?un|'?ün)",
                // Regex'leri burada tanımlayalım - temizlenmiş giriş üzerinde çalışacaklar
                plateRegex: null, // constructor'da oluşturulacak
                capitalRegex: null, // constructor'da oluşturulacak
                simplePlateRegex: /^(.+?)\s+plaka\s*?$/i,
                simpleCapitalRegex: /^(.+?)\s+başkent\s*?$/i,
                mathRegex: /^(\d+(\.\d+)?)\s*([\+\-\*\/])\s*(\d+(\.\d+)?)$/
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
        this.config.regex.plateRegex = new RegExp(`^(.+?)\\s*(?:<span class="math-inline">\{this\.config\.regex\.plateSuffixPattern\}\)?\\\\s\*\(plakas\(?\:ı\|i\)\|plaka kodu\)\\\\s\*?</span>`, 'i');
        this.config.regex.capitalRegex = new RegExp(`^(.+?)\\s*(?:<span class="math-inline">\{this\.config\.regex\.capitalSuffixPattern\}\)?\\\\s\*başkenti\\\\s\*?</span>`, 'i');


        // Veri depoları
        this.capitals = {};
        this.licensePlates = {};

        // Arayüz elemanları
        this.ui = {
            chatMessagesContainer: document.querySelector(this.config.selectors.chatMessagesContainer),
            userInputElement: document.querySelector(this.config.selectors.userInputElement),
            sendButton: document.querySelector(this.config.selectors.sendButton)
        };

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
        const filteredWords = words.filter(word => !this.