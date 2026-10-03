import os
import subprocess
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv('PORT', 5000))
MODEL_PATH = os.getenv('MODEL_PATH', './models/ggml-base.bin')
MODELS_DIR = './models'
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a', 'flac'}

Path(UPLOAD_FOLDER).mkdir(exist_ok=True)
Path(MODELS_DIR).mkdir(exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def check_tool(tool_name):
    try:
        command = [tool_name, '--version'] if tool_name == 'ffmpeg' else [tool_name, '--help']
        subprocess.run(command, capture_output=True, check=True, timeout=5)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_available_models():
    try:
        models = [f for f in os.listdir(MODELS_DIR) if f.endswith('.bin')]
        return sorted(models)
    except FileNotFoundError:
        return []

def transcribe_audio(input_path, model_path):
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            wav_path = os.path.join(temp_dir, 'audio.wav')
            output_base = os.path.join(temp_dir, 'transcription')

            subprocess.run([
                'ffmpeg', '-y', '-i', input_path,
                '-ac', '1', '-ar', '16000',
                wav_path
            ], capture_output=True, check=True, timeout=300)

            subprocess.run([
                'whisper-cpp', '-m', model_path, '-f', wav_path,
                '-otxt', '-of', output_base
            ], capture_output=True, check=True, timeout=600)

            txt_path = f'{output_base}.txt'
            if os.path.exists(txt_path):
                with open(txt_path, 'r', encoding='utf-8') as f:
                    text = f.read().strip()
                return {'success': True, 'text': text}
            return {'success': False, 'error': 'Arquivo de transcrição não gerado'}
    except subprocess.CalledProcessError as e:
        return {'success': False, 'error': f'Erro ao processar: {str(e)}'}
    except Exception as e:
        return {'success': False, 'error': f'Erro inesperado: {str(e)}'}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'ok': True,
        'ffmpeg': check_tool('ffmpeg'),
        'whisper': check_tool('whisper-cpp')
    })

@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify({'models': get_available_models()})

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'Arquivo de áudio não enviado'}), 400

        file = request.files['audio']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': f'Formato não suportado. Use: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        model_path = request.form.get('model', MODEL_PATH)
        result = transcribe_audio(filepath, model_path)

        try:
            os.remove(filepath)
        except Exception:
            pass

        if not result['success']:
            return jsonify({'error': result['error']}), 500

        return jsonify({
            'success': True,
            'text': result['text'],
            'format': filename.rsplit('.', 1)[1].upper(),
            'characters': len(result['text'])
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao transcrever: {str(e)}'}), 500

@app.route('/api/batch-transcribe', methods=['POST'])
def batch_transcribe():
    try:
        if 'audios' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400

        files = request.files.getlist('audios')
        if not files:
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400

        results = []
        model_path = request.form.get('model', MODEL_PATH)

        for file in files:
            if file.filename == '':
                continue

            if not allowed_file(file.filename):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'Formato não suportado'
                })
                continue

            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

            result = transcribe_audio(filepath, model_path)

            try:
                os.remove(filepath)
            except Exception:
                pass

            results.append({
                'filename': file.filename,
                'success': result['success'],
                'text': result.get('text'),
                'error': result.get('error')
            })

        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': f'Erro no lote: {str(e)}'}), 500

if __name__ == '__main__':
    print(f'🎙️  Servidor Python rodando em http://localhost:{PORT}')
    print(f'📁 Pasta de modelos: {os.path.abspath(MODELS_DIR)}')
    app.run(debug=True, port=PORT)
