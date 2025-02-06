// Temel paketler
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

// OpenAI API ayarları
const openai = require("./utils/openai"); // openai.js dosyasından içe aktarın

// Diğer yardımcı fonksiyonlar
const { getOrCreateAssistant } = require("./utils/assistant");

const {
  getOrCreateVectorStore,
  updateAssistantWithVectorStore,
} = require("./utils/vectorstore");


// userMessage adında bir fonksiyon ya da sabit döndüren dosya varsa:
const { userMessageGenerator } = require("./utils/consts");

// Ortam değişkenlerini yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// API key kontrolü örneği (isteğe göre devre dışı bırakabilirsiniz)
const API_KEY = "test";
function apiKeyMiddleware(req, res, next) {
  const apiKey = req.params.apiAnahtari;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ message: "Geçersiz API anahtarı" });
  }
  next();
}

// Express ayarları
app.use(bodyParser.json());
app.use(cors());

// Asistan ve vektör store referansları
let assistant;
let vectorStore;

// Sunucu başlarken asistan ve vektör store'u başlat
(async () => {
  try {
    assistant = await getOrCreateAssistant(); // Asistanı oluştur ya da getir
    vectorStore = await getOrCreateVectorStore(); // Vektör deposunu oluştur ya da getir
    await updateAssistantWithVectorStore(assistant, vectorStore);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error initializing assistant or vector store:", error);
  }
})();

// POST isteği - analiz
app.post("/analiz/:apiAnahtari", apiKeyMiddleware, async (req, res) => {
  try {
    const { prompt, threadId } = req.body;

    let thread;
    if (threadId) {
      thread = { id: threadId };
    } else {
      thread = await openai.beta.threads.create();
    }

    // CORS headers ekle
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Thread-Id');
    
    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Thread-Id": thread.id
    });
    // Kullanıcı mesajı oluştur
    const userMsg = userMessageGenerator(prompt);
    let fullResponse = "";

    console.log("UserMessage:", userMsg);

    // Mesajı thread'e ekle
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMsg,
    });

    // Thread'i asistanla çalıştır
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      tools: [
        {
          type: "file_search",
          file_search: {
            max_num_results: 10,
          },
        },
      ],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
      stream: true,
    });

    // Stream yanıtları
    for await (const event of run) {
      if (event.event === "thread.message.delta") {
        const content = event.data.delta.content;
        if (content && content.length > 0 && content[0].type === "text") {
          const textValue = content[0].text.value;
          fullResponse += textValue;
          res.write(`data: ${JSON.stringify({ content: textValue })}\n\n`);
        }
      }
    }

    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});
