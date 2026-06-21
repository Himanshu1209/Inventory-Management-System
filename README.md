# Inventory Management System

Assessment-ready full-stack Inventory Management System built with:

- React frontend
- Python FastAPI backend
- PostgreSQL database
- Docker and Docker Compose
- REST APIs for products, customers, and orders

## Assessment Requirements Covered

- React frontend to manage products, customers, and orders
- Python backend with FastAPI
- PostgreSQL for persistent data
- Unique product SKU validation
- Unique customer email validation
- Order placement automatically reduces inventory stock
- Orders are rejected when product stock is insufficient
- Dockerfile for backend and frontend
- Docker Compose for full local stack
- Environment variables for configuration
- REST API documentation through FastAPI Swagger UI

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── services.py
│   │   ├── database.py
│   │   └── config.py
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── styles.css
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Run With Docker Compose

```bash
docker compose up --build
```

Frontend:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:8000
```

Swagger docs:

```text
http://localhost:8000/docs
```

## Run Backend Locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

By default, the backend uses SQLite for quick local development. For PostgreSQL, set:

```bash
DATABASE_URL=postgresql+psycopg://inventory_user:inventory_password@localhost:5432/inventory_db
```

## Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Set the API URL in `frontend/.env`:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/api/dashboard` | Dashboard metrics |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET | `/api/products/{id}` | Get product |
| PUT | `/api/products/{id}` | Update product |
| DELETE | `/api/products/{id}` | Delete product |
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/{id}` | Update customer |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Place order and reduce stock |

## Tests

```bash
cd backend
python -m pytest tests
```

## Docker Hub

Build and push backend image:

```bash
docker build -t your-dockerhub-username/inventory-backend:latest ./backend
docker push your-dockerhub-username/inventory-backend:latest
```

Use this form value:

```text
https://hub.docker.com/r/your-dockerhub-username/inventory-backend
```

## Deployment Notes

Suggested deployment:

- Backend API: Render, Railway, Fly.io, or any Docker-capable host
- PostgreSQL: Render PostgreSQL, Railway PostgreSQL, Supabase, Neon, or ElephantSQL
- Frontend: Vercel or Netlify

Set backend environment variables:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DB_NAME
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

Set frontend environment variable:

```text
VITE_API_BASE_URL=https://your-backend-api-url.onrender.com
```

## Form Submission Checklist

Submit these four values in the Google Form:

```text
GitHub Repository Link (Frontend + Backend):
https://github.com/your-username/inventory-management-system

Backend Docker Hub Image Link:
https://hub.docker.com/r/your-dockerhub-username/inventory-backend

Frontend Hosted URL:
https://your-frontend-url.vercel.app

Backend API Hosted URL:
https://your-backend-api-url.onrender.com
```
