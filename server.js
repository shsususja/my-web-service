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
      return res.status(400).json({ error: '이미지가 없습니다.' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
당신은 최고의 수학 선생님입니다. 제출된 이미지의 수학 문제를 분석하여 다음 양식으로 답변해주세요.

### 📌 1. 핵심 수학 개념
- 이 문제가 해당하는 단원과 꼭 알아야 할 핵심 공식/개념을 2~3줄로 설명해주세요.

### 📝 2. 단계별 상세 풀이
- 풀이 과정을 초등학생도 이해할 수 있도록 1단계, 2단계, 3단계로 나누어 명확하게 작성해주세요.

### 🎯 3. 최종 정답
- 최종 답을 명확하게 표시해주세요.

### 🔄 4. 쌍둥이 유사 문제 (복습용)
- 방금 푼 문제와 숫자나 형태만 살짝 바꾼, 동일한 원리의 유사 문제 1개와 정답을 만들어주세요.
    `;

    // 💡 특정 모델 과부하 시 대체 모델을 순차적으로 자동 시도하는 안전 시스템
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let response;
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                { text: prompt }
              ]
            }
          ]
        });
        if (response && response.text) break; // 성공 시 즉시 루프 탈출
      } catch (err) {
        console.warn(`${modelName} 과부하 발생, 백업 모델로 재시도합니다...`, err.message);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('모든 AI 모델 연결에 실패했습니다.');
    }

    res.json({ result: response.text });
  } catch (error) {
    console.error('분석 에러:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
