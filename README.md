# 🎙️ Transcritor Premium

API REST e interface web para transcrever áudio e vídeos MP4 localmente usando FFmpeg e Whisper C++.

## ✨ Features

- ✅ Suporte para MP3, WAV, M4A, FLAC e MP4 com áudio
- ✅ Interface web com seleção de arquivos e arrastar e soltar
- ✅ Transcrição em lote de até 10 arquivos no backend Node.js
- ✅ Progresso da transcrição e tempo decorrido no backend Node.js
- ✅ Download em TXT e JSON, cópia do texto e exportação de lotes
- ✅ Seleção dos modelos disponíveis na pasta `models`
- ✅ Detecção automática do idioma no backend Node.js
- ✅ Backend principal Node.js/Express e alternativa Python/Flask
- ✅ Transcrição local: os arquivos não são enviados a serviços externos
- ✅ Funciona offline após instalar dependências, ferramentas e modelo

## 📋 Pré-requisitos

- Node.js 20 ou superior e npm para o backend principal.
- FFmpeg instalado e disponível no PATH.
- Whisper C++ instalado, incluindo o executável de linha de comando.
- Um modelo Whisper em formato GGML (`.bin`). Para português, use um modelo multilíngue, como `ggml-base.bin`, sem o sufixo `.en`.

### Windows

