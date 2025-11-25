// ======== Elementos da interface ========
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

// ======== Variáveis de controle ========
let alfabeto = ['A', 'B', 'C', 'D', 'E', 
                'F', 'G', 'I', 'L', 'M',
                'N', 'O', 'P', 'Q', 'R',
                'S', 'T', 'U', 'V', 'W'];
let letrasRestantes = [];
let letraAtual = null;
let contando = false;
let tempoInicial = null;
let terminou = false;

// ======== Círculo ========
const raio = 45;
const circunferencia = 2 * Math.PI * raio;
progressRing.style.strokeDasharray = circunferencia;
progressRing.style.strokeDashoffset = circunferencia;

function atualizarProgresso(percentual) {
  const offset = circunferencia - percentual * circunferencia;
  progressRing.style.strokeDashoffset = offset;
}

// ======== Embaralhar letras ========
function embaralharLetras() {
  letrasRestantes = [...alfabeto];
  for (let i = letrasRestantes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letrasRestantes[i], letrasRestantes[j]] = [letrasRestantes[j], letrasRestantes[i]];
  }
}

// ======== Próxima letra ========
function proximaLetra() {
  if (letrasRestantes.length === 0) {
    terminou = true;
    letraAtual = null;
    progressoQuizEl.textContent = `${alfabeto.length} / ${alfabeto.length}`;

    // Exibe modal de finalização
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

// ======== Feedback visual rápido ========
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

// ======== Câmera ========
async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();
  } catch (error) {
    alert("Não foi possível acessar a câmera. Verifique as permissões.");
  }
}

// ======== Captura contínua ========
async function enviarFrame() {
  if (terminou) return;

  if (!video.videoWidth || !video.videoHeight) {
    setTimeout(enviarFrame, 200);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg');

  try {
    const resposta = await fetch('/prever', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagem: dataUrl })
    });

    const resultado = await resposta.json();
    const letraPredita = resultado.letra ? resultado.letra.toUpperCase() : null;
    const confianca = resultado.confianca;

    // Atualiza rótulo visual
    if (letraPredita) {
      rotulo.textContent = letraPredita;
      confiancaEl.textContent = (confianca * 100).toFixed(1) + "%";
    } else {
      rotulo.textContent = "—";
      confiancaEl.textContent = "—";
    }

    // ======== Lógica central ========
    if (!contando) {
      contando = true;
      tempoInicial = Date.now();
    }

    const tempoDecorrido = (Date.now() - tempoInicial) / 1000;
    const progresso = Math.min(tempoDecorrido / 2, 1);
    atualizarProgresso(progresso);

    const segundos = 2 - Math.floor(tempoDecorrido);
    contadorEl.textContent = segundos > 0 ? segundos : 0;

    // Reinicia contagem se a letra mudar ou confiança cair
    if (letraPredita !== rotulo.dataset.ultimaLetra || confianca < 0.5) {
      rotulo.dataset.ultimaLetra = letraPredita;
      tempoInicial = Date.now();
      atualizarProgresso(0);
      contadorEl.textContent = "20";
    }

    // Validação só após 2 segundos
    if (tempoDecorrido >= 2) {
      if (letraPredita === letraAtual && confianca >= 0.5) {
        aplicarFlash('correto');
        setTimeout(proximaLetra, 700);
      } else {
        aplicarFlash('errado');
        tempoInicial = Date.now();
        atualizarProgresso(0);
        contadorEl.textContent = "20";
      }
      contando = false;
    }

  } catch (error) {
    console.error("Erro ao enviar frame:", error);
  }

  requestAnimationFrame(enviarFrame);
}

// ======== Inicialização ========
embaralharLetras();
proximaLetra();
iniciarCamera();
requestAnimationFrame(enviarFrame);

// ======== Botão de reiniciar ========
btnReiniciar.addEventListener('click', () => {
  modalFinal.classList.add('d-none');
  embaralharLetras();
  terminou = false;
  proximaLetra();
  requestAnimationFrame(enviarFrame);
});
