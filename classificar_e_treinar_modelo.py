import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import pickle

# Carrega o dataset
dataset = np.load('imagens.npz')
X = dataset['data']
y = dataset['labels']

# Converte labels para números
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Divide em treino e teste
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, shuffle=True, stratify=y_encoded
)

# Cria e treina o modelo Random Forest
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# Faz previsões
y_pred = model.predict(X_test)

# Avalia o modelo
accuracy = accuracy_score(y_test, y_pred)
print(f'Acurácia: {accuracy * 100:.2f}%')
print("\nMatriz de Confusão:")
print(confusion_matrix(y_test, y_pred))
print("\nRelatório de Classificação:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# Salva modelo e encoder
with open('model.p', 'wb') as f:
    pickle.dump(model, f)

with open('label_encoder.p', 'wb') as f:
    pickle.dump(le, f)

print("Modelo e encoder salvos com sucesso!")