# 🍽️ NutriOps Platform

Plataforma operativa para la gestión y análisis de servicios de alimentación institucional (hospitales, universidades, casinos corporativos, etc).

NutriOps permite monitorear consumos, visualizar indicadores en tiempo real, administrar operaciones y apoyar la toma de decisiones mediante dashboards interactivos.

---

## Características principales

* Dashboards operacionales en tiempo real
* Visualización en vivo mediante SSE (Server-Sent Events)
* Gestión de consumo por tipo de comida (desayuno, almuerzo, once)
* Reportes y analítica de consumo
* Gestión de usuarios por roles
* Arquitectura modular (monorepo)
* Módulo kiosk para registro de consumos

---

## Arquitectura

El proyecto sigue una arquitectura modular basada en monorepo:

```text
nutriops-platform
│
├── apps
│   ├── api     # Backend (Node.js + Express)
│   ├── web     # Dashboard administrativo (Vue 3 + Vite + TypeScript)
│   └── kiosk   # Interfaz tipo tótem / terminal
│
├── scripts     # Seeds y utilidades de carga de datos
├── package.json
└── README.md
```

### Módulos

* **api**: autenticación, lógica de negocio y acceso a datos
* **web**: dashboard administrativo con visualización en tiempo real
* **kiosk**: interfaz para registro de consumos en terminales

---

## Tiempo real con SSE

NutriOps utiliza **Server-Sent Events (SSE)** para enviar datos desde el servidor al cliente en tiempo real.

### Uso dentro del sistema

* Aforo en vivo
* Actividad del casino
* Consumo del día
* Actualización automática de dashboards

### ¿Por qué SSE?

* Más simple que WebSockets
* Ideal para comunicación unidireccional
* Menor complejidad para dashboards

---

## Stack tecnológico

### Frontend

* Vue 3
* Vite
* TypeScript

### Backend

* Node.js
* Express

### Base de datos

* MySQL / MariaDB

---

## ⚙️ Instalación y ejecución

### 1. Clonar repositorio

```bash
git clone https://github.com/mvargascode/nutriops-platform.git
cd nutriops-platform
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=casino_nutriops
DB_USER=root
DB_PASSWORD=tu_password
JWT_SECRET=super_secret_key
```

### 4. Crear base de datos

```sql
CREATE DATABASE casino_nutriops;
```

### 5. Ejecutar el sistema

#### Backend

```bash
npm run dev:api
```

#### Frontend

```bash
npm run dev:web
```

#### Kiosk

```bash
npm run dev:kiosk
```

---

## Datos de prueba (Seeds)

Puedes generar datos de prueba con:

```bash
node scripts/seed-consumos-60dias.js
node scripts/seed-hoy-almuerzo.js
node scripts/seed-hoy-desayuno-almuerzo.js
```

Estos scripts generan datos realistas para pruebas y dashboards.

---

## Usuarios demo

Usuarios de prueba para acceder al sistema:

| Rol       | Usuario | Contraseña |
| --------- | ------- | ---------- |
| Admin     | admin   | admin123   |
| Nutrición | nutri   | nutri123   |
| RRHH      | rrhh    | rrhh123    |
| Usuario   | user    | user123    |

> Puedes crear estos usuarios manualmente o mediante scripts.

---

## Funcionalidades

* Monitoreo de aforo
* Consumo por tipo de comida
* Visualización en tiempo real
* Reportes históricos
* Administración de usuarios

---

## Estado del proyecto

Proyecto en desarrollo activo con mejoras continuas en rendimiento, visualización y arquitectura.

---

## Autor

**Milton Vargas**
Software Engineer | Backend, Systems & Infrastructure

* GitHub: https://github.com/mvargascode
* LinkedIn: https://www.linkedin.com/in/miltonvargasa

---

## 📄 Licencia

MIT License
