const video = document.getElementById('video-escrever');
const rotulo = document.getElementById('rotulo-predicao');
const confianca = document.getElementById('confianca-predicao');
const saidaTexto = document.getElementById('saida-texto');
const contador = document.getElementById('contador');
const progressRing = document.getElementById('progress-ring-circle');
const botaoApagar = document.getElementById('botao-apagar');
const botaoLimpar = document.getElementById('botao-limpar');
const canvas = document.getElementById('canvas-landmarks-escrever');
const ctx = canvas.getContext('2d');

let contando = false;
let tempoInicial = null;
let letraAtual = null;

const raio = 45;
const circunferencia = 2 * Math.PI * raio;
progressRing.style.strokeDasharray = circunferencia;
progressRing.style.strokeDashoffset = circunferencia;

const conexoesMao = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20]
];

function atualizarProgresso(percentual) {
  const offset = circunferencia - percentual * circunferencia;
  progressRing.style.strokeDashoffset = offset;
}

function inserirNoCursor(textarea, texto) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const valorAtual = textarea.value;
  textarea.value = valorAtual.slice(0, start) + texto + valorAtual.slice(end);
  const novaPosicao = start + texto.length;
  textarea.setSelectionRange(novaPosicao, novaPosicao);
  textarea.focus();
}

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };
  } catch (error) {
    alert("Não foi possível acessar a câmera. Verifique as permissões.");
  }
}

function desenharLandmarks(landmarks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!landmarks || landmarks.length === 0) {
    return;
  }

  const coresDedos = {
    pulso: "#FFFFFF",
    polegar: "#FF0000",
    indicador: "#FFA500",
    medio: "#FFFF00",
    anelar: "#00FF00",
    mindinho: "#00FFFF"
  };

  const dedos = {
    pulso: [0],
    polegar: [1, 2, 3, 4],
    indicador: [5, 6, 7, 8],
    medio: [9, 10, 11, 12],
    anelar: [13, 14, 15, 16],
    mindinho: [17, 18, 19, 20]
  };

  function corDoLandmark(index) {
    if (dedos.pulso.includes(index)) return coresDedos.pulso;
    if (dedos.polegar.includes(index)) return coresDedos.polegar;
    if (dedos.indicador.includes(index)) return coresDedos.indicador;
    if (dedos.medio.includes(index)) return coresDedos.medio;
    if (dedos.anelar.includes(index)) return coresDedos.anelar;
    if (dedos.mindinho.includes(index)) return coresDedos.mindinho;
    return "#FFFFFF";
  }

  conexoesMao.forEach(([a, b]) => {
    const la = landmarks[a];
    const lb = landmarks[b];
    const x1 = la.x * canvas.width;
    const y1 = la.y * canvas.height;
    const x2 = lb.x * canvas.width;
    const y2 = lb.y * canvas.height;
    const cor = corDoLandmark(a);
    ctx.strokeStyle = cor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  landmarks.forEach((l, idx) => {
    const x = l.x * canvas.width;
    const y = l.y * canvas.height;
    ctx.fillStyle = corDoLandmark(idx);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

async function enviarFrame() {
  if (!video.videoWidth || !video.videoHeight) {
    setTimeout(enviarFrame, 200);
    return;
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = video.videoWidth;
  offCanvas.height = video.videoHeight;
  const offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(video, 0, 0);

  const dataUrl = offCanvas.toDataURL('image/jpeg');

  try {
    const resposta = await fetch('/prever', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagem: dataUrl })
    });

    const resultado = await resposta.json();
    const letra = resultado.letra;
    const conf = resultado.confianca;
    const landmarks = resultado.landmarks || [];

    desenharLandmarks(landmarks);

    if (letra) {
      rotulo.textContent = letra;
      confianca.textContent = (conf * 100).toFixed(1) + "%";
    } else {
      rotulo.textContent = "—";
      confianca.textContent = "—";
    }

    if (letra && conf >= 0.4) {
      if (letra !== letraAtual) {
        letraAtual = letra;
        contando = false;
        atualizarProgresso(0);
        contador.textContent = 2;
      }

      if (!contando) {
        contando = true;
        tempoInicial = Date.now();
      }

      const tempoDecorrido = (Date.now() - tempoInicial) / 1000;
      const progresso = Math.min(tempoDecorrido / 2, 1);
      atualizarProgresso(progresso);

      const segundos = 2 - Math.floor(tempoDecorrido);
      contador.textContent = segundos > 0 ? segundos : 0;

      if (tempoDecorrido >= 2) {
        inserirNoCursor(saidaTexto, letra);
        contando = false;
        atualizarProgresso(0);
        contador.textContent = 2;
      }
    } else {
      contando = false;
      letraAtual = null;
      atualizarProgresso(0);
      contador.textContent = 2;
    }
  } catch (error) {
    console.error("Erro ao enviar frame:", error);
  }

  requestAnimationFrame(enviarFrame);
}

botaoApagar.addEventListener('click', () => {
  const start = saidaTexto.selectionStart;
  const end = saidaTexto.selectionEnd;

  if (start === end && start > 0) {
    saidaTexto.value =
      saidaTexto.value.slice(0, start - 1) +
      saidaTexto.value.slice(end);
    saidaTexto.setSelectionRange(start - 1, start - 1);
  } else {
    saidaTexto.value =
      saidaTexto.value.slice(0, start) +
      saidaTexto.value.slice(end);
    saidaTexto.setSelectionRange(start, start);
  }

  saidaTexto.focus();
});

botaoLimpar.addEventListener('click', () => {
  saidaTexto.value = "";
  saidaTexto.focus();
});

document.querySelectorAll('.botao-mini').forEach(botao => {
  botao.addEventListener('click', () => {
    const simbolo = botao.getAttribute('data-simbolo');
    if (simbolo === "\\n") {
      inserirNoCursor(saidaTexto, "\n");
    } else if (simbolo === "\\t") {
      inserirNoCursor(saidaTexto, "\t");
    } else {
      inserirNoCursor(saidaTexto, simbolo);
    }
  });
});

saidaTexto.addEventListener('keydown', (evento) => {
  const teclasPermitidas = [
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Shift", "Control", "Alt", "Meta", "Escape", "Backspace",
    "Delete", "Enter", "Tab",
    " ", ".", ",", ";", "?", "!", ":", "'", '"', "-",
  ];

  if (!teclasPermitidas.includes(evento.key)) {
    evento.preventDefault();
  }
});

iniciarCamera();
requestAnimationFrame(enviarFrame);
