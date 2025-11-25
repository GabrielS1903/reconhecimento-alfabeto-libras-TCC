const video = document.getElementById('video-quiz');
const rotulo = document.getElementById('rotulo-quiz');
const confiancaEl = document.getElementById('confianca-quiz');
const contadorEl = document.getElementById('contador-quiz');
const progressRing = document.getElementById('progress-ring-circle');
const mensagemQuiz = document.getElementById('mensagem-quiz');
const letraAlvoEl = document.getElementById('letra-alvo');
const progressoQuizEl = document.getElementById('progresso-quiz');
const cardVideo = document.querySelector('.card');
const modalFinal = document.getElementById('modal-final');
const btnReiniciar = document.getElementById('btn-reiniciar');
const canvas = document.getElementById('canvas-landmarks-quiz');
const ctx = canvas.getContext('2d');

let alfabeto = ['A', 'B', 'C', 'D', 'E',
                'F', 'G', 'I', 'L', 'M',
                'N', 'O', 'P', 'Q', 'R',
                'S', 'T', 'U', 'V', 'W'];

let letrasRestantes = [];
let letraAtual = null;
let contando = false;
let tempoInicial = null;
let terminou = false;

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

function embaralharLetras() {
  letrasRestantes = [...alfabeto];
  for (let i = letrasRestantes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letrasRestantes[i], letrasRestantes[j]] = [letrasRestantes[j], letrasRestantes[i]];
  }
}

function proximaLetra() {
  if (letrasRestantes.length === 0) {
    terminou = true;
    letraAtual = null;
    progressoQuizEl.textContent = `${alfabeto.length} / ${alfabeto.length}`;
    modalFinal.classList.remove('d-none');
    return;
  }

  letraAtual = letrasRestantes.pop();
  letraAlvoEl.textContent = letraAtual;
  progressoQuizEl.textContent = `${alfabeto.length - letrasRestantes.length} / ${alfabeto.length}`;
  mensagemQuiz.textContent = "";
  atualizarProgresso(0);
  contadorEl.textContent = "2";
  contando = false;
  tempoInicial = null;
}

function aplicarFlash(tipo) {
  if (tipo === 'correto') {
    cardVideo.classList.add('flash-verde');
  } else if (tipo === 'errado') {
    cardVideo.classList.add('flash-vermelho');
  }

  setTimeout(() => {
    cardVideo.classList.remove('flash-verde', 'flash-vermelho');
  }, 400);
}

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
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
  if (terminou) return;

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
    const letraPredita = resultado.letra ? resultado.letra.toUpperCase() : null;
    const confianca = resultado.confianca;
    const landmarks = resultado.landmarks || [];

    desenharLandmarks(landmarks);

    if (letraPredita) {
      rotulo.textContent = letraPredita;
      confiancaEl.textContent = (confianca * 100).toFixed(1) + "%";
    } else {
      rotulo.textContent = "—";
      confiancaEl.textContent = "—";
    }

    if (!contando) {
      contando = true;
      tempoInicial = Date.now();
    }

    const tempoDecorrido = (Date.now() - tempoInicial) / 1000;
    const progresso = Math.min(tempoDecorrido / 2, 1);
    atualizarProgresso(progresso);

    const segundos = 2 - Math.floor(tempoDecorrido);
    contadorEl.textContent = segundos > 0 ? segundos : 0;

    if (letraPredita !== rotulo.dataset.ultimaLetra || confianca < 0.4) {
      rotulo.dataset.ultimaLetra = letraPredita;
      tempoInicial = Date.now();
      atualizarProgresso(0);
      contadorEl.textContent = "2";
    }

    if (tempoDecorrido >= 2) {
      if (letraPredita === letraAtual && confianca >= 0.4) {
        aplicarFlash('correto');
        setTimeout(proximaLetra, 700);
      } else {
        aplicarFlash('errado');
        tempoInicial = Date.now();
        atualizarProgresso(0);
        contadorEl.textContent = "2";
      }
      contando = false;
    }

  } catch (error) {
    console.error("Erro ao enviar frame:", error);
  }

  requestAnimationFrame(enviarFrame);
}

embaralharLetras();
proximaLetra();
iniciarCamera();
requestAnimationFrame(enviarFrame);

btnReiniciar.addEventListener('click', () => {
  modalFinal.classList.add('d-none');
  embaralharLetras();
  terminou = false;
  proximaLetra();
  requestAnimationFrame(enviarFrame);
});
