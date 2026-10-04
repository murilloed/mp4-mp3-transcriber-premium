import { execa } from "execa";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const SUPPORTED_FORMATS = [".mp3", ".wav", ".m4a", ".flac", ".mp4"];

const whisperCommand = () => process.env.WHISPER_PATH || "whisper-cpp";

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  duration?: number;
  format?: string;
}

export async function validateTools(): Promise<{
  ffmpeg: boolean;
  whisper: boolean;
}> {
  let ffmpegOk = false;
  let whisperOk = false;

  try {
    await execa("ffmpeg", ["-version"], { stdout: "pipe", stderr: "pipe" });
    ffmpegOk = true;
  } catch {
    ffmpegOk = false;
  }

  try {
    await execa(whisperCommand(), ["--help"], { stdout: "pipe", stderr: "pipe" });
    whisperOk = true;
  } catch {
    whisperOk = false;
  }

  return { ffmpeg: ffmpegOk, whisper: whisperOk };
}

export async function transcribeAudio(
  inputPath: string,
  modelPath: string,
  originalName: string = inputPath,
  onProgress: (percent: number, stage: string) => void = () => {},
): Promise<TranscriptionResult> {
  const ext = path.extname(originalName).toLowerCase();

  if (!SUPPORTED_FORMATS.includes(ext)) {
    return {
      success: false,
      error: `Formato não suportado. Use: ${SUPPORTED_FORMATS.join(", ")}`,
    };
  }

  try {
    await fs.access(modelPath);
  } catch {
    return { success: false, error: `Modelo Whisper não encontrado: ${modelPath}. Coloque o arquivo .bin na pasta models.` };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "transcriber-"));
  const wavPath = path.join(tempDir, "audio.wav");
  const outputBase = path.join(tempDir, "transcription");

  try {
    const startTime = Date.now();

    onProgress(0, "Extraindo áudio do arquivo...");
    await execa(
      "ffmpeg",
      ["-y", "-i", inputPath, "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wavPath],
      { stdout: "pipe", stderr: "pipe" },
    );

    onProgress(5, "Carregando modelo e transcrevendo...");
    const process = execa(
      whisperCommand(),
      ["-m", modelPath, "-f", wavPath, "-l", "auto", "-pp", "-otxt", "-of", outputBase],
      { stdout: "pipe", stderr: "pipe" },
    );
    let pending = "";
    process.stderr?.on("data", (chunk) => {
      pending += chunk.toString();
      const lines = pending.split(/[\r\n]/);
      pending = lines.pop() || "";
      for (const line of lines) {
        const match = line.match(/progress[^%]*?(\d+)%/i);
        if (match) onProgress(Math.min(99, 5 + Number(match[1]) * 0.94), "Transcrevendo áudio...");
      }
    });
    await process;

    const txtPath = `${outputBase}.txt`;
    const text = await fs.readFile(txtPath, "utf8");
    const duration = Date.now() - startTime;

    onProgress(100, "Transcrição concluída");
    return {
      success: true,
      text: text.trim(),
      duration,
      format: ext.replace(".", "").toUpperCase(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao transcrever o áudio",
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function getAvailableModels(
  modelsDir: string,
): Promise<string[]> {
  try {
    const files = await fs.readdir(modelsDir);
    return files.filter((f) => f.endsWith(".bin"));
  } catch {
    return [];
  }
}
