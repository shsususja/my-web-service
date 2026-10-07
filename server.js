const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: '이미지가 필요합니다.' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
당신은 최고의 수학 선생님입니다. 제출된 이미지의 수학 문제를 분석하여 아래 양식에 맞추어 한국어로 친절하게 답변해주세요.

### 📌 1. 핵심 수학 개념
- 이 문제가 해당하는 단원과 꼭 알아야 할 핵심 공식/개념을 2~3줄로 설명해주세요.

### 📝 2. 단계별 상세 풀이
- 풀이 과정을 초등학생도 이해할 수 있도록 1단계, 2단계, 3단계로 나누어 명확하게 작성해주세요.

### 🎯 3. 최종 정답
- 최종 답을 명확하게 표시해주세요.

### 🔄 4. 쌍둥이 유사 문제 (복습용)
- 이 문제와 원리가 같은 새로운 유사 문제 1개와 그 정답을 만들어주세요.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        { text: prompt }
      ]
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error('AI 분석 오류:', error);
    res.status(500).json({ error: '수학 문제 분석 중 오류가 발생했습니다.' });
  }
});

app.listen(port, () => {
  console.log(`서버가 성공적으로 실행되었습니다: http://localhost:${port}`);
});
