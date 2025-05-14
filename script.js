const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');

let ocrWorker;
let stagedFile = null;
let bot; // RiveScript bot instance

async function initializeOcrWorker() {
    console.log("OCR motoru başlatılıyor...");
    try {
        ocrWorker = await Tesseract.createWorker('tur+eng');
        console.log("OCR motoru hazır. Ataç simgesiyle görsel ekleyebilirsiniz.");
    } catch (error) {
        console.error("Tesseract OCR motoru başlatılırken hata oluştu:", error);
        addMessage("OCR motoru başlatılırken bir sorun oluştu.", "bot");
    }
}

async function initializeRiveScript() {
    bot = new RiveScript({ utf8: true });

    bot.setSubroutine('currentTime', function(rs, args) {
        return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    });

    bot.setSubroutine('currentDate', function(rs, args) {
        return new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    });

    bot.setSubroutine('triggerOcr', async function(rs, args) {
        if (stagedFile && ocrWorker) {
            const fileToProcess = stagedFile;
            stagedFile = null;
            // Kullanıcıya OCR'ın başladığını bildiren mesajı doğrudan RiveScript triggerOcr'dan vermek yerine,
            // performOcr içinde zaten var. Belki burada kısa bir "işleniyor" mesajı olabilir.
            // addMessage(`'${fileToProcess.name}' için OCR işlemi başlıyor...`, "bot"); // Bu satır performOcr içinde zaten var
            await performOcr(fileToProcess);
            return ""; // RiveScript'e boş cevap, mesajlar performOcr'da
        } else if (!ocrWorker) {
            return "OCR motoru henüz hazır değil.";
        } else {
            return "Lütfen önce bir görsel ekleyin ve sonra 'ocr' yazın.";
        }
    });

    try {
        await bot.loadFile('brain.rive');
        bot.sortReplies();
        console.log("RiveScript beyni başarıyla yüklendi ve sıralandı.");
    } catch (error) {
        console.error("RiveScript beyni yüklenirken hata:", error);
        addMessage("Botun beyni yüklenirken bir sorun oluştu.", "bot");
    }
}

function addMessage(text, sender) {
    if (!text || text.trim() === "") return; // Boş mesajları ekleme
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.style.whiteSpace = 'pre-line';
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.opacity = 1;
        messageDiv.style.transform = 'translateY(0)';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 10);
}

// cleanSearchTerm fonksiyonu kaldırıldı.

function cleanTextForDisplay(text) { // Bu fonksiyon sadece gösterim için, kalabilir.
    if (!text) return "";
    return text.replace(/\s+/g, ' ').trim();
}

async function processUserInput(input) {
    const originalInput = input;

    // 1. Math.js Kontrolü (RiveScript'ten önce)
    // Kullanıcı girdisini matematik işlemi için normalize et (virgülü noktaya çevir)
    const cleanedInputForMath = originalInput.toLowerCase().normalize("NFC").replace(/,/g, '.');
    const hasNumber = /\d/.test(cleanedInputForMath);
    const looksLikeMathOrUnitConversion = hasNumber && (
        cleanedInputForMath.includes(' to ') ||
        /[+\-*/^%]/.test(cleanedInputForMath) ||
        cleanedInputForMath.includes('sqrt') || cleanedInputForMath.includes('log') ||
        cleanedInputForMath.includes('sin') || cleanedInputForMath.includes('cos') || cleanedInputForMath.includes('tan')
    );

    if (looksLikeMathOrUnitConversion) {
        try {
            const mathResult = math.evaluate(cleanedInputForMath);
            if (typeof mathResult === 'number' || mathResult instanceof math.Unit || mathResult instanceof math.Complex || mathResult instanceof math.BigNumber || (mathResult !== null && typeof mathResult === 'object' && typeof mathResult.toString === 'function')) {
                const mathResultString = mathResult.toString();
                if (mathResultString && mathResultString.toLowerCase() !== cleanedInputForMath.trim()) {
                    console.log("Math.js Sonucu:", mathResultString);
                    return mathResultString;
                }
            }
        } catch (e) {
            console.warn("Math.js hesaplaması başarısız oldu, RiveScript denenecek:", e.message);
        }
    }

    // 2. RiveScript ile Cevap Alma
    if (!bot || !bot.ready) {
        console.error("RiveScript motoru henüz hazır değil.");
        return "Üzgünüm, bot henüz tam olarak hazır değil. Lütfen biraz bekleyin.";
    }

    // Kullanıcı girdisini RiveScript için hazırla: küçük harf ve trim.
    const preparedInput = originalInput.toLowerCase().trim();

    if (preparedInput.length === 0) {
        return "Ne demek istediğini anlayamadım."; // Boş girdi
    }

    console.log(`RiveScript'e gönderilen girdi: "${preparedInput}"`);
    const reply = await bot.reply("local-user", preparedInput);
    console.log("RiveScript Yanıtı:", reply);

    return reply;
}

async function sendMessage() {
    const messageText = userInput.value.trim();

    if (messageText !== '') {
        addMessage(cleanTextForDisplay(messageText), 'user'); // Kullanıcının yazdığını temiz göster
        userInput.value = '';
        userInput.focus();

        if (stagedFile && !messageText.toLowerCase().includes("ocr")) {
             addMessage(`'${stagedFile.name}' eklendi. Metnini almak için 'ocr' yazabilirsiniz.`, "bot");
        }

        const botResponse = await processUserInput(messageText);
        if (botResponse) {
            addMessage(botResponse, 'bot');
        }
    } else if (stagedFile) {
        addMessage(`'${stagedFile.name}' eklendi. Metnini çıkarmak için 'ocr' yazabilirsiniz.`, "bot");
        userInput.focus();
    }
}

async function performOcr(imageFile) {
    if (!ocrWorker) {
        addMessage("OCR motoru henüz hazır değil! Lütfen biraz bekleyin.", "bot");
        return;
    }
    if (!imageFile) {
        return; // Zaten triggerOcr'da kontrol ediliyor.
    }
    addMessage(`'${imageFile.name}' için OCR işlemi başlıyor...`, "bot");
    try {
        const { data: { text } } = await ocrWorker.recognize(imageFile);
        if (text && text.trim()) {
            addMessage(text, "bot");
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
            addMessage(`'${file.name}' seçildi. İçeriğini almak için 'ocr' yazabilirsiniz.`, "bot");
            userInput.focus();
        } else {
            addMessage("Şimdilik sadece görsel dosyaları seçebilirsin!", "bot");
            stagedFile = null;
        }
        event.target.value = '';
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await initializeRiveScript();
    await initializeOcrWorker();
    console.log("Tüm başlangıç işlemleri (RiveScript beyni ve OCR motoru) tamamlandı.");
    addMessage("Bot hazır! Konuşmaya başlayabilirsin.", "bot");
});