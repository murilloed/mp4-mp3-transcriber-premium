# 🎙️ Transcritor Premium

Uma API REST completa para transcrever áudio localmente usando Whisper C++.

## ✨ Features

- ✅ Suporte para MP3, WAV, M4A, FLAC
- ✅ Interface web bonita e responsiva
- ✅ Transcrição em lote (múltiplos arquivos)
- ✅ Download da transcrição como TXT
- ✅ Seleção dinâmica de modelos
- ✅ API REST completa
- ✅ Nenhum dado é enviado para servidores externos
- ✅ Funciona offline

## 📋 Pré-requisitos

Você precisa ter instalado no seu sistema:

### macOS
```bash
brew install ffmpeg
brew install whisper-cpp
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install ffmpeg
sudo apt-get install whisper-cpp
```

### Windows
- Instale FFmpeg: https://ffmpeg.org/download.html
- Instale Whisper: https://github.com/ggerganov/whisper.cpp

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/mp3-transcriber-premium.git
cd mp3-transcriber-premium
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env`:
```bash
cp .env.example .env
```

4. Baixe um modelo do Whisper:
```bash
mkdir -p models
# Download a partir do repositório oficial:
# https://github.com/ggerganov/whisper.cpp/releases
# Coloque o arquivo .bin em ./models/
```

## 🏃 Como rodar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

Acesse: `http://localhost:3000`

## 🔗 API Endpoints

### Health Check
```bash
GET /health
```

Retorna status de FFmpeg e Whisper.

### Listar Modelos
```bash
GET /api/models
```

Retorna lista de modelos disponíveis.

### Transcrever Arquivo Único
```bash
POST /api/transcribe
Content-Type: multipart/form-data

audio: <arquivo MP3, WAV, M4A ou FLAC>
model: <opcional, caminho para o modelo>
```

Resposta:
```json
{
  "success": true,
  "text": "Transcrição do áudio...",
  "duration": 2500,
  "format": "MP3",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Transcrever Lote
```bash
POST /api/batch-transcribe
Content-Type: multipart/form-data

audios: <múltiplos arquivos de áudio>
model: <opcional>
```

Resposta:
```json
{
  "results": [
    {
      "filename": "audio1.mp3",
      "success": true,
      "text": "...",
      "duration": 1500
    },
    {
      "filename": "audio2.mp3",
      "success": false,
      "error": "Formato não suportado"
    }
  ]
}
```

## 📝 Exemplos de Uso

### Via cURL
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@/caminho/para/audio.mp3"
```

### Via Python
```python
import requests

with open("audio.mp3", "rb") as f:
    response = requests.post(
        "http://localhost:3000/api/transcribe",
        files={"audio": f}
    )
    print(response.json())
```

### Via JavaScript
```javascript
const formData = new FormData();
formData.append("audio", audioFile);

const response = await fetch("http://localhost:3000/api/transcribe", {
  method: "POST",
  body: formData
});

const data = await response.json();
console.log(data.text);
```

## 🛠️ Troubleshooting

### FFmpeg não encontrado
- Verifique a instalação: `ffmpeg -version`
- Adicione ao PATH do sistema

### Whisper não encontrado
- Verifique a instalação: `whisper-cpp --help`
- Pode ser necessário usar o caminho completo

### Modelo não encontrado
- Certifique-se de que o arquivo `.bin` está em `./models/`
- Verifique o nome do modelo

## 📦 Estrutura do Projeto

```text
mp3-transcriber-premium/
├── src/
│   ├── transcribe.ts      # Lógica de transcrição
│   └── server.ts          # Servidor Express
├── public/
│   ├── index.html         # Interface web
│   ├── style.css          # Estilos
│   └── app.js             # Lógica do frontend
├── models/
│   └── .gitkeep           # Colocar modelos .bin aqui
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 Licença

MIT
