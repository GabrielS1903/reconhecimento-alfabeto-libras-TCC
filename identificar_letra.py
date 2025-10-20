import pickle
import cv2
import mediapipe as mp
import numpy as np

# Carrega modelo e LabelEncoder
with open('model.p', 'rb') as f:
    model = pickle.load(f)

with open('label_encoder.p', 'rb') as f:
    le = pickle.load(f)

# Inicializa MediaPipe
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1, min_detection_confidence=0.3)

# Inicializa câmera
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    H, W, _ = frame.shape
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(frame_rgb)

    if results.multi_hand_landmarks:
        hand_landmarks = results.multi_hand_landmarks[0]

        # Desenha os landmarks
        mp_drawing.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS,
            mp_drawing_styles.get_default_hand_landmarks_style(),
            mp_drawing_styles.get_default_hand_connections_style()
        )

        # Extrai coordenadas
        coords = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark], dtype=np.float32)
        coords -= coords.min(axis=0)
        max_vals = coords.max(axis=0)
        max_vals[max_vals == 0] = 1
        coords /= max_vals
        data_aux = coords.flatten().reshape(1, -1)

        # Predição
        prediction = model.predict(data_aux)
        predicted_character = le.inverse_transform(prediction)[0]

        # Desenha caixa ao redor da mão
        x_coords = [lm.x for lm in hand_landmarks.landmark]
        y_coords = [lm.y for lm in hand_landmarks.landmark]
        x1, y1 = int(min(x_coords) * W) - 10, int(min(y_coords) * H) - 10
        x2, y2 = int(max(x_coords) * W) + 10, int(max(y_coords) * H) + 10

        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 3)
        cv2.putText(frame, predicted_character, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3, cv2.LINE_AA)

    cv2.imshow('Reconhecimento Libras', frame)
    if cv2.waitKey(1) & 0xFF == 27:  # ESC para sair
        break

cap.release()
cv2.destroyAllWindows()
hands.close()