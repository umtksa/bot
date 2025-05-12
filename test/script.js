document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');

    // Bilgi tabanını JSON formatında burada tanımlayın.
    // Python'daki load_knowledge fonksiyonunun yerini alır.
    // "topic" (konu) anahtarları, eski .txt dosyalarınızın adları olabilir (uzantısız).
    // Değerler, o konudaki potansiyel cevaplar veya eşleşecek ifadeler dizisidir.
    const knowledgeBase = {
        "genel": [
            "Nasılsın?",
            "İyiyim, sen nasılsın?",
            "Adın ne?",
            "Benim adım Ahraz.",
            "Merhaba",
            "Merhaba!",
            "Selam",
            "Selam!",
            "Ne yapıyorsun?",
            "İyiyim ne yapayım."
        ],
        "bilgi": [
            "Türkiye'nin başkenti neresidir?",
            "Türkiye'nin başkenti Ankara'dır.",
            "Adana'nın plaka kodu nedir?",
            "Adana'nın plaka kodu 01'dir.",
            "istanbul'un nüfusu ne kadar?",
            "İstanbul'un nüfusu yaklaşık 15 milyon.",
            "Antalya'nın plaka kodu nedir?",
            "Antalya'nın plaka kodu 07'dir.",
            "Dünya kendi etrafında yaklaşık 24 saatte döner."
        ],
        "renkler": [
            "Gökyüzü ne renk?",
            "Gökyüzü mavidir.",
            "Çimen ne renk?",
            "Çimen yeşildir."
        ]
        // Daha fazla konu ve bilgi ekleyebilirsiniz
        // Örnek:
        // "tarih": [
        //     "İstanbul kaç yılında fethedildi?",
        //     "İstanbul 1453 yılında fethedildi."
        // ]
    };

    // Metni temizleme ve standartlaştırma (Python clean_text)
    function cleanText(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        // \w (word character) -> A-Za-z0-9_
        // \s (whitespace character)
        // Python'daki [^\w\s\+\=\*] ifadesi, harf, rakam, alt çizgi, boşluk, +, =, * dışındaki her şeyi kaldırır.
        return text.replace(/[^A-Za-z0-9_ğüşıöçĞÜŞİÖÇ\s+=*]/g, "").trim().toLowerCase();
    }

    // Matematik problemini çıkarma (Python extract_math_problem)
    function extractMathProblem(question) {
        // Sadece rakamları ve +, -, *, / operatörlerini bırakır
        return question.replace(/[^0-9+\-*/=.]/g, ""); // Ondalık sayılar için nokta eklendi
    }

    // Matematik problemlerini çözme (Python solve_math_problem)
    function solveMathProblem(question) {
        const cleanedQuestion = extractMathProblem(question);

        try {
            if (cleanedQuestion.includes('+')) {
                const parts = cleanedQuestion.split('+');
                const num1 = parseFloat(parts[0]);
                const num2 = parseFloat(parts[1]);
                if (isNaN(num1) || isNaN(num2)) throw new Error("Geçersiz sayılar.");
                return `${num1} + ${num2} = ${num1 + num2}`;
            } else if (cleanedQuestion.includes('*')) {
                const parts = cleanedQuestion.split('*');
                const num1 = parseFloat(parts[0]);
                const num2 = parseFloat(parts[1]);
                if (isNaN(num1) || isNaN(num2)) throw new Error("Geçersiz sayılar.");
                return `${num1} * ${num2} = ${num1 * num2}`;
            } else if (cleanedQuestion.includes('-')) { // Çıkarma eklendi
                const parts = cleanedQuestion.split('-');
                const num1 = parseFloat(parts[0]);
                const num2 = parseFloat(parts[1]);
                if (isNaN(num1) || isNaN(num2)) throw new Error("Geçersiz sayılar.");
                return `${num1} - ${num2} = ${num1 - num2}`;
            } else if (cleanedQuestion.includes('/')) { // Bölme eklendi
                const parts = cleanedQuestion.split('/');
                const num1 = parseFloat(parts[0]);
                const num2 = parseFloat(parts[1]);
                if (isNaN(num1) || isNaN(num2)) throw new Error("Geçersiz sayılar.");
                if (num2 === 0) return "Bir sayı sıfıra bölünemez.";
                return `${num1} / ${num2} = ${num1 / num2}`;
            }
            else {
                return "Sadece toplama, çıkarma, çarpma ve bölme problemlerini çözebilirim.";
            }
        } catch (e) {
            return `Hata: ${e.message}. Lütfen 'sayı operatör sayı' formatında girin (örn: 5 + 3).`;
        }
    }

    // Bilgi tabanından en iyi eşleşen cevabı bulma (Python find_answer)
    function findAnswer(question, knowledge) {
        const cleanedQuestion = cleanText(question);
        if (!cleanedQuestion) return "Lütfen bir soru sorun."; // Boş giriş kontrolü

        let bestMatch = null;
        let bestScore = 0;

        // Türkçe karakterleri de içeren boşluklara göre ayırma
        const questionWords = cleanedQuestion.split(/\s+/).filter(word => word.length > 0);


        for (const topic in knowledge) {
            for (const line of knowledge[topic]) {
                const cleanedLine = cleanText(line);
                const lineWords = cleanedLine.split(/\s+/).filter(word => word.length > 0);

                // 1. Tam eşleşme (En Yüksek Öncelik)
                if (cleanedQuestion === cleanedLine) {
                    return line; // Orijinal, temizlenmemiş satırı döndür
                }

                // 2. Kelime sırası eşleşmesi (Orta Öncelik)
                // Sorudaki tüm kelimeler cevap satırında geçiyor mu?
                const allWordsPresent = questionWords.every(word => cleanedLine.includes(word));
                if (allWordsPresent && questionWords.length > 0) {
                    let currentScore = 0;
                    questionWords.forEach(qWord => {
                        if (cleanedLine.includes(qWord)) {
                            currentScore++;
                        }
                    });
                     // Daha spesifik eşleşmelere öncelik ver (daha fazla kelime eşleşmesi)
                    if (currentScore > bestScore) {
                        bestMatch = line;
                        bestScore = currentScore;
                    }
                }
                // 3. Kısmi eşleşme (Düşük Öncelik)
                // Sadece "allWordsPresent" false ise bu bloğa gir (yukarıdaki if'e elif gibi davranır)
                else if (questionWords.some(word => cleanedLine.includes(word)) && questionWords.length > 0) {
                     let currentScore = 0;
                     questionWords.forEach(qWord => {
                        if (cleanedLine.includes(qWord)) {
                            currentScore++;
                        }
                    });
                    // Sadece daha iyi bir "allWordsPresent" eşleşmesi bulunmadıysa ve bu kısmi eşleşme daha iyiyse güncelle
                    if (currentScore > bestScore) {
                        bestMatch = line;
                        bestScore = currentScore;
                    }
                }
            }
        }
        return bestMatch ? bestMatch : "Bu soruya henüz bir cevabım yok.";
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // En son mesaja kaydır
    }

    function processUserInput() {
        const userText = userInput.value.trim();
        if (userText === "") return;

        appendMessage(userText, 'user');
        userInput.value = ""; // Giriş alanını temizle

        let response = "";
        // Önce matematik sorusu mu diye kontrol et
        if (/[+\-*/]/.test(userText) && /[0-9]/.test(userText)) { // Operatör ve sayı içeriyorsa
            response = solveMathProblem(userText);
        } else {
            // Değilse bilgi tabanında ara
            response = findAnswer(userText, knowledgeBase);
        }

        // Botun cevabını biraz gecikmeyle ekle (daha doğal görünmesi için)
        setTimeout(() => {
            appendMessage(response, 'bot');
        }, 500);
    }

    sendButton.addEventListener('click', processUserInput);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            processUserInput();
        }
    });
});