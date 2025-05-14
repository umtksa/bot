const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

let bot; // RiveScript bot instance

async function initializeRiveScript() {
    bot = new RiveScript({ utf8: true });

    // Kaldırılan subroutines: currentTime, currentDate, triggerOcr

    try {
        await bot.loadFile('brain.rive');
        bot.sortReplies();
        console.log("RiveScript beyni başarıyla yüklendi ve sıralandı.");
        addMessage("Rive hazırım!", "bot"); // Başlangıç mesajı güncellendi
    } catch (error) {
        console.error("RiveScript beyni yüklenirken hata:", error);
        addMessage("Botun beyni yüklenirken bir sorun oluştu. Lütfen konsolu kontrol edin.", "bot");
    }
}

function addMessage(text, sender) {
    if (!text || text.trim() === "") return;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.style.whiteSpace = 'pre-line'; // Çok satırlı RiveScript cevapları için
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.opacity = 1;
        messageDiv.style.transform = 'translateY(0)';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 10);
}

function cleanTextForDisplay(text) {
    if (!text) return "";
    return text.replace(/\s+/g, ' ').trim();
}

async function processUserInput(input) {
    const originalInput = input;

    // Math.js kontrolünü basitlik adına şimdilik çıkardım. İsterseniz eklenebilir.
    /*
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
    */

    if (!bot || !bot.ready) {
        console.error("RiveScript motoru henüz hazır değil. Bot:", bot, "Bot.ready:", bot ? bot.ready : 'Bot tanımsız');
        return "Üzgünüm, bot henüz tam olarak hazır değil. Lütfen biraz bekleyin veya konsolu kontrol edin.";
    }

    const preparedInput = originalInput.toLowerCase().trim();
    if (preparedInput.length === 0) {
        return "Lütfen bir şeyler yazın.";
    }

    console.log(`RiveScript'e gönderilen girdi: "${preparedInput}"`);
    try {
        const reply = await bot.reply("local-user", preparedInput);
        console.log("RiveScript Yanıtı:", reply);
        return reply;
    } catch (error) {
        console.error("RiveScript reply hatası:", error);
        return "Cevap verirken bir sorunla karşılaştım.";
    }
}

async function sendMessage() {
    const messageText = userInput.value.trim();

    if (messageText !== '') {
        addMessage(cleanTextForDisplay(messageText), 'user');
        userInput.value = '';
        userInput.focus();

        const botResponse = await processUserInput(messageText);
        if (botResponse) {
            addMessage(botResponse, 'bot');
        }
    }
}

sendButton.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// Dosya girişi ve OCR ile ilgili event listener'lar kaldırıldı.

document.addEventListener('DOMContentLoaded', async () => {
    await initializeRiveScript();
    // initializeOcrWorker çağrısı kaldırıldı.
    console.log("Temel RiveScript botu başlatıldı.");
    // "Bot hazır!" mesajı initializeRiveScript içine taşındı, beyin yüklendikten sonra gösterilecek.
});