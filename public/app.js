const dragDropArea = document.getElementById('drag-drop-area');
const audioInput = document.getElementById('audio-input');
const transcribeBtn = document.getElementById('transcribe-btn');
const batchBtn = document.getElementById('batch-btn');
const clearBtn = document.getElementById('clear-btn');
const modelSelect = document.getElementById('model-select');
const backendSelect = document.getElementById('backend-select');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const resultsSection = document.getElementById('results-section');
const resultText = document.getElementById('result-text');
const metadata = document.getElementById('metadata');
const downloadTxtBtn = document.getElementById('download-txt-btn');
const downloadJsonBtn = document.getElementById('download-json-btn');
const copyBtn = document.getElementById('copy-btn');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const batchResults = document.getElementById('batch-results');
const batchList = document.getElementById('batch-list');
const exportBatchBtn = document.getElementById('export-batch-btn');
const filesList = document.getElementById('files-list');
const filesItems = document.getElementById('files-items');

let selectedFiles = [];
let lastTranscription = '';
let batchResultsData = [];

let backendUrl = localStorage.getItem('backendUrl') || 'http://localhost:3000';

backendSelect.value = backendUrl;

dragDropArea.addEventListener('click', () => audioInput.click());

dragDropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dragDropArea.classList.add('dragover');
});

dragDropArea.addEventListener('dragleave', () => {
  dragDropArea.classList.remove('dragover');
});

dragDropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDropArea.classList.remove('dragover');

  const files = Array.from(e.dataTransfer.files);
  handleFileSelection(files);
});

audioInput.addEventListener('change', (e) => {
  handleFileSelection(Array.from(e.target.files));
});

function handleFileSelection(files) {
  selectedFiles = files.filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return ['mp3', 'wav', 'm4a', 'flac', 'mp4'].includes(ext);
  });

  if (selectedFiles.length === 0) {
    alert('Selecione arquivos válidos (MP3, WAV, M4A, FLAC, MP4 com áudio)');
    return;
  }

  updateFilesList();
}

function updateFilesList() {
  if (selectedFiles.length === 0) {
    filesList.style.display = 'none';
    return;
  }

  filesItems.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-tag">
      📄 ${f.name}
      <span class="remove" onclick="removeFile(${i})">✕</span>
    </div>
  `).join('');

  filesList.style.display = 'block';
}

window.removeFile = (index) => {
  selectedFiles.splice(index, 1);
  updateFilesList();
};

backendSelect.addEventListener('change', (e) => {
  backendUrl = e.target.value;
  localStorage.setItem('backendUrl', backendUrl);
  checkHealth();
  loadModels();
});

clearBtn.addEventListener('click', () => {
  selectedFiles = [];
  audioInput.value = '';
  updateFilesList();
  resultsSection.style.display = 'none';
  batchResults.style.display = 'none';
});

transcribeBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    alert('Selecione um arquivo de áudio ou vídeo MP4.');
    return;
  }
  await performTranscription([selectedFiles[0]]);
});

batchBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    alert('Selecione pelo menos um arquivo de áudio ou vídeo MP4.');
    return;
  }
  if (selectedFiles.length === 1) {
    await performTranscription(selectedFiles);
  } else {
    await performBatchTranscription(selectedFiles);
  }
});

async function checkHealth() {
  try {
    const response = await fetch(`${backendUrl}/health`);
    const data = await response.json();

    if (data.ffmpeg && data.whisper) {
      statusIndicator.className = 'status-dot ok';
      statusText.textContent = '✓ Sistema pronto (FFmpeg + Whisper detectados)';
    } else {
      statusIndicator.className = 'status-dot error';
      statusText.textContent = '⚠️ Ferramentas ausentes';
    }
  } catch {
    statusIndicator.className = 'status-dot error';
    statusText.textContent = `✗ Erro ao conectar em ${backendUrl}`;
  }
}

async function loadModels() {
  try {
    const response = await fetch(`${backendUrl}/api/models`);
    const data = await response.json();

    modelSelect.innerHTML = '';
    if (data.models.length === 0) {
      modelSelect.innerHTML = '<option value="default">Nenhum modelo encontrado</option>';
    } else {
      data.models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
    }
  } catch {
    modelSelect.innerHTML = '<option value="default">Erro ao carregar modelos</option>';
  }
}

function setProgress(percent) {
  progressFill.style.width = percent + '%';
  progressText.textContent = Math.round(percent) + '%';
}
function trackProgress(job) {
  const started = Date.now();
  let stage = 'Enviando arquivo...';
  let stopped = false;
  let polling = false;
  const timer = setInterval(async () => {
    const seconds = Math.floor((Date.now() - started) / 1000);
    loadingText.textContent = stage + ' • ' + Math.floor(seconds / 60) + 'min ' + (seconds % 60) + 's';
    if (backendUrl !== 'http://localhost:3000') {
      progressText.textContent = 'Processando • progresso indisponível neste backend';
      return;
    }
    if (polling) return;
    polling = true;
    try {
      const response = await fetch(backendUrl + '/api/progress/' + job);
      if (response.ok) {
        const data = await response.json();
        if (!stopped) { stage = data.stage; setProgress(data.percent); }
      }
    } catch {} finally { polling = false; }
  }, 1000);
  return () => { stopped = true; clearInterval(timer); };
}

async function performTranscription(files) {
  loading.style.display = 'flex';
  loadingText.textContent = 'Transcrevendo...';
  setProgress(0);
  const job = crypto.randomUUID();
  const stopProgress = trackProgress(job);
  resultsSection.style.display = 'none';
  batchResults.style.display = 'none';

  const file = files[0];
  const formData = new FormData();
  formData.append('audio', file);

  const model = modelSelect.value;
  if (model !== 'default') {
    formData.append('model', `./models/${model}`);
  }

  try {
    const response = await fetch(`${backendUrl}/api/transcribe?job=${job}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao transcrever');
    }

    lastTranscription = data.text;
    resultText.value = data.text;

    const metadataHTML = `
      <div class="metadata-item">
        <strong>Formato</strong>
        <span>${data.format || 'Desconhecido'}</span>
      </div>
      <div class="metadata-item">
        <strong>Caracteres</strong>
        <span>${data.characters || data.text.length}</span>
      </div>
      <div class="metadata-item">
        <strong>Palavras</strong>
        <span>${data.text.split(/\s+/).length}</span>
      </div>
      <div class="metadata-item">
        <strong>Data/Hora</strong>
        <span>${new Date().toLocaleString('pt-BR')}</span>
      </div>
    `;

    metadata.innerHTML = metadataHTML;
    stopProgress();
    setProgress(100);
    resultsSection.style.display = 'block';
  } catch (error) {
    alert(`Erro: ${error.message}`);
  } finally {
    stopProgress();
    setTimeout(() => {
      loading.style.display = 'none';
    }, 500);
  }
}

