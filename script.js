// script.js

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const bot = new RiveScript({ utf8: true });

    // küçük harfe dönüştürme fonksiyonu
    function turkceKucukHarfeDonustur(text) {
      if (typeof text !== 'string') {
        console.warn('turkceKucukHarfeDonustur fonksiyonuna gelen girdi metin (string) değil:', text);
        return text;
      }
      return text.toLocaleLowerCase('tr-TR');
    }

    // NOT: hesapla subroutine'ı kaldırıldı. Matematik işlemleri artık
    // doğrudan sendMessage fonksiyonu içinde math.js kullanılarak işleniyor.
    bot.setSubroutine('ipaddress', async function(rs, args) {
    try {
        // api.ipify.org servisine istek yaparak IP adresini JSON formatında alıyoruz.
        const response = await fetch('https://api.ipify.org?format=json');

        // HTTP isteği başarılı olmadıysa (örneğin 404, 500 hatası)
        if (!response.ok) {
            console.error('IP adresi alınırken HTTP hatası:', response.status, response.statusText);
            return "IP adresinizi alırken bir sorun oluştu (HTTP " + response.status + ").";
        }

        // Yanıtı JSON olarak ayrıştırıyoruz.
        const data = await response.json();

        // JSON verisinden IP adresini alıp döndürüyoruz.
        if (data && data.ip) {
            return data.ip;
        } else {
            console.error('IP adresi alınamadı, API yanıtı beklenildiği gibi değil:', data);
            return "IP adresiniz API yanıtından alınamadı.";
        }
    } catch (error) {
        // Ağ hatası veya başka bir JavaScript hatası oluşursa
        console.error('IP adresi alınırken bir hata oluştu:', error);
        return "IP adresinizi alırken bir ağ veya teknik sorun oluştu.";
    }
});

    // tarih fonksiyonu
    bot.setSubroutine('datefunction', function(rs, args) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('tr-TR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        return formattedDate;
    });

    // saat fonksiyonu
    bot.setSubroutine('timefunction', function(rs, args) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    async function loadBot() {
        try {
            await bot.loadFile('ahraz.rive'); // RiveScript dosyanızın adı
            bot.sortReplies();
            addBotMessage("Merhaba! Ben Ahraz, size nasıl yardımcı olabilirim?");
            console.log("Bot başarıyla yüklendi ve hazır.");
        } catch (error) {
            console.error("Bot yüklenirken hata oluştu:", error);
            addBotMessage("Üzgünüm, şu an hizmet veremiyorum. Bot yüklenemedi.");
        }
    }

    // Kullanıcı mesajını sohbet ekranına ekle
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Bot mesajını sohbet ekranına ekle
    function addBotMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Matematiksel ifadeyi math.js ile değerlendirme fonksiyonu
    function handleMathExpression(expression) {
        // Boş veya sadece boşluk içeren girdileri atla
        if (!expression || expression.trim() === '') {
            return null;
        }

        try {
            // math.js ile ifadeyi değerlendir
            // evaluate fonksiyonu string ifadeyi parse edip hesaplar.
            const result = math.evaluate(expression);

            // math.js evaluate çeşitli tiplerde sonuçlar dönebilir.
            // Sayı, string (unit conversion), boolean, Complex, Unit vb.
            // Burada kullanıcıya gösterilebilecek sonuç tiplerini kontrol ediyoruz.

            if (typeof result === 'number') {
                 // Sayısal sonuçları belirli bir hassasiyete yuvarlayabiliriz (isteğe bağlı)
                 // Çok küçük veya çok büyük sayılar için bilimsel gösterim kullanabiliriz.
                 if (Math.abs(result) > 1e6 || (Math.abs(result) < 1e-4 && result !== 0)) {
                      return `${result.toExponential(4)}`; // Bilimsel gösterim
                 }
                 if (!Number.isInteger(result)) {
                     // Ondalık basamakları kontrol et, gerekiyorsa yuvarla
                     const decimalPlaces = result.toString().split('.')[1]?.length || 0;
                     if (decimalPlaces > 4) { // 4 ondalık basamaktan fazlaysa yuvarla
                          return `${result.toFixed(4)}`;
                     }
                 }
                 return `${result}`; // Tam sayı veya az ondalıklı sayı
            } else if (typeof result === 'string' && result.trim() !== '') {
                 // math.js bazen string sonuçlar döndürebilir (örn: '2 inch to cm' -> '5.08 cm')
                 // Boş string dönmediğinden emin olalım.
                 return `${result}`;
            } else if (result !== null && typeof result === 'object' && typeof result.toString === 'function') {
                 // Unit objeleri, Complex sayılar gibi toString metodu olan objeler
                 // toString ile string'e çevirip gösterelim.
                 return `${result.toString()}`;
            }
             // Diğer math.js sonuç tiplerini (matris, boolean vb.) isterseniz burada ele alabilirsiniz.
             // Şu an için sadece sayı, string ve toString metodu olan objeleri kullanıcıya gösteriyoruz.
             console.log("math.evaluate sayı, string veya toString metodu olan obje dışında bir sonuç döndürdü:", result);
             return null; // Matematik işlemi olarak kullanıcıya gösterilmeyecek

        } catch (e) {
            // math.js bir hata fırlattı (geçersiz ifade, tanımsız fonksiyon, birim vb.)
            // console.error("math.evaluate hatası:", e);
            // Kullanıcıya daha anlaşılır bir hata mesajı dönebiliriz
            // math.js hata mesajları genellikle bilgilendiricidir, doğrudan gösterebiliriz.
            // Ancak bazılarını özelleştirmek isteyebilirsiniz.
            if (e.message.includes("Division by zero")) {
                 return "Sıfıra bölemezsiniz.";
            }
            // Diğer hatalar için null dönerek RiveScript'in işlemesini sağlayalım.
            // "Geçersiz matematiksel ifade." gibi genel bir mesajı RiveScript'te tanımlamak
            // ve math.js hatasında null dönmek daha esnek olabilir.
            return null; // Matematik işlemi olarak ele alınmadı, RiveScript'e bırak
        }
    }


    // Mesaj gönderme fonksiyonu
    async function sendMessage() {
        const originalMessageText = userInput.value.trim();
        if (originalMessageText === '') return;

        addUserMessage(originalMessageText);
        userInput.value = '';
        userInput.focus();

        // Kullanıcı girdisini küçük harfe çevir (math.js case-sensitive olabilir, küçük harf iyi bir başlangıç)
        const processedMessage = turkceKucukHarfeDonustur(originalMessageText);

        // Önce doğrudan matematik işlemi olarak ele almaya çalış
        // math.js'in daha gelişmiş parsing yeteneği sayesinde,
        // "5+3", "2 * (4+1)", "sqrt(16)", "237436 cm to inch", "464.745" gibi ifadeler doğrudan işlenebilir.
        const mathResult = handleMathExpression(processedMessage);

        if (mathResult !== null) {
            // Matematik işlemi başarıyla işlendi veya hata mesajı döndü (handleMathExpression null dönmediyse)
            addBotMessage(mathResult);
            console.log("Matematik işlemi math.js ile işlendi:", originalMessageText, "-> Sonuç:", mathResult);
        } else {
            // Matematik işlemi olarak ele alınamadı (handleMathExpression null döndüyse), RiveScript'e gönder
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
