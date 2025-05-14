const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.querySelector('.file-input-label'); // Bu satır HTML'de ilgili class varsa gereklidir.
const chatContainer = document.getElementById('chatContainer');

let botData = {};
let fuse;
let ocrWorker;
let stagedFile = null;

const turkishStopwords = new Set([
    "nedir", "kaçtır", "kaç", "kodu", "kodunu", "numarasını", "numarası", "neresidir", "ilinin", "ne", "peki", "canım", "ahraz", "ahrazcım", "biliyor", "musun", "mü", "mı", "mi", "değil", "söyler", "söyleyebilir", "misin", "hatırlatır", "söyle", "bana", "senin", "verir", "müsün", "mısın", "lütfen", "acaba", "ben"
]);

async function initializeOcrWorker() {
    console.log("OCR motoru başlatılıyor...");
    try {
        ocrWorker = await Tesseract.createWorker('tur+eng');
        await ocrWorker.loadLanguage('tur+eng');
        await ocrWorker.initialize('tur+eng');
        console.log("OCR motoru hazır. Ataç simgesiyle görsel ekleyebilirsiniz.");
    } catch (error) {
        console.error("Tesseract OCR motoru başlatılırken hata oluştu:", error);
        addMessage("OCR motoru başlatılırken bir sorun oluştu.", "bot");
    }
}

async function loadBotData() {
    try {
        const response = await fetch('data.json'); // data.json dosyanızın doğru yolda olduğundan emin olun
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        botData = await response.json();
        console.log("Bot verileri başarıyla yüklendi.");

        const searchableItems = [];

        const generateVariants = (keyWithOptionalParts) => {
            const generatedForKey = new Set();

            const cleanForFuse = (variant) => {
                if (typeof variant !== 'string') return "";
                let cleaned = variant.toLowerCase().normalize("NFC");
                cleaned = cleaned.replace(/'[^\\s]+/g, '');
                cleaned = cleaned.replace(/[.,!?;:]/g, '');
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
                return cleaned;
            };

            const keyWords = keyWithOptionalParts.split(' ');
            const variantWordLists = keyWords.map(wordPart => {
                if (!wordPart.includes('!')) {
                    return [wordPart];
                }

                const subParts = wordPart.split('!');
                const wordVariants = [];
                let currentWord = subParts[0];
                wordVariants.push(currentWord);

                for (let i = 1; i < subParts.length; i++) {
                    currentWord += subParts[i];
                    wordVariants.push(currentWord);
                }
                return wordVariants.length > 0 ? wordVariants : [""];
            });

            let phraseCombinations = [[]];
            for (const wordList of variantWordLists) {
                if (wordList.length === 0 || (wordList.length === 1 && wordList[0] === "")) continue;
                const newCombinations = [];
                for (const existingCombo of phraseCombinations) {
                    for (const word of wordList) {
                        newCombinations.push(existingCombo.concat(word));
                    }
                }
                phraseCombinations = newCombinations;
            }

            phraseCombinations.forEach(comboArray => {
                const phrase = comboArray.join(' ');
                const cleanedPhrase = cleanForFuse(phrase);
                if (cleanedPhrase) {
                    generatedForKey.add(cleanedPhrase);
                }
            });

            const fullyExpandedCleaned = cleanForFuse(keyWithOptionalParts.replace(/!/g, ''));
            if (fullyExpandedCleaned) {
                generatedForKey.add(fullyExpandedCleaned);
            }

            const shortestVersionParts = keyWithOptionalParts.split(' ').map(part => {
                return part.includes('!') ? part.substring(0, part.indexOf('!')) : part;
            });
            const shortestCleaned = cleanForFuse(shortestVersionParts.join(' '));
            if (shortestCleaned) {
                generatedForKey.add(shortestCleaned);
            }

            return Array.from(generatedForKey);
        };

        Object.keys(botData).forEach(originalKey => {
            const variants = generateVariants(originalKey);
            variants.forEach(cleanedVariantKey => {
                if (cleanedVariantKey) {
                    searchableItems.push({
                        cleanedKey: cleanedVariantKey,
                        originalKey: originalKey
                    });
                }
            });
        });

        const options = {
            includeScore: true,
            keys: ['cleanedKey'],
            threshold: 0.3, // Eşleşme hassasiyeti (0.0 en katı, 1.0 en gevşek)
            ignoreLocation: true,
        };
        fuse = new Fuse(searchableItems, options);
        console.log("Fuse.js arama motoru varyasyonlarla başlatıldı.");
        // console.log("Fuse için aranabilir öğeler:", JSON.stringify(searchableItems, null, 2));


    } catch (error) {
        console.error("Bot verileri veya Fuse.js (varyasyonlu) yüklenirken bir hata oluştu:", error);
        addMessage("json veya varyasyonlu arama motoru yüklenirken bir sorun oluştu!", "bot");
    }
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.style.whiteSpace = 'pre-line'; // Yeni satırları (\n) işlemesi için
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.opacity = 1;
        messageDiv.style.transform = 'translateY(0)';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 10);
}

