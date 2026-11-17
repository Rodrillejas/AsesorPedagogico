# EvalAI-Auditor 🛡️🎓🤖
### Asesor Pedagógico Inteligente & Motor de Auditoría Técnica Multimodal

Plataforma Fullstack para la auditoría técnica automatizada y evaluación formativa de proyectos de software y laboratorios académicos mediante **Google Gemini** con Structured JSON Outputs, **NestJS**, **Prisma ORM**, **PostgreSQL** y **React + TypeScript + Tailwind CSS**.

---

## 🚀 Características Principales

### 1. Evaluación Multimodal con Criterio Pedagógico
- **Auditoría Técnica Objetiva:** Evalúa de manera imparcial y rigurosa código fuente, matrices de cartografía (.xlsx, .csv), diagramas de mapas mentales (SVG, imágenes) y reportes de evidencias.
- **Detección Automática de Dominios y Competencias:** Categoriza el aprendizaje por dominios (ej. Arquitectura y Modularidad, Modelado y Datos, Experimentación Local) calculando porcentajes de maestría y tendencias evolutivas.
- **Retroalimentación Formativa:** Genera diagnósticos pedagógicos constructivos, identificando fortalezas técnicas demostradas, áreas críticas de mejora y planes de acción específicos por estudiante.

### 2. Gestión por Cortes Académicos y Semestres
- **Estructura Académica Flexible:** Organización por Semestre Académico y Cortes Evaluativos (`Corte 1`, `Corte 2`, `Corte 3`).
- **Filtros Dinámicos e Infografía Global:** Visualización consolidada por corte específico o consolidado semestral general.
- **Historial y Cierre de Informes:** Posibilidad de archivar snapshots de cortes finalizados y exportar el informe consolidado directamente a **PDF** con gráficos y tablas detalladas.

### 3. Procesamiento Ultrarrápido de Archivos ZIP
- **Extracción Local en Navegador (JSZip):** Descompresión en memoria RAM del cliente sin saturar el ancho de banda, permitiendo subidas instantáneas incluso a través de túneles Cloudflare.
- **Filtro Inteligente contra Zip-Slip:** Omite automáticamente dependencias pesadas y binarios innecesarios (`node_modules`, `venv`, `__pycache__`, `.git`), procesando únicamente los archivos de evidencia académica relevantes.

### 4. Motor de IA de Alto Rendimiento
- **Google Gemini Integrado:** Utiliza modelos optimizados como `gemini-3.1-flash-lite` para respuestas inmediatas (1 a 3 segundos), con cadena de tolerancia a fallos y protección contra límites de tasa.
- **Controlador de Timeout y Fallback:** AbortController integrado a 20s y validación matemática estricta de coherencia entre los criterios evaluados y la nota final.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite, JSZip, Canvas Confetti.
- **Backend:** NestJS, TypeScript, Prisma ORM, PDF-Parse, XLSX, Google GenAI SDK, OpenAI SDK.
- **Base de Datos:** PostgreSQL.
- **Infraestructura:** Nginx como Proxy Inverso, PM2 Process Manager, Cloudflare Tunnel.

---

## ⚙️ Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Rodrillejas/AsesorPedagogico.git
cd AsesorPedagogico
```

### 2. Configurar Variables de Entorno
Crea el archivo `.env` en la carpeta `server` a partir de la plantilla:
```bash
cp server/.env.example server/.env
```

Configura tu cadena de conexión de PostgreSQL:
```env
PORT=3000
DATABASE_URL="postgresql://usuario:password@localhost:5432/evalai_auditor?schema=public"
GEMINI_API_KEY="" # Opcional: puede ingresarse dinámicamente en la interfaz web
```

### 3. Instalar Dependencias
```bash
# Servidor
npm --prefix server install

# Cliente
npm --prefix client install
```

### 4. Inicializar la Base de Datos
```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:push
```

### 5. Iniciar en Modo Desarrollo
En terminales separadas:
```bash
# Backend (NestJS en http://localhost:3000)
npm --prefix server run start:dev

# Frontend (Vite en http://localhost:5173)
npm --prefix client run dev
```

---

## 🌐 Despliegue en Producción (Ubuntu + Nginx + PM2)

### Compilación
```bash
npm --prefix server run build
npm --prefix client run build
```

### Nginx (Configuración Recomendada)
```nginx
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 100M;
    root /var/www/evalai/client/dist;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### PM2
```bash
cd server
pm2 start dist/main.js --name "evalai-backend"
pm2 save
```

---

## 👥 Autores
- **David Rodriguez** ([@Rodrillejas](https://github.com/Rodrillejas))
