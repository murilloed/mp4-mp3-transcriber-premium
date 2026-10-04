# Backend em Python

Backend alternativo usando Flask em vez de Node.js/Express.

## Instalação

```bash
cd python-backend
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# ou
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

## Rodar

```bash
python app.py
```

O servidor estará em `http://localhost:5000`

## API Endpoints

Os endpoints são os mesmos do backend Node.js:

- `GET /health` - Verificar status
- `GET /api/models` - Listar modelos
- `POST /api/transcribe` - Transcrever arquivo único
- `POST /api/batch-transcribe` - Transcrever lote


Formatos aceitos: MP3, WAV, M4A, FLAC e MP4. Para vídeos MP4, o FFmpeg extrai a primeira faixa de áudio antes de enviá-la ao Whisper. O vídeo deve conter áudio.

Configure um `.env` próprio neste diretório a partir de `.env.example`, com `PORT=5000`, `MODEL_PATH` apontando ao modelo e `WHISPER_PATH` apontando ao executável Whisper. Instale FFmpeg no PATH. Se compartilhar o modelo do backend Node.js, use `MODEL_PATH=../models/ggml-base.bin`. A pasta usada por `/api/models` é `python-backend/models/`; para selecionar modelos pela interface, coloque os arquivos nessa pasta. O backend Python não fornece percentual de progresso e limita a transcrição a 600 segundos por arquivo.
