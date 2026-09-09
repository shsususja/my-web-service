require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 용량이 큰 이미지 데이터를 받아오기 위해 10mb 용량 제한 설정
app.use(express.json({ limit: '10mb' }));

// public 폴더 안의 index.html 파일을 메인 화면으로 보여줌
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/solve', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: '.env 파일에 API 키가 설정되지 않았습니다.' });
    }

    try {
        const promptText = "이 문제 이미지의 텍스트와 도형을 읽어서 풀이를 작성해줘. " +
                          "수식 규칙: $, \\overline, \\frac, \\angle 같은 LaTeX 기호는 절대 사용 금지. " +
                          "선분은 '선분 AB', 각도는 '∠ABC', 분수는 '1/3'처럼 일반 글자로 적어줘. " +
                          "[출제의도], [단계별 풀이], [정답] 순서로 명확하게 보여줘.";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content) {
            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/\$\$(.*?)\$\$/g, '$1')
                       .replace(/\$(.*?)\$/g, '$1')
                       .replace(/\\overline\{(.*?)\}/g, '선분 $1')
                       .replace(/\\angle\s*([A-Za-z0-9]+)/g, '∠$1')
                       .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1/$2')
                       .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

            res.json({ result: text });
        } else {
            res.status(500).json({ error: data.error?.message || 'AI 분석 실패' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 성공적으로 실행되었습니다: http://localhost:${PORT}`);
});