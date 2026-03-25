# NutriOps Platform

NutriOps is an operational platform designed to manage institutional food services.  
It provides dashboards, reporting and operational tools to track meal consumption, analyze service performance and support data-driven decision making.

The platform is designed for environments such as hospitals, universities, corporate cafeterias and other institutional food services.

---

## Key Features

- Operational dashboards for monitoring meal consumption
- Real-time data visualization
- Institutional food service management
- Reporting and analytics tools
- Modular architecture for different operational environments
- Scalable backend services

---

## Architecture

NutriOps follows a modular architecture using a monorepo structure.

```
nutriops-platform
│
├─ apps
│  ├─ api     # Backend services and API
│  ├─ web     # Administrative dashboard (Vue 3)
│  └─ kiosk   # Kiosk / terminal interface
│
├─ package.json
├─ package-lock.json
├─ .gitignore
└─ README.md
```

Each module is responsible for a specific part of the platform.

| Module | Description |
|------|-------------|
| **api** | Backend services, authentication and data management |
| **web** | Administrative dashboard for monitoring operations |
| **kiosk** | Interface used in terminals or kiosks |

---

## Tech Stack

### Frontend
- Vue 3
- Vite
- TypeScript

### Backend
- Node.js
- Express

### Data
- SQL database (MySQL / MariaDB)

---

## Platform Capabilities

NutriOps provides tools for:

- Monitoring institutional food service activity
- Tracking meal consumption
- Generating operational reports
- Supporting decision-making through dashboards
- Managing food service operations

---

## Getting Started

Clone the repository: git clone https://github.com/mvargascode/nutriops-platform.git


Install dependencies: npm install


Run development environment: npm run dev

---

## Project Status

This project is currently under active development.

New modules and improvements are continuously being implemented.

---

## Author

Milton Vargas  
Software Engineer | Backend, Systems & Infrastructure

GitHub: https://github.com/mvargascode
LinkedIn: https://www.linkedin.com/in/miltonvargasa

---

## License
MIT License
