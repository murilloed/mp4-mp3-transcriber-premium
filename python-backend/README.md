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
