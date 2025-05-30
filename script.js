// script.js

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const fileInput = document.getElementById('fileInput');
    const bot = new RiveScript({ utf8: true });

    // Son yüklenen görseli saklamak için
    let lastUploadedImageFile = null;

    // Küçük harfe dönüştürme fonksiyonu
    function turkceKucukHarfeDonustur(text) {
        if (typeof text !== 'string') {
            console.warn('turkceKucukHarfeDonustur fonksiyonuna gelen girdi metin (string) değil:', text);
            return text;
        }
        return text.toLocaleLowerCase('tr-TR');
    }

    // RGB'den HEX'e çevir
    function rgbToHex(r, g, b) {
        return (
            "#" +
            [r, g, b]
                .map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                })
                .join("")
        );
    }

    // Renk dairesi HTML'i üret (büyük daire, sadece hex kodu)
    function colorCircle(rgbArr) {
        const hex = rgbToHex(...rgbArr);
        return `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${hex};margin-right:8px;vertical-align:middle;"></span>`;
    }

    bot.setSubroutine('weatherfunction', async function(rs, args) {
        let city = (args && args.length > 0) ? args.join(" ") : "";
        city = city.trim().replace(/\s+/g, "+");
        if (!city) return "Şehir adı belirtmelisin.";
        try {
            const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
            if (!response.ok) return "Hava durumu alınamadı.";
            const text = await response.text();
            return text;
        } catch (e) {
            return "Hava durumu alınırken bir hata oluştu.";
        }
    });

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
            await bot.loadFile(['ahraz.rive', 'genel.rive', 'plaka.rive', 'abilities.rive']);
            bot.sortReplies();
            addBotMessage("Merhaba! Ben Ahraz. Matematik, ip adresi, tarih, saat, plaka kodları, ior değerleri, OCR, renk analizi ve mockup gibi yeteneklerim var.");
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

    function addBotHtmlMessage(html) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'bot-message');
    messageElement.innerHTML = html;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Eğer img varsa, yüklenince tekrar scroll et
    const imgs = messageElement.querySelectorAll('img');
    imgs.forEach(img => {
        img.addEventListener('load', () => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    });
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

    // Görsel yüklendiğinde kullanıcıdan seçim alınır
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            fileInput.value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            addBotMessage("Lütfen bir resim dosyası seçin (örneğin .png, .jpg).");
            fileInput.value = '';
            return;
        }
        addUserMessage(`${file.name}`);
        lastUploadedImageFile = file;
        addBotMessage("OCR, renk analizi veya mockup yapabilirim. Lütfen 'ocr', 'renk' veya 'mockup' yaz.");
        fileInput.value = '';
        userInput.focus(); 
    });

    // Sürükle-bırak ile görsel yükleme desteği
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            chatContainer.classList.add('drag-over');
        });
        chatContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            chatContainer.classList.remove('drag-over');
        });
        chatContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            chatContainer.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (!file.type.startsWith('image/')) {
                    addBotMessage("Lütfen bir resim dosyası bırakın (örneğin .png, .jpg).");
                    return;
                }
                addUserMessage(`${file.name}`);
                lastUploadedImageFile = file;
                addBotMessage("OCR, renk analizi veya mockup yapabilirim. Lütfen 'ocr', 'renk' veya 'mockup' yaz.");
            }
        });
    }

    // MOCKUP fonksiyonu
    function applyMockup(cardFile, callback) {
        const baseImg = new Image();
        baseImg.src = 'base.jpg';
        baseImg.onload = () => {
            const cardImg = new Image();
            cardImg.src = URL.createObjectURL(cardFile);
            cardImg.onload = () => {
                try {
                    let baseMat = cv.imread(baseImg);
                    let baseMat2x = new cv.Mat();
                    cv.resize(baseMat, baseMat2x, new cv.Size(baseMat.cols * 2, baseMat.rows * 2), 0, 0, cv.INTER_CUBIC);

                    let cardMat = cv.imread(cardImg);

                    // mockup.html'deki koordinatlar
                    const dstCoords = [1355, 1897, 3388, 929, 4201, 2090, 2134, 3140];
                    const h = cardMat.rows, w = cardMat.cols;
                    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0,0, w,0, w,h, 0,h]);
                    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, dstCoords);

                    // Perspektif dönüşüm
                    const M = cv.getPerspectiveTransform(srcPts, dstPts);
                    const warped = new cv.Mat();
                    cv.warpPerspective(cardMat, warped, M, new cv.Size(baseMat2x.cols, baseMat2x.rows));

                    // Maskeleme
                    const gray = new cv.Mat();
                    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
                    const mask = new cv.Mat();
                    cv.threshold(gray, mask, 1, 255, cv.THRESH_BINARY);
                    const maskInv = new cv.Mat();
                    cv.bitwise_not(mask, maskInv);

                    const bg = new cv.Mat();
                    const fg = new cv.Mat();
                    cv.bitwise_and(baseMat2x, baseMat2x, bg, maskInv);
                    cv.bitwise_and(warped, warped, fg, mask);

                    const finalMat = new cv.Mat();
                    cv.add(bg, fg, finalMat);

                    // Sonucu tekrar küçült
                    const finalSmall = new cv.Mat();
                    cv.resize(finalMat, finalSmall, new cv.Size(baseMat.cols, baseMat.rows), 0, 0, cv.INTER_AREA);

                    // Sonucu canvas'a çiz ve dataURL olarak callback ile döndür
                    const canvas = document.createElement('canvas');
                    canvas.width = baseMat.cols;
                    canvas.height = baseMat.rows;
                    cv.imshow(canvas, finalSmall);

                    // Temizlik
                    [baseMat, baseMat2x, cardMat, srcPts, dstPts, M, warped, gray, mask, maskInv, bg, fg, finalMat, finalSmall].forEach(m => m.delete());

                    callback(canvas.toDataURL('image/jpeg'));
                } catch (err) {
                    callback(null);
                }
            };
            cardImg.onerror = () => callback(null);
        };
        baseImg.onerror = () => callback(null);
    }

    // Kullanıcıdan gelen mesajı kontrol et
    async function sendMessage() {
        const originalMessageText = userInput.value.trim();
        if (originalMessageText === '') return;

        addUserMessage(originalMessageText);
        userInput.value = '';
        userInput.focus();

        // Eğer son yüklenen bir görsel varsa ve kullanıcı seçim yaptıysa
        if (lastUploadedImageFile) {
            const choice = originalMessageText.toLocaleLowerCase('tr-TR');
            if (choice.includes('ocr')) {
                //addBotMessage("OCR yapıyorum...");
                try {
                    const worker = await Tesseract.createWorker('tur+eng', 1, {
                        logger: m => { /* konsola loglama */ }
                    });
                    const { data: { text } } = await worker.recognize(lastUploadedImageFile);
                    await worker.terminate();
                    if (text && text.trim() !== '') {
                        addBotMessage(`${text.trim()}`);
                    } else {
                        addBotMessage("Resimde okunabilir bir metin bulunamadı veya metin boş.");
                    }
                } catch (error) {
                    console.error("Tesseract.js hatası:", error);
                    addBotMessage("Resim işlenirken bir hata oluştu. Lütfen dosya formatını kontrol edin veya daha sonra tekrar deneyin.");
                }
                lastUploadedImageFile = null;
                return;
            } else if (choice.includes('renk')) {
                //addBotMessage("Renk analizi yapıyorum...");
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = function () {
                    try {
                        const colorThief = new ColorThief();
                        const dominant = colorThief.getColor(img);
                        const palette = colorThief.getPalette(img, 6);

                        let html = `Baskın renk:<br>${colorCircle(dominant)} ${rgbToHex(...dominant)}<br><br>`;
                        html += `Renk paleti:<br>`;
                        palette.forEach((c, i) => {
                            html += `${colorCircle(c)}${rgbToHex(...c)}<br>`;
                        });

                        addBotHtmlMessage(html);
                    } catch (e) {
                        addBotMessage("Renk analizi sırasında hata oluştu.");
                    }
                };
                img.onerror = function () {
                    addBotMessage("Görsel yüklenemedi, renk analizi yapılamadı.");
                };
                img.src = URL.createObjectURL(lastUploadedImageFile);
                lastUploadedImageFile = null;
                return;
            } else if (choice.includes('mockup')) {
                //addBotMessage("Mockup hazırlanıyor...");
                if (typeof cv === 'undefined' || !cv.imread) {
                    addBotMessage("OpenCV.js henüz yüklenmedi veya desteklenmiyor.");
                    lastUploadedImageFile = null;
                    return;
                }
                applyMockup(lastUploadedImageFile, (dataUrl) => {
                    if (dataUrl) {
                        addBotHtmlMessage(`<img src="${dataUrl}" style="max-width:100%;border-radius:8px;" alt="Mockup Sonucu"/>`);
                    } else {
                        addBotMessage("Mockup işlemi sırasında hata oluştu.");
                    }
                });
                lastUploadedImageFile = null;
                return;
            }
            addBotMessage("Lütfen 'ocr', 'renk' veya 'mockup' yazarak ne yapmak istediğinizi belirtin.");
            return;
        }

        // Matematik ve RiveScript akışı
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