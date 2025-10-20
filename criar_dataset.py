import os
import cv2
import numpy as np
import mediapipe as mp

DATA_DIR = './imagens'

data = []
labels = []

mp_hands = mp.solutions.hands

with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.3) as hands:

    for label in os.listdir(DATA_DIR):
        label_path = os.path.join(DATA_DIR, label)
        if not os.path.isdir(label_path):
            continue

        for img_name in os.listdir(label_path):
            img_path = os.path.join(label_path, img_name)
            img = cv2.imread(img_path)
            if img is None:
                continue

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = hands.process(img_rgb)

            if results.multi_hand_landmarks:
                hand_landmarks = results.multi_hand_landmarks[0]
                coords = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark], dtype=np.float32)

                # Normaliza cada imagem individualmente
                coords -= coords.min(axis=0)
                max_vals = coords.max(axis=0)
                max_vals[max_vals == 0] = 1
                coords /= max_vals

                data.append(coords.flatten())
                labels.append(label)

# Salva o dataset
np.savez('imagens.npz', data=np.array(data), labels=np.array(labels))
print(f"Dataset gerado com {len(data)} imagens e salvo em 'imagens.npz'.")