async function performBatchTranscription(files) {
  loading.style.display = 'flex';
  loadingText.textContent = `Transcrevendo lote (0/${files.length})...`;
  setProgress(0);
  const job = crypto.randomUUID();
  const stopProgress = trackProgress(job);
  resultsSection.style.display = 'none';
  batchResults.style.display = 'none';

  const formData = new FormData();
  files.forEach((file) => formData.append('audios', file));

  const model = modelSelect.value;
  if (model !== 'default') {
    formData.append('model', `./models/${model}`);
  }

  try {
    const response = await fetch(`${backendUrl}/api/batch-transcribe?job=${job}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao transcrever lote');
    }

    batchResultsData = data.results;
    batchList.innerHTML = data.results.map((result) => `
      <div class="batch-item ${result.error ? 'error' : ''}">
        <strong>📄 ${result.filename}</strong>
        ${result.success
          ? `<p class="success">✓ Sucesso</p>
             <p>Caracteres: ${result.text.length}</p>`
          : `<p class="error">✗ ${result.error}</p>`
        }
      </div>
    `).join('');

    stopProgress();
    setProgress(100);
    batchResults.style.display = 'block';
  } catch (error) {
    alert(`Erro: ${error.message}`);
  } finally {
    stopProgress();
    setTimeout(() => {
      loading.style.display = 'none';
    }, 500);
  }
}

downloadTxtBtn.addEventListener('click', () => {
  if (!lastTranscription) return;

  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(lastTranscription)
  );
  element.setAttribute('download', `transcricao_${new Date().getTime()}.txt`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
});

downloadJsonBtn.addEventListener('click', () => {
  if (!lastTranscription) return;

  const data = {
    text: lastTranscription,
    date: new Date().toISOString(),
    stats: {
      characters: lastTranscription.length,
      words: lastTranscription.split(/\s+/).length,
      lines: lastTranscription.split('\n').length
    }
  };

  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2))
  );
  element.setAttribute('download', `transcricao_${new Date().getTime()}.json`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
});

copyBtn.addEventListener('click', () => {
  resultText.select();
  document.execCommand('copy');
  copyBtn.textContent = '✓ Copiado!';
  setTimeout(() => {
    copyBtn.textContent = '📋 Copiar';
  }, 2000);
});

exportBatchBtn.addEventListener('click', () => {
  const data = {
    date: new Date().toISOString(),
    results: batchResultsData
  };

  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2))
  );
  element.setAttribute('download', `batch_${new Date().getTime()}.json`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
});

checkHealth();
loadModels();
setInterval(checkHealth, 30000);
