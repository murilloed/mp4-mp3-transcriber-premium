import { execa } from "execa";
import fs from "fs/promises";
import os from "os";
import path from "path";

const SUPPORTED_FORMATS = [".mp3", ".wav", ".m4a", ".flac"];

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
    await execa("whisper-cpp", ["--help"], { stdout: "pipe", stderr: "pipe" });
    whisperOk = true;
  } catch {
    whisperOk = false;
  }

  return { ffmpeg: ffmpegOk, whisper: whisperOk };
}

export async function transcribeAudio(
  inputPath: string,
  modelPath: string,
): Promise<TranscriptionResult> {
  const ext = path.extname(inputPath).toLowerCase();

  if (!SUPPORTED_FORMATS.includes(ext)) {
    return {
      success: false,
      error: `Formato não suportado. Use: ${SUPPORTED_FORMATS.join(", ")}`,
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "transcriber-"));
  const wavPath = path.join(tempDir, "audio.wav");
  const outputBase = path.join(tempDir, "transcription");

  try {
    const startTime = Date.now();

    await execa(
      "ffmpeg",
      ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", wavPath],
      { stdout: "pipe", stderr: "pipe" },
    );

    await execa(
      "whisper-cpp",
      ["-m", modelPath, "-f", wavPath, "-otxt", "-of", outputBase],
      { stdout: "pipe", stderr: "pipe" },
    );

    const txtPath = `${outputBase}.txt`;
    const text = await fs.readFile(txtPath, "utf8");
    const duration = Date.now() - startTime;

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
