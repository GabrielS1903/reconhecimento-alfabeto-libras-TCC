# Importação das bibliotecas necessárias
import pickle          
import cv2             
import mediapipe as mp 
import numpy as np     

# -------------------------------------------------------
# 1. Carregamento do modelo e do codificador
# -------------------------------------------------------

# Abre o arquivo contendo o modelo de classificação treinado (Random Forest)
with open('model.p', 'rb') as f:
    model = pickle.load(f)

# Abre o arquivo contendo o LabelEncoder (conversão número - letra)
with open('label_encoder.p', 'rb') as f:
    le = pickle.load(f)

# -------------------------------------------------------
# 2. Inicialização dos módulos do MediaPipe
# -------------------------------------------------------

mp_hands = mp.solutions.hands                   # Módulo de detecção de mãos
mp_drawing = mp.solutions.drawing_utils         # Utilitários de desenho
mp_drawing_styles = mp.solutions.drawing_styles # Estilos de desenho predefinidos

# Criação do objeto responsável por detectar as mãos no vídeo
# - static_image_mode=False -> processa frames contínuos (vídeo)
# - max_num_hands=1 -> reconhece apenas uma mão
# - min_detection_confidence=0.3 → nível mínimo de confiança para detectar
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1, min_detection_confidence=0.3)

# -------------------------------------------------------
# 3. Inicialização da captura de vídeo (webcam)
# -------------------------------------------------------

cap = cv2.VideoCapture(0)

# -------------------------------------------------------
# 4. Loop principal para processar cada frame da câmera
# -------------------------------------------------------

while True:
    ret, frame = cap.read()  # Captura o frame da webcam
    if not ret:
        break  # Encerra se não conseguir capturar imagem

    # Pega as dimensões do frame
    H, W, _ = frame.shape

    # Converte a imagem de BGR (OpenCV) para RGB (MediaPipe exige RGB)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Processa o frame para detectar landmarks da mão
    results = hands.process(frame_rgb)

    # Se houver detecção de uma mão:
    if results.multi_hand_landmarks:
        # Pega a primeira mão detectada
        hand_landmarks = results.multi_hand_landmarks[0]

        # Desenha os pontos da mão e suas conexões na imagem
        mp_drawing.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS,
            mp_drawing_styles.get_default_hand_landmarks_style(),
            mp_drawing_styles.get_default_hand_connections_style()
        )

        # -------------------------------------------------------
        # 5. Extração e normalização das coordenadas da mão
        # -------------------------------------------------------

        # Extrai as coordenadas (x, y, z) dos 21 pontos da mão
        coords = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark], dtype=np.float32)

        # Normaliza as coordenadas para eliminar diferenças de escala e posição
        coords -= coords.min(axis=0)
        max_vals = coords.max(axis=0)
        max_vals[max_vals == 0] = 1  # Evita divisão por zero
        coords /= max_vals

        # Achata o vetor (transforma 21x3 → 63 valores) e ajusta para o formato do modelo
        data_aux = coords.flatten().reshape(1, -1)

        # -------------------------------------------------------
        # 6. Predição da letra utilizando o modelo treinado
        # -------------------------------------------------------

        # Realiza a predição (retorna o número da classe)
        prediction = model.predict(data_aux)

        # Converte o número da classe de volta para a letra correspondente
        predicted_character = le.inverse_transform(prediction)[0]

        # -------------------------------------------------------
        # 7. Exibição do resultado na tela
        # -------------------------------------------------------

        # Calcula a posição da caixa que envolve a mão
        x_coords = [lm.x for lm in hand_landmarks.landmark]
        y_coords = [lm.y for lm in hand_landmarks.landmark]
        x1, y1 = int(min(x_coords) * W) - 10, int(min(y_coords) * H) - 10
        x2, y2 = int(max(x_coords) * W) + 10, int(max(y_coords) * H) + 10

        # Desenha um retângulo em volta da mão
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 3)

        # Escreve a letra reconhecida acima do retângulo
        cv2.putText(frame, predicted_character, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3, cv2.LINE_AA)

    # Mostra o frame processado em uma janela
    cv2.imshow('Reconhecimento Libras', frame)

    # ESC para encerrar o programa
    if cv2.waitKey(1) & 0xFF == 27:
        break

# -------------------------------------------------------
# 8. Liberação de recursos
# -------------------------------------------------------

cap.release()            # Encerra a captura da câmera
cv2.destroyAllWindows()  # Fecha todas as janelas do OpenCV
hands.close()            # Libera o objeto de detecção de mãos
