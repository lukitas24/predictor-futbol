# 🏁 Guía para ejecutar el proyecto

Este proyecto incluye un backend en **FastAPI** con **Prolog** y un frontend en **React**. Usamos **Docker** para simplificar el manejo del entorno.

---

## 1. Requisitos Previos

- Tener instalado **Docker** y **Docker Compose**.
- Tener instalado **Node.js** y **npm**.

---

## 2. Backend - FastAPI y Prolog

Los servicios del backend se manejan con contenedores Docker mediante el script `manage`. Desde la raíz del proyecto, ejecutar:

```bash
./manage up           # Levanta los contenedores
./manage build        # (Opcional) Reconstruye los contenedores
./manage down         # Detiene y elimina los contenedores
Esto inicia el backend en el puerto 8000.

Dependencias del backend (requirements.txt):
nginx
fastapi
uvicorn
requests
python-dotenv
Estas dependencias se instalan automáticamente al usar Docker.

3. Frontend - React + Vite
Desde otra terminal, moverse a la carpeta frontend/:


cd frontend
Si es la primera vez que se ejecuta el proyecto, instalar las dependencias con:

npm install
Luego, levantar el servidor de desarrollo:

npm run dev
Esto habilita el frontend en el navegador en la dirección:

👉 http://localhost:5173

⚠️ Este paso es necesario para visualizar la aplicación. npm run dev levanta un servidor local en modo desarrollo (Vite).

4. Acceso a la aplicación
Frontend: http://localhost:5173

Backend (API Swagger UI): http://localhost:8000/docs

5. Estructura del Proyecto

TPFINAL/
├── backend/
│   ├── app/
│   │   └── prolog/
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   └── components/
│   └── vite.config.js
├── manage
└── docker-compose.yml