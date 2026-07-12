import "dotenv/config";
import express from "express";
import path from "path";
import multer from "multer";
import Groq from "groq-sdk";
import fs from "fs";
import os from "os";
import { createRequire } from 'module';
const _require = createRequire(new URL('.', import.meta.url).href);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdf: (buf: Buffer) => Promise<{ text: string }> = (_require('pdf-parse') as any).default ?? _require('pdf-parse');
const mammoth = _require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };

// Use system temp directory for file uploads which is Vercel friendly
const tempDir = path.join(os.tmpdir(), "uploads");
const upload = multer({ dest: tempDir });

const app = express();

app.use(express.json());

// Set up a router to handle endpoints so that we are compatible whether Vercel routes with or without the "/api" prefix.
const router = express.Router();

// API route for chatting with Groq
router.post("/chat", async (req, res) => {
  try {
    const { messages, knowledgeBaseContext, model, systemPrompt: clientSystemPrompt } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not set" });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let systemPrompt = clientSystemPrompt || "Eres un agente de soporte técnico estricto que responde ÚNICAMENTE utilizando la información de los documentos proporcionados en la Base de Conocimiento.";

    // Force the strict rules regardless of the custom prompt, or append them
    const strictRules = `\n\n[REGLAS CRÍTICAS DEL AGENTE DE BASE DE CONOCIMIENTO]
1. Tu única fuente de verdad es la información contenida en los documentos de la Base de Conocimientos provistos abajo.
2. Si los documentos provistos no contienen la respuesta a la pregunta del usuario, o si la pregunta es irrelevante para los documentos, o si no hay documentos cargados en la Base de Conocimientos, debes responder EXACTAMENTE: "Lo siento, la información solicitada no se encuentra en la base de conocimiento disponible." y nada más. NO inventes información, no utilices tu conocimiento general ni intentes responder a cosas que no estén detalladas textualmente en los archivos.
3. Para cada respuesta o dato que proporciones, debes indicar obligatoriamente de qué archivo o documento exacto lo obtuviste, citándolo claramente (por ejemplo, "De acuerdo al archivo 'manual_procedimientos.txt'..." o colocando al final de la frase "[Archivo: instructivo.pdf]"). Es obligatorio y mandatorio citar el nombre de los archivos origen de donde proviene la información.
4. No respondas a saludos o charlas casuales con respuestas generales inventadas si no se asocian con los documentos; si te saludan, saluda amablemente pero indica que solo estás autorizado para responder dudas de la Base de Conocimiento disponible.`;

    systemPrompt += strictRules;

    if (knowledgeBaseContext && knowledgeBaseContext.length > 0) {
      systemPrompt += `\n\nContexto de la Base de Conocimientos:\n${knowledgeBaseContext.join("\n\n")}`;
    } else {
      systemPrompt += `\n\n[ATENCIÓN: No hay ningún documento en la Base de Conocimientos actualmente. Debes rechazar responder a cualquier pregunta técnica indicando que no hay base de conocimiento cargada y que no posees información para responder.]`;
    }

    const formattedMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: model || "llama-3.3-70b-versatile",
      temperature: 0.1, // lowered for high fidelity and less hallucinations
    });

    res.json({ message: chatCompletion.choices[0]?.message?.content || "", usage: chatCompletion.usage });
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Basic API route for uploading files (Knowledge Base simulation)
router.post("/upload", (req, res, next) => {
  // Ensure the temporary directory exists before upload
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create temp directory:", err);
    }
  }

  upload.array("files")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(500).json({ error: "Error de Multer: " + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const extractedTexts: string[] = [];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No se subió ningún archivo." });
    }
    
    for (const file of files) {
      const originalName = file.originalname;
      const ext = path.extname(originalName).toLowerCase();
      let fileContentText = "";

      try {
        if (ext === ".pdf") {
          const buffer = fs.readFileSync(file.path);
          const data = await pdf(buffer);
          fileContentText = data.text || "";
        } else if (ext === ".docx") {
          const buffer = fs.readFileSync(file.path);
          const result = await mammoth.extractRawText({ buffer });
          fileContentText = result.value || "";
        } else if ([".txt", ".md", ".json", ".csv", ".xml", ".html", ".js", ".ts", ".py", ".css"].includes(ext)) {
          fileContentText = fs.readFileSync(file.path, "utf8");
        } else {
          // For general binary, check if it seems readable or fallback
          const buffer = fs.readFileSync(file.path);
          const text = buffer.toString("utf8");
          const isPrintable = /^[\x09\x0A\x0D\x20-\x7E]*$/.test(text.slice(0, 100));
          if (isPrintable) {
            fileContentText = text;
          } else {
            fileContentText = `[Archivo binario no legible directamente: ${originalName}]`;
          }
        }
      } catch (parseErr: any) {
        console.error(`Error parsing file ${originalName}:`, parseErr);
        fileContentText = `[Error al extraer contenido del archivo: ${parseErr.message}]`;
      }

      // Clean up the uploaded file to save space
      if (fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error("Failed to delete temp file:", unlinkErr);
        }
      }

      // Format the extracted text with the original filename so the model knows exactly which file it is referencing
      extractedTexts.push(`--- INICIO ARCHIVO: "${originalName}" ---\n${fileContentText}\n--- FIN ARCHIVO: "${originalName}" ---`);
    }

    res.json({ texts: extractedTexts });
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Failed to process files: " + error.message });
  }
});

// Mount the router both with "/api" prefix and at "/" root (Vercel rewrite safety fallback)
app.use("/api", router);
app.use("/", router);

export default app;
