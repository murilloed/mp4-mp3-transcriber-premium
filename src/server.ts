import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import {
  transcribeAudio,
  SUPPORTED_FORMATS,
  validateTools,
  getAvailableModels,
} from "./transcribe.js";

const app = express();
const upload = multer({ dest: "uploads/" });

const PORT = Number(process.env.PORT || 3000);
const MODEL_PATH = process.env.MODEL_PATH || "./models/ggml-base.bin";
const MODELS_DIR = "./models";

app.use(express.json());
app.use(express.static("public"));

type Progress = { percent: number; stage: string; updatedAt: number };
const progressJobs = new Map<string, Progress>();
function reportProgress(id: string, percent: number, stage: string) {
  if (id) progressJobs.set(id, { percent, stage, updatedAt: Date.now() });
}
const cleanupProgress = setInterval(() => {
  for (const [id, progress] of progressJobs) {
    if (Date.now() - progress.updatedAt > 24 * 60 * 60 * 1000) progressJobs.delete(id);
  }
}, 60000);
cleanupProgress.unref();
app.get("/api/progress/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(progressJobs.get(req.params.id) || { percent: 0, stage: "Recebendo arquivo..." });
});

app.get("/health", async (_req, res) => {
  const tools = await validateTools();
  res.json({
    ok: true,
    ffmpeg: tools.ffmpeg,
    whisper: tools.whisper,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/models", async (_req, res) => {
  try {
    const models = await getAvailableModels(MODELS_DIR);
    res.json({ models });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo de áudio não enviado." });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();

    if (!SUPPORTED_FORMATS.includes(ext)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        error: `Formato não suportado. Use: ${SUPPORTED_FORMATS.join(", ")}`,
      });
    }

    const modelPath = req.body.model || MODEL_PATH;
    const result = await transcribeAudio(req.file.path, modelPath, req.file.originalname, (percent, stage) => reportProgress(String(req.query.job || ""), percent, stage));

    await fs.unlink(req.file.path).catch(() => {});

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json({
      success: true,
      text: result.text,
      duration: result.duration,
      format: result.format,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "Erro ao transcrever o áudio.",
    });
  }
});

app.post("/api/batch-transcribe", upload.array("audios", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const results = [];

    const files = req.files as Express.Multer.File[];
    for (const [index, file] of files.entries()) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (!SUPPORTED_FORMATS.includes(ext)) {
        await fs.unlink(file.path).catch(() => {});
        results.push({
          filename: file.originalname,
          success: false,
          error: "Formato não suportado",
        });
        continue;
      }

      const modelPath = req.body.model || MODEL_PATH;
      const result = await transcribeAudio(file.path, modelPath, file.originalname, (percent, stage) => reportProgress(String(req.query.job || ""), (index * 100 + percent) / files.length, `Arquivo ${index + 1}/${files.length}: ${stage}`));

      await fs.unlink(file.path).catch(() => {});

      results.push({
        filename: file.originalname,
        success: result.success,
        text: result.text,
        error: result.error,
        duration: result.duration,
      });
    }

    return res.json({ results });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error?.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎙️  Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Pasta de modelos: ${path.resolve(MODELS_DIR)}`);
});