1. Instale o [FFmpeg](https://ffmpeg.org/download.html) e adicione sua pasta `bin` ao PATH.
2. Baixe uma distribuição compatível na página de [releases do Whisper C++](https://github.com/ggml-org/whisper.cpp/releases).
3. Extraia o pacote, mantendo `whisper-cli.exe` junto às DLLs da distribuição.
4. Configure `WHISPER_PATH` no `.env` com o caminho completo do executável.

```dotenv
PORT=3000
MODEL_PATH=./models/ggml-base.bin
WHISPER_PATH=C:/ferramentas/whisper/Release/whisper-cli.exe
```

Use barras `/` nos caminhos do `.env`. A instalação local pode ficar em `tools/whisper/`, mas executáveis, DLLs e modelos não são distribuídos neste repositório.

### macOS

```bash
brew install ffmpeg
brew install whisper-cpp
```

Configure `WHISPER_PATH` conforme o nome ou caminho do executável instalado (`whisper-cli` ou `whisper-cpp`).

### Linux

Instale o FFmpeg e compile o Whisper C++ seguindo as [instruções oficiais](https://github.com/ggml-org/whisper.cpp#quick-start):

```bash
sudo apt-get install ffmpeg cmake build-essential
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build -j --config Release
```

Configure `WHISPER_PATH` com o caminho absoluto de `build/bin/whisper-cli`.

## 🚀 Instalação

```bash
git clone https://github.com/murilloed/mp3-transcriber-premium.git
cd mp3-transcriber-premium
npm ci
```

Copie o arquivo de configuração:

```bash
# Linux/macOS
cp .env.example .env
```

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

Edite o `.env` para configurar o Whisper. Se o comando `whisper-cpp` já estiver no PATH, o valor padrão funciona.

Baixe o modelo multilíngue base do [repositório de modelos do Whisper C++](https://huggingface.co/ggerganov/whisper.cpp):

```bash
# Linux/macOS
mkdir -p models
curl -L --fail -o models/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

```powershell
# Windows (PowerShell)
New-Item -ItemType Directory -Force models | Out-Null
curl.exe -L --fail -o models/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
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

Acesse `http://localhost:3000`. Reinicie o servidor após mudar o `.env`. Em desenvolvimento, alterações no código reiniciam o processo e podem interromper transcrições em andamento.

### Backend Python alternativo

Consulte [python-backend/README.md](python-backend/README.md). A interface permite escolher o backend Python na porta 5000. Nesse backend, o percentual de progresso não está disponível; a interface mostra o tempo decorrido. A transcrição Python possui limite de 600 segundos por arquivo.

## 🎬 Transcrever MP4

Selecione ou arraste o vídeo na interface. O FFmpeg extrai a primeira faixa de áudio e gera WAV mono, PCM de 16 bits e 16 kHz para o Whisper. Vídeos sem faixa de áudio não podem ser transcritos. MP4 funciona tanto individualmente quanto em lote.

## 🔗 API Endpoints

### Verificar ferramentas

`GET /health` retorna o status de FFmpeg e Whisper. Esse endpoint verifica os executáveis; a existência do modelo é validada ao transcrever.

### Listar modelos

`GET /api/models` retorna os nomes dos arquivos `.bin` da pasta `models`.

### Transcrever arquivo único

`POST /api/transcribe`, com `Content-Type: multipart/form-data`:

- `audio`: arquivo MP3, WAV, M4A, FLAC ou MP4.
- `model`: caminho opcional do modelo; padrão definido em `MODEL_PATH`.
- `job`: identificador opcional na query string para consultar progresso no backend Node.js.

```json
{
  "success": true,
  "text": "Transcrição do áudio...",
  "duration": 2500,
  "format": "MP4",
  "timestamp": "2026-10-03T21:00:00.000Z"
}
```

`duration` é o tempo de processamento em milissegundos, não a duração do arquivo.

### Transcrever lote

`POST /api/batch-transcribe`, com `multipart/form-data`. Envie cada arquivo no campo `audios` e, opcionalmente, `model`. No backend Node.js, são aceitos até 10 arquivos, processados sequencialmente. O parâmetro `job` também está disponível.

```json
{
  "results": [
    { "filename": "video.mp4", "success": true, "text": "...", "duration": 1500 },
    { "filename": "arquivo.txt", "success": false, "error": "Formato não suportado" }
  ]
}
```

### Consultar progresso (Node.js)

Envie `POST /api/transcribe?job=meu-id` ou `POST /api/batch-transcribe?job=meu-id` e consulte `GET /api/progress/meu-id` enquanto o POST estiver em andamento:

```json
{ "percent": 52, "stage": "Transcrevendo áudio...", "updatedAt": 1791061200000 }
```

O POST mantém a conexão aberta até retornar o resultado. O progresso usa os eventos do Whisper e pode avançar em saltos. Durante upload e extração, o percentual pode ficar em 0%. No lote, ele combina o progresso dos arquivos. Os registros ficam em memória e não sobrevivem a reinícios.

## 📝 Exemplos de uso

### cURL

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@/caminho/para/video.mp4"
```

No PowerShell, use `curl.exe` e execute o comando em uma linha.

### Python

```python
import requests

with open("video.mp4", "rb") as arquivo:
    response = requests.post(
        "http://localhost:3000/api/transcribe",
        files={"audio": arquivo},
    )
    response.raise_for_status()
    print(response.json()["text"])
```

### JavaScript

```javascript
const formData = new FormData();
formData.append("audio", arquivoSelecionado);
const response = await fetch("http://localhost:3000/api/transcribe", {
  method: "POST",
  body: formData,
});
const data = await response.json();
if (!response.ok) throw new Error(data.error);
console.log(data.text);
```

## 🛠️ Troubleshooting

### FFmpeg não encontrado

Verifique `ffmpeg -version` e adicione o executável ao PATH. Reinicie o terminal e o servidor após alterar o PATH.

### Whisper não encontrado

Verifique o caminho em `WHISPER_PATH`. No Windows, teste o executável diretamente:

```powershell
& "C:/ferramentas/whisper/Release/whisper-cli.exe" --help
```

Mantenha as DLLs ao lado do executável e reinicie o servidor após atualizar o `.env`.

### Modelo não encontrado

Coloque o `.bin` em `models/` e confira `MODEL_PATH`. Os modelos precisam ser baixados separadamente.

### Transcrição demorada ou percentual parado

O tempo depende da duração do áudio, do modelo e do hardware. Arquivos de várias horas podem levar bastante tempo na CPU. O indicador mostra a etapa, o tempo decorrido e os eventos de progresso do Whisper; os eventos não são contínuos. Após atualizar a interface, use `Ctrl+F5` para carregar o JavaScript atualizado.

### Vídeo sem áudio

O MP4 deve conter pelo menos uma faixa de áudio. O projeto transcreve a fala dessa faixa; não faz leitura de texto ou imagens do vídeo.

## 📦 Estrutura do projeto

```text
mp3-transcriber-premium/
├── src/
│   ├── transcribe.ts        # Conversão e transcrição
│   └── server.ts            # API Express e consulta de progresso
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js               # Upload, progresso e exportação
├── python-backend/         # Alternativa Flask
├── models/                 # Modelos .bin baixados separadamente
├── .env.example
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## 📄 Licença

MIT
