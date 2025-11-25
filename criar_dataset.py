import os                
import cv2               
import numpy as np       
import mediapipe as mp   

# -------------------------------------------------------
# 1. Definição de variáveis e estruturas de dados
# -------------------------------------------------------

# Caminho principal onde estão armazenadas as imagens de cada letra
DATA_DIR = './imagens'

# Listas vazias que irão armazenar:
# - data: os vetores de características (landmarks normalizados da mão)
# - labels: os rótulos correspondentes (letras das pastas)
data = []
labels = []

# -------------------------------------------------------
# 2. Inicialização do módulo MediaPipe Hands
# -------------------------------------------------------

# Criação de um objeto para acesso às funcionalidades de detecção de mãos do MediaPipe
mp_hands = mp.solutions.hands

# Configuração do módulo Hands:
# - static_image_mode=True: processa imagens independentes
# - max_num_hands=1: considera apenas uma mão por imagem
# - min_detection_confidence=0.3: define a confiança mínima para considerar uma detecção válida
with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.3) as hands:

    # -------------------------------------------------------
    # 3. Leitura das pastas e imagens
    # -------------------------------------------------------

    # Percorre cada pasta dentro do diretório de imagens
    for label in os.listdir(DATA_DIR):
        label_path = os.path.join(DATA_DIR, label)
        
        if not os.path.isdir(label_path):
            continue

        # Percorre todas as imagens dentro da pasta da letra atual
        for img_name in os.listdir(label_path):
            img_path = os.path.join(label_path, img_name)

            # Lê a imagem com o OpenCV
            img = cv2.imread(img_path)

            if img is None:
                continue

            # -------------------------------------------------------
            # 4. Processamento da imagem e detecção da mão
            # -------------------------------------------------------

            # Converte a imagem de BGR (padrão do OpenCV) para RGB (padrão exigido pelo MediaPipe)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Processa a imagem com o modelo de detecção de mãos do MediaPipe
            results = hands.process(img_rgb)

            # -------------------------------------------------------
            # 5. Extração dos landmarks e normalização
            # -------------------------------------------------------

            # Verifica se há uma ou mais mãos detectadas
            if results.multi_hand_landmarks:
                # Seleciona a primeira mão detectada
                hand_landmarks = results.multi_hand_landmarks[0]

                # Cria um array contendo as coordenadas tridimensionais (x, y, z) de cada um dos 21 pontos da mão
                coords = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark], dtype=np.float32)

                # Normalização das coordenadas:
                # - Subtrai o menor valor em cada eixo, deslocando o conjunto para começar em 0
                coords -= coords.min(axis=0)

                # - Divide cada eixo pelo valor máximo encontrado, para que todas as dimensões fiquem entre 0 e 1
                max_vals = coords.max(axis=0)
                max_vals[max_vals == 0] = 1  # evita divisão por zero
                coords /= max_vals

                # -------------------------------------------------------
                # 6. Armazenamento dos dados e rótulos
                # -------------------------------------------------------

                # Achata o vetor (transforma 21x3 = 63 valores) e adiciona à lista de dados
                data.append(coords.flatten())

                # Adiciona o rótulo correspondente
                labels.append(label)

                # -------------------------------------------------------
                # 6.1 Adição da versão espelhada (simula a mão esquerda)
                # -------------------------------------------------------

                # Copia os landmarks normalizados
                coords_flip = coords.copy()

                # Espelha o eixo X (isso gera a geometria oposta da mão)
                coords_flip[:, 0] = 1.0 - coords_flip[:, 0]

                # Armazena a versão espelhada como se fosse outra imagem válida
                data.append(coords_flip.flatten())
                labels.append(label)

# -------------------------------------------------------
# 7. Salvamento do dataset em arquivo .npz
# -------------------------------------------------------

# Converte as listas em arrays NumPy e salva tudo em um arquivo compactado 'imagens.npz'
np.savez('imagens.npz', data=np.array(data), labels=np.array(labels))

# Exibe no terminal a quantidade total de imagens processadas e o nome do arquivo gerado
print(f"Dataset gerado com {len(data)} imagens e salvo em 'imagens.npz'.")
