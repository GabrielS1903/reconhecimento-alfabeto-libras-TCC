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
let segundosRestantes = 3;
let letraAtual = null;

// configura o círculo
const raio = 45;
const circunferencia = 2 * Math.PI * raio;
progressRing.style.strokeDasharray = circunferencia;
progressRing.style.strokeDashoffset = circunferencia;

function atualizarProgresso(percentual) {
  const offset = circunferencia - percentual * circunferencia;
  progressRing.style.strokeDashoffset = offset;
}

// inicia câmera
async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();
  } catch (error) {
    alert("Não foi possível acessar a câmera. Verifique as permissões.");
  }
}

// loop contínuo de captura
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
    const resposta = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });

    const resultado = await resposta.json();
    const letra = resultado.letra;
    const conf = resultado.confianca;

    // Atualiza visual
    if (letra) {
      rotulo.textContent = letra;
      confianca.textContent = (conf * 100).toFixed(1) + "%";
    } else {
      rotulo.textContent = "—";
      confianca.textContent = "—";
    }

    // lógica de contagem com estabilidade 
    if (letra && conf >= 0.8) {
      // se mudou a letra, reinicia contagem
      if (letra !== letraAtual) {
        letraAtual = letra;
        contando = false;
        atualizarProgresso(0);
        contador.textContent = 3;
      }

      // se não está contando ainda, inicia agora
      if (!contando) {
        contando = true;
        tempoInicial = Date.now();
      }

      // atualiza progresso contínuo
      const tempoDecorrido = (Date.now() - tempoInicial) / 1000;
      const progresso = Math.min(tempoDecorrido / 3, 1);
      atualizarProgresso(progresso);

      const segundos = 3 - Math.floor(tempoDecorrido);
      contador.textContent = segundos > 0 ? segundos : 0;

      // se completou 3 segundos mantendo a mesma letra
      if (tempoDecorrido >= 3) {
        saidaTexto.value += letra;
        contando = false;
        atualizarProgresso(0);
        contador.textContent = 3;
      }
    } else {
      // Se confiança caiu ou não tem letra, reseta tudo
      contando = false;
      letraAtual = null;
      atualizarProgresso(0);
      contador.textContent = 3;
    }
  } catch (error) {
    console.error("Erro ao enviar frame:", error);
  }

  requestAnimationFrame(enviarFrame);
}

// botões 
botaoApagar.addEventListener('click', () => {
  saidaTexto.value = saidaTexto.value.slice(0, -1);
});
botaoLimpar.addEventListener('click', () => {
  saidaTexto.value = "";
});

// inicialização
iniciarCamera();
requestAnimationFrame(enviarFrame);
