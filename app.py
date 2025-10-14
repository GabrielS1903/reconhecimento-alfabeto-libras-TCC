from flask import Flask, render_template, request, jsonify
import pickle
import cv2
import mediapipe as mp
import numpy as np
import base64

app = Flask(__name__)

# carrega o modelo e o codificador de rótulos
with open('model.p', 'rb') as arquivo_modelo:
    modelo = pickle.load(arquivo_modelo)

with open('label_encoder.p', 'rb') as arquivo_encoder:
    codificador_rotulos = pickle.load(arquivo_encoder)

# inicializa o MediaPipe para detecção de mãos
mp_maos = mp.solutions.hands
maos = mp_maos.Hands(
    static_image_mode=False, 
    max_num_hands=1, 
    min_detection_confidence=0.3
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/escrever')
def escrever():
    return render_template('escrever.html')

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')

# rota de predição (recebe imagem da câmera e devolve a letra prevista)
@app.route('/prever', methods=['POST'])
def prever():
    dados = request.get_json()
    imagem_codificada = dados.get('imagem')

    if not imagem_codificada:
        return jsonify({'letra': None, 'confianca': 0})

    # decodifica a imagem base64
    imagem_bytes = base64.b64decode(imagem_codificada.split(',')[1])
    np_array = np.frombuffer(imagem_bytes, np.uint8)
    quadro = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    quadro_rgb = cv2.cvtColor(quadro, cv2.COLOR_BGR2RGB)
    resultados = maos.process(quadro_rgb)

    if not resultados.multi_hand_landmarks:
        return jsonify({'letra': None, 'confianca': 0})

    # extrai as coordenadas da mão
    pontos_mao = resultados.multi_hand_landmarks[0]
    coordenadas = np.array([[p.x, p.y, p.z] for p in pontos_mao.landmark], dtype=np.float32)

    # normaliza as coordenadas
    coordenadas -= coordenadas.min(axis=0)
    valores_maximos = coordenadas.max(axis=0)
    valores_maximos[valores_maximos == 0] = 1
    coordenadas /= valores_maximos

    dados_mao = coordenadas.flatten().reshape(1, -1)

    # faz a predição
    previsao = modelo.predict(dados_mao)
    letra_prevista = codificador_rotulos.inverse_transform(previsao)[0]
    probabilidades = modelo.predict_proba(dados_mao)
    confianca = float(np.max(probabilidades))

    return jsonify({'letra': letra_prevista, 'confianca': confianca})


if __name__ == '__main__':
    app.run(debug=True)