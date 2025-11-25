const video = document.getElementById('video-escrever');
const rotulo = document.getElementById('rotulo-predicao');
const confianca = document.getElementById('confianca-predicao');
const saidaTexto = document.getElementById('saida-texto');
const contador = document.getElementById('contador');
const progressRing = document.getElementById('progress-ring-circle');
const botaoApagar = document.getElementById('botao-apagar');
const botaoLimpar = document.getElementById('botao-limpar');

let contando = false;
let tempoInicial = null;
let letraAtual = null;

// configura círculo de contagem
const raio = 45;
const circunferencia = 2 * Math.PI * raio;
progressRing.style.strokeDasharray = circunferencia;
progressRing.style.strokeDashoffset = circunferencia;

function atualizarProgresso(percentual) {
  const offset = circunferencia - percentual * circunferencia;
  progressRing.style.strokeDashoffset = offset;
}

// insere texto na posição atual do cursor
function inserirNoCursor(textarea, texto) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const valorAtual = textarea.value;

  textarea.value = valorAtual.slice(0, start) + texto + valorAtual.slice(end);

  const novaPosicao = start + texto.length;
  textarea.setSelectionRange(novaPosicao, novaPosicao);
  textarea.focus();
}

// iniciar webcam
async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();
  } catch (error) {
    alert("Não foi possível acessar a câmera. Verifique as permissões.");
  }
}

// loop de captura -> envia frame para o backend
async function enviarFrame() {
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
    const letra = resultado.letra;
    const conf = resultado.confianca;

    // atualiza UI de predição
    if (letra) {
      rotulo.textContent = letra;
      confianca.textContent = (conf * 100).toFixed(1) + "%";
    } else {
      rotulo.textContent = "—";
      confianca.textContent = "—";
    }

    // lógica de estabilidade da letra
    if (letra && conf >= 0.5) {
      // se trocou a letra, reinicia contagem
      if (letra !== letraAtual) {
        letraAtual = letra;
        contando = false;
        atualizarProgresso(0);
        contador.textContent = 2;
      }

      // inicia contagem se ainda não começou
      if (!contando) {
        contando = true;
        tempoInicial = Date.now();
      }

      // progresso do cronômetro
      const tempoDecorrido = (Date.now() - tempoInicial) / 1000;
      const progresso = Math.min(tempoDecorrido / 2, 1);
      atualizarProgresso(progresso);

      const segundos = 2 - Math.floor(tempoDecorrido);
      contador.textContent = segundos > 0 ? segundos : 0;

      // finalizou 2s estáveis -> insere letra
      if (tempoDecorrido >= 2) {
        inserirNoCursor(saidaTexto, letra);
        contando = false;
        atualizarProgresso(0);
        contador.textContent = 2;
      }
    } else {
      // confiança caiu ou perdeu mão
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

// botão Backspace manual
botaoApagar.addEventListener('click', () => {
  const start = saidaTexto.selectionStart;
  const end = saidaTexto.selectionEnd;

  if (start === end && start > 0) {
    // apagar um caractere antes do cursor
    saidaTexto.value =
      saidaTexto.value.slice(0, start - 1) +
      saidaTexto.value.slice(end);
    saidaTexto.setSelectionRange(start - 1, start - 1);
  } else {
    // apagar seleção
    saidaTexto.value =
      saidaTexto.value.slice(0, start) +
      saidaTexto.value.slice(end);
    saidaTexto.setSelectionRange(start, start);
  }

  saidaTexto.focus();
});

// botão Limpar
botaoLimpar.addEventListener('click', () => {
  saidaTexto.value = "";
  saidaTexto.focus();
});

// mini botões (espaço, pontuação, tab, enter, etc.)
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

// bloqueio parcial do teclado
// - não deixa digitar letras/números
// - deixa navegar, apagar, tab, espaço, pontuação, enter
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

// inicializa tudo
iniciarCamera();
requestAnimationFrame(enviarFrame);
