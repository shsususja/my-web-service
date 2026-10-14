const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Render의 GEMINI_API_KEY 또는 API_KEY 변수를 모두 지원하도록 설정
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.error("WARNING: API Key is missing in environment variables!");
}

app.post('/api/analyze', async (req, res) => {
  try {
    if (!apiKey || !ai) {
      return res.status(500).json({ error: "Server error: GEMINI_API_KEY standard environment variable is missing." });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    const prompt = "수학 문제를 정확히 풀고 다음 형식으로 답변해 주세요:\n1. 핵심 수학 개념\n2. 단계별 상세 풀이\n3. 정답\n4. 쌍둥이 유사 문제";

    // 사용 가능한 모델 fallback 처리
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let responseText = null;
    let lastError = null;

    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [prompt, imagePart]
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed, trying next model...`, err.message);
        lastError = err;
      }
    }

    if (responseText) {
      res.json({ result: responseText });
    } else {
      throw lastError || new Error("Failed to generate solution from AI models.");
    }

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
