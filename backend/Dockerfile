FROM python:3.11-slim

WORKDIR /app

# Instalar SWI-Prolog, git y dependencias para compilar
RUN apt-get update && apt-get install -y \
    git \
    swi-prolog \
    build-essential \
    libffi-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar pyswip desde GitHub
RUN pip install git+https://github.com/yuce/pyswip.git

# Copiar e instalar dependencias del proyecto
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copiar el código fuente y los archivos de Prolog
COPY app/ .
COPY prolog/ ./prolog/

# Ejecutar el backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