function cleanSearchTerm(input) {
    if (!input) return "";
    let cleaned = input.toLowerCase().normalize("NFC");
    cleaned = cleaned.replace(/'[^\\s]+/g, '');
    cleaned = cleaned.replace(/[.,!?;:]/g, '');
    // Kullanıcı girdisindeki ! işaretlerini de temizler, bu normaldir.
    cleaned = cleaned.replace(/[^a-z0-9ğüşöçİı\s+\-*/^.]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    const tokens = cleaned.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
    cleaned = tokens.join(' ');
    if (cleaned.length === 0) {
        return ""; // Boş bir arama terimi döndürmek yerine boş string
    }
    return cleaned;
}

// Sadece kullanıcı mesajlarındaki gereksiz boşlukları temizler.
function cleanTextForDisplay(text) {
    if (!text) return "";
    return text.replace(/\s+/g, ' ').trim();
}

function processUserInput(input) {
    const cleanedInputForMath = input.toLowerCase().normalize("NFC").replace(/,/g, '.');
    const hasNumber = /\d/.test(cleanedInputForMath);
    const looksLikeMathOrUnitConversion = hasNumber && (
        cleanedInputForMath.includes(' to ') ||
        /[+\-*/^%]/.test(cleanedInputForMath) ||
        cleanedInputForMath.includes('sqrt') || cleanedInputForMath.includes('log') ||
        cleanedInputForMath.includes('sin') || cleanedInputForMath.includes('cos') || cleanedInputForMath.includes('tan')
    );

    if (looksLikeMathOrUnitConversion) {
        try {
            const result = math.evaluate(cleanedInputForMath);
            if (typeof result === 'number' || result instanceof math.Unit || result instanceof math.Complex || result instanceof math.BigNumber || (result !== null && typeof result === 'object' && typeof result.toString === 'function')) {
                const mathResultString = result.toString();
                if (mathResultString && mathResultString !== cleanedInputForMath) {
                    console.log("Math.js Sonucu:", mathResultString);
                    return mathResultString;
                }
            }
        } catch (e) {
            console.warn("Math.js hesaplaması başarısız oldu, Fuse denenecek:", e.message);
        }
    }

    if (!fuse) {
        console.error("Fuse.js arama motoru henüz hazır değil.");
        return "Üzgünüm, arama motoru henüz hazır değil.";
    }

    const searchTerm = cleanSearchTerm(input);
    if (searchTerm.length === 0 && !stagedFile) { // Eğer sadece boşluk girildiyse ve dosya yoksa
        return "Lütfen bir şeyler yazın veya dosya ekleyip 'ocr' komutunu kullanın.";
    }
    if (searchTerm.length === 0 && stagedFile) { // Dosya var ama yazı yoksa, OCR için yönlendir
        return "Görsel eklendi. Metnini almak için 'ocr' yazıp gönderebilirsin.";
    }


    const results = fuse.search(searchTerm);
    console.log(`Fuse araması yapılıyor: "${searchTerm}"`);
    console.log("Fuse.js Sonuçları:", results);

    if (results.length > 0) {
        const bestMatch = results[0];
        const matchedOriginalKey = bestMatch.item.originalKey;
        let botResponse = botData[matchedOriginalKey];

        if (!botResponse) {
            console.error(`KRİTİK HATA: Eşleşen orijinal anahtar "${matchedOriginalKey}" botData içinde bulunamadı.`);
            return "Üzgünüm, dahili bir hata oluştu (yanıt eşleşmedi).";
        }

        if (typeof botResponse === 'string') { // Sadece string ise replace yap
            if (botResponse.includes('{{currentTime}}')) {
                botResponse = botResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
            }
            if (botResponse.includes('{{currentDate}}')) {
                botResponse = botResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
            }
        }
        return botResponse;
    } else {
        return "Üzgünüm, sorunuzu tam olarak anlayamadım. Daha farklı bir şekilde sormayı deneyebilirsiniz.";
    }
}

async function sendMessage() {
    const messageText = userInput.value.trim();

    if (stagedFile && messageText.toLowerCase().includes('ocr')) {
        addMessage(cleanTextForDisplay(messageText), 'user'); // Kullanıcının "ocr" komutunu temizleyip göster
        userInput.value = '';
        userInput.focus();
        await performOcr(stagedFile);
        stagedFile = null; // OCR sonrası dosyayı temizle
        return;
    }

    if (messageText !== '') {
        addMessage(cleanTextForDisplay(messageText), 'user'); // Kullanıcı mesajını temizleyip göster
        userInput.value = '';
        userInput.focus();
        if (stagedFile) {
             // Dosya varsa ve OCR komutu değilse, dosyayı işleme almayabiliriz veya farklı bir mesaj verebiliriz.
             // Şimdilik, dosyanın eklendiğini belirten bir mesaj göstermeyelim, çünkü OCR ile işlenmedi.
             // İsterseniz buraya "Dosya eklendi ama 'ocr' komutu kullanılmadı." gibi bir mesaj ekleyebilirsiniz.
             // Veya stagedFile = null; ile dosyayı iptal edebilirsiniz.
             // Şimdilik, normal mesaj akışına devam edelim.
        }
        setTimeout(() => {
            const botResponse = processUserInput(messageText);
            addMessage(botResponse, 'bot');
        }, 300 + Math.random() * 500);
        return;
    }

    // Sadece dosya eklendiğinde ve mesaj kutusu boşken gönder tuşuna basılırsa
    if (messageText === '' && stagedFile) {
        addMessage("Görsel eklendi. Metnini almak için 'ocr' yazıp gönderebilirsin.", "user"); // Kullanıcıya bilgi
        userInput.focus();
        // stagedFile burada null yapılmamalı, kullanıcı 'ocr' yazana kadar beklemeli
        return;
    }
}

async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil! Lütfen biraz bekleyin.", "bot");
        return;
    }
    if (!imageFile) {
        addMessage("OCR için bir görsel dosyası bulunamadı.", "bot");
        return;
    }
    addMessage("Görsel işleniyor (OCR)...", "bot"); // Kullanıcıya OCR işleminin başladığını bildir
    try {
        const { data: { text } } = await ocrWorker.recognize(imageFile);
        if (text && text.trim()) {
            addMessage(text, "bot"); // OCR metnini olduğu gibi, yeni satırları koruyarak göster
        } else {
            addMessage(`'${imageFile.name}' görselinde metin bulunamadı!`, "bot");
        }
    } catch (error) {
        console.error("OCR sırasında hata oluştu:", error);
        addMessage(`'${imageFile.name}' görseli işlenirken OCR hatası oluştu!`, "bot");
    }
}

sendButton.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Enter'ın varsayılan davranışını (örn: form gönderme) engelle
        sendMessage();
    }
});

fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            stagedFile = file; // Dosyayı sonraki OCR komutu için sakla
            addMessage(`'${file.name}' eklendi. Metnini almak için 'ocr' yazıp gönderin.`, "bot");
            userInput.focus();
        } else {
            addMessage("Şimdilik sadece görsel dosyaları seçebilirsin!", "bot");
            stagedFile = null;
        }
        event.target.value = ''; // Aynı dosyayı tekrar seçebilmek için input'u sıfırla
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadBotData(); // Önce bot verilerini ve Fuse'u yükle
    await initializeOcrWorker(); // Sonra OCR motorunu başlat
    console.log("Tüm başlangıç işlemleri (veri, Fuse ve OCR motoru) tamamlandı.");
    // İlk mesaj index.html içinde zaten var. İsterseniz buradan da ekleyebilirsiniz:
    // addMessage("Selam ben Ahraz. Matematik, tarih, saat, plaka, IOR numaraları gibi konulara hakimim. Görsel ekleyip sonrasında 'ocr' komutunu kullanarak metnini alabilirsin.", "bot");
});