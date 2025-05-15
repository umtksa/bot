// script.js

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const fileInput = document.getElementById('fileInput'); // Dosya girişi için
    const bot = new RiveScript({ utf8: true });

    // Küçük harfe dönüştürme fonksiyonu
    function turkceKucukHarfeDonustur(text) {
        if (typeof text !== 'string') {
            console.warn('turkceKucukHarfeDonustur fonksiyonuna gelen girdi metin (string) değil:', text);
            return text;
        }
        return text.toLocaleLowerCase('tr-TR');
    }

    bot.setSubroutine('ipaddress', async function(rs, args) {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            if (!response.ok) {
                console.error('IP adresi alınırken HTTP hatası:', response.status, response.statusText);
                return "IP adresinizi alırken bir sorun oluştu (HTTP " + response.status + ").";
            }
            const data = await response.json();
            if (data && data.ip) {
                return data.ip;
            } else {
                console.error('IP adresi alınamadı, API yanıtı beklenildiği gibi değil:', data);
                return "IP adresiniz API yanıtından alınamadı.";
            }
        } catch (error) {
            console.error('IP adresi alınırken bir hata oluştu:', error);
            return "IP adresinizi alırken bir ağ veya teknik sorun oluştu.";
        }
    });

    bot.setSubroutine('datefunction', function(rs, args) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('tr-TR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        return formattedDate;
    });

    bot.setSubroutine('timefunction', function(rs, args) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    async function loadBot() {
        try {
            await bot.loadFile(['ahraz.rive', 'genel.rive', 'plaka.rive']);
            bot.sortReplies();
            addBotMessage("Merhaba! Ben Ahraz. Matematik, ip adresi, tarih, saat, plaka kodları, ior değerleri ve OCR gibi yeteneklerim var");
            console.log("Bot başarıyla yüklendi ve hazır. Dosyalar: ahraz.rive, genel.rive, plaka.rive");
        } catch (error) {
            console.error("Bot yüklenirken hata oluştu:", error);
            addBotMessage("Üzgünüm, şu an hizmet veremiyorum. Bot yüklenemedi.");
        }
    }

    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addBotMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleMathExpression(expression) {
        if (!expression || expression.trim() === '') {
            return null;
        }
        try {
            const result = math.evaluate(expression);
            if (typeof result === 'number') {
                if (Math.abs(result) > 1e6 || (Math.abs(result) < 1e-4 && result !== 0)) {
                    return `${result.toExponential(4)}`;
                }
                if (!Number.isInteger(result)) {
                    const decimalPlaces = result.toString().split('.')[1]?.length || 0;
                    if (decimalPlaces > 4) {
                        return `${result.toFixed(4)}`;
                    }
                }
                return `${result}`;
            } else if (typeof result === 'string' && result.trim() !== '') {
                return `${result}`;
            } else if (result !== null && typeof result === 'object' && typeof result.toString === 'function') {
                return `${result.toString()}`;
            }
            console.log("math.evaluate sayı, string veya toString metodu olan obje dışında bir sonuç döndürdü:", result);
            return null;
        } catch (e) {
            if (e.message.includes("Division by zero")) {
                return "Sıfıra bölemezsiniz.";
            }
            return null;
        }
    }

    async function sendMessage() {
        const originalMessageText = userInput.value.trim();
        if (originalMessageText === '') return;

        addUserMessage(originalMessageText);
        userInput.value = '';
        userInput.focus();

        const processedMessage = turkceKucukHarfeDonustur(originalMessageText);
        const mathResult = handleMathExpression(processedMessage);

        if (mathResult !== null) {
            addBotMessage(mathResult);
            console.log("Matematik işlemi math.js ile işlendi:", originalMessageText, "-> Sonuç:", mathResult);
        } else {
            console.log("RiveScript'e gönderiliyor:", processedMessage);
            try {
                const reply = await bot.reply('local-user', processedMessage);
                addBotMessage(reply);
            } catch (error) {
                console.error("RiveScript reply hatası:", error);
                addBotMessage("Bir şeyler ters gitti, anlayamadım.");
            }
        }
    }

    // Tesseract.js ile resimden metin okuma
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            fileInput.value = ''; // Input'u temizle
            return;
        }

        if (!file.type.startsWith('image/')) {
            addBotMessage("Lütfen bir resim dosyası seçin (örneğin .png, .jpg).");
            fileInput.value = ''; // Hatalı seçim sonrası input'u temizle
            return;
        }

        addUserMessage(`${file.name}`);
        addBotMessage("OCR yapıyorum...");

        try {

            const worker = await Tesseract.createWorker('tur+eng', 1, {
                logger: m => {
                    console.log(m); // İşlem aşamalarını konsolda gösterir
                    if (m.status === 'recognizing text') {

                    }
                }
            });

            const { data: { text } } = await worker.recognize(file);
            await worker.terminate(); // Worker'ı sonlandırarak kaynakları serbest bırakın

            if (text && text.trim() !== '') {
                addBotMessage(`${text.trim()}`);


            } else {
                addBotMessage("Resimde okunabilir bir metin bulunamadı veya metin boş.");
            }

        } catch (error) {
            console.error("Tesseract.js hatası:", error);
            addBotMessage("Resim işlenirken bir hata oluştu. Lütfen dosya formatını kontrol edin veya daha sonra tekrar deneyin.");
        } finally {
            // Aynı dosyayı tekrar seçebilmek için file input değerini sıfırla
            fileInput.value = '';
        }
    });

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // Botu yükle
    loadBot();
});