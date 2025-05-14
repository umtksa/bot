const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.querySelector('.file-input-label');
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
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        botData = await response.json();
        console.log("Bot verileri başarıyla yüklendi.");

        const searchableItems = Object.keys(botData).map(originalKey => {
            let cleanedKey = originalKey.toLowerCase().normalize("NFC");
            cleanedKey = cleanedKey.replace(/'[^\\s]+/g, '');
            cleanedKey = cleanedKey.replace(/[.,!?;:]/g, '');
            cleanedKey = cleanedKey.replace(/\s+/g, ' ').trim();
            return {
                cleanedKey: cleanedKey,
                originalKey: originalKey
            };
        });

        const options = {
            includeScore: true,
            keys: ['cleanedKey'],
            threshold: 0.4,
            ignoreLocation: true,
        };
        fuse = new Fuse(searchableItems, options);
        console.log("Fuse.js arama motoru başlatıldı.");
    } catch (error) {
        console.error("Bot verileri veya Fuse.js yüklenirken bir hata oluştu:", error);
        addMessage("json şeyoldu!", "bot");
    }
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
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
    cleaned = cleaned.replace(/[^a-z0-9ğüşöçİı\s+\-*/^.]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    const tokens = cleaned.split(' ').filter(word => word.length > 0 && !turkishStopwords.has(word));
    cleaned = tokens.join(' ');
    if (cleaned.length === 0) {
        return "";
    }
    return cleaned;
}

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
                    console.log("Math.js Result:", mathResultString);
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
    if (searchTerm.length === 0) {
        return "Üzgünüm, ne sorduğunu tam olarak anlayamadım.";
    }

    const results = fuse.search(searchTerm);
    console.log(`Searching Fuse for: "${searchTerm}"`);
    console.log("Fuse.js Results:", results);

    if (results.length > 0) {
        const bestMatch = results[0];
        const matchedOriginalKey = bestMatch.item.originalKey;
        let botResponse = botData[matchedOriginalKey];

        if (!botResponse) {
            console.error(`FATAL ERROR: Matched original key "${matchedOriginalKey}" not found in botData.`);
            return "Üzgünüm, dahili bir hata oluştu (yanıt eşleşmedi).";
        }

        if (botResponse.includes('{{currentTime}}')) {
            botResponse = botResponse.replace('{{currentTime}}', new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        }
        if (botResponse.includes('{{currentDate}}')) {
            botResponse = botResponse.replace('{{currentDate}}', new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        }
        return botResponse;
    } else {
        return "Üzgünüm, sorunuzu tam olarak anlayamadım.";
    }
}

async function sendMessage() {
    const messageText = userInput.value.trim();

    if (stagedFile && messageText.toLowerCase().includes('ocr')) {
        addMessage(messageText, 'user');
        userInput.value = '';
        userInput.focus();
        await performOcr(stagedFile);
        stagedFile = null;
        return;
    }

    if (messageText !== '') {
        addMessage(cleanTextForDisplay(messageText), 'user');
        userInput.value = '';
        userInput.focus();
        if (stagedFile) {
            addMessage(`'${file.name}' eklendi.`, "bot");
        }
        setTimeout(() => {
            const botResponse = processUserInput(messageText);
            addMessage(botResponse, 'bot');
        }, 300 + Math.random() * 500);
        return;
    }

    if (messageText === '' && stagedFile) {
        addMessage(`'${file.name}' eklendi.`, "bot");
        userInput.focus();
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
    //addMessage(`OCR...`, "bot");
    try {
        const { data: { text } } = await ocrWorker.recognize(imageFile);
        if (text && text.trim()) {
            addMessage(`${cleanTextForDisplay(text)}`, "bot");
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
        event.preventDefault();
        sendMessage();
    }
});


fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            stagedFile = file;
            addMessage(`'${file.name}' eklendi.`, "bot"); // Güncellendi
            userInput.focus();
        } else {
            addMessage("Şimdilik sadece görsel dosyaları seçebilirsin!", "bot");
            stagedFile = null;
        }
        event.target.value = '';
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadBotData();
    await initializeOcrWorker();
    console.log("Tüm başlangıç işlemleri (veri ve OCR motoru) tamamlandı.");
});