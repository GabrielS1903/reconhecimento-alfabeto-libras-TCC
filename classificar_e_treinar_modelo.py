# Importação das bibliotecas necessárias
import numpy as np                                       
from sklearn.ensemble import RandomForestClassifier     
from sklearn.model_selection import train_test_split    
from sklearn.preprocessing import LabelEncoder           
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import pickle                                            

# -------------------------------------------------------
# 1. Carregamento do dataset gerado anteriormente
# -------------------------------------------------------

# Lê o arquivo 'imagens.npz' que contém os dados e os rótulos das imagens
dataset = np.load('imagens.npz')

# x contém os vetores de características (coordenadas normalizadas das mãos)
x = dataset['data']

# y contém os rótulos (letras correspondentes a cada vetor)
y = dataset['labels']

# -------------------------------------------------------
# 2. Codificação dos rótulos
# -------------------------------------------------------

# Cria o codificador de rótulos para converter letras (strings) em números inteiros
le = LabelEncoder()

# Aplica a codificação (exemplo: A - 0, B - 1, C - 2, ...)
y_encoded = le.fit_transform(y)

# -------------------------------------------------------
# 3. Divisão do dataset em treino e teste
# -------------------------------------------------------

# Divide os dados em 80% para treino e 20% para teste
# - shuffle=True - embaralha os dados antes de dividir
# - stratify=y_encoded - garante que a proporção de classes se mantenha igual em ambos os conjuntos
x_train, x_test, y_train, y_test = train_test_split(x, y_encoded, test_size=0.2, shuffle=True, stratify=y_encoded)

# -------------------------------------------------------
# 4. Criação e treinamento do modelo Random Forest
# -------------------------------------------------------

# Cria um classificador Random Forest com 200 árvores de decisão
# - n_estimators=200: quantidade de árvores
# - random_state=42: garante reprodutibilidade dos resultados
model = RandomForestClassifier(n_estimators=200, random_state=42)

# Treina o modelo com os dados de treino
model.fit(x_train, y_train)

# -------------------------------------------------------
# 5. Avaliação do modelo
# -------------------------------------------------------

# Realiza predições sobre o conjunto de teste
y_pred = model.predict(x_test)

# Calcula a acurácia total do modelo (porcentagem de acertos)
accuracy = accuracy_score(y_test, y_pred)
print(f'Acurácia: {accuracy * 100:.2f}%')

# Exibe a matriz de confusão (mostra os erros e acertos por classe)
print("\nMatriz de Confusão:")
print(confusion_matrix(y_test, y_pred))

# Exibe métricas detalhadas: precisão, recall e F1-score por classe
print("\nRelatório de Classificação:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# -------------------------------------------------------
# 6. Salvando o modelo e o codificador
# -------------------------------------------------------

# Salva o modelo treinado (Random Forest) em um arquivo .p
with open('model.p', 'wb') as f:
    pickle.dump(model, f)

# Salva o codificador (LabelEncoder) para converter previsões numéricas de volta em letras
with open('label_encoder.p', 'wb') as f:
    pickle.dump(le, f)

print("Modelo e encoder salvos com sucesso!")
