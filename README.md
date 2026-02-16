# Access Control List (ACL) API

[![pt-br](https://img.shields.io/badge/lang-pt--br-green.svg)](./docs/README.pt-br.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A comprehensive Role-Based Access Control (RBAC) system for managing authentication, authorization, and governance across multiple plugins in a corporate portal.

## 📋 Overview

The ACL API is a central service responsible for managing user access to multiple applications (plugins) hosted in a corporate portal. It provides:

- **Role-Based Access Control (RBAC)** with hierarchical scopes
- **Request/Approval workflow** for access management
- **Real-time notifications** and email alerts
- **Granular permissions** at Unit and Factory levels
- **Audit logging** for compliance
- **Redis caching** for high performance

For detailed business rules, see [Business Rules Documentation](./docs/business-rules-acl.md).

## 🏗️ Architecture

- **Backend**: NestJS + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js + React Query + Tailwind CSS
- **Infrastructure**: Docker Compose for local development

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- pnpm (recommended)

### 1. Start Infrastructure Services

Start PostgreSQL, Redis, and MailHog (email testing):

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port `5432`
- Redis on port `6379`
- MailHog UI on `http://localhost:8025`

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Setup database
pnpm prisma generate
pnpm prisma migrate dev

# Start development server
pnpm start:dev
```

Backend will be available at `http://localhost:5001`
- API Documentation (Swagger): `http://localhost:5001/api`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend will be available at `http://localhost:3000`

## 📚 Documentation

- [Business Rules (English)](./docs/business-rules-acl.md)
- [Business Rules (Portuguese)](./docs/regras-negocio-acl.md)
- [API Testing Guide (English)](./docs/postman-testing-en.md)
- [API Testing Guide (Portuguese)](./docs/postman-testing.md)

## 🧪 Testing the API

You can test the API using:

1. **Swagger UI**: Navigate to `http://localhost:5001/api`
2. **Postman**: Import the OpenAPI spec from `http://localhost:5001/api-json`
3. **Manual Testing**: Follow the [Testing Guide](./docs/postman-testing-en.md)

## 🔑 Key Features

### For Portal Admins
- Manage all plugins and users
- Create permission definitions and roles
- Approve/reject access requests globally
- Grant direct access to users
- View audit logs and email history

### For Plugin Managers
- Manage specific plugins
- Create roles for their plugins
- Approve/reject requests for managed plugins
- View plugin-specific analytics

### For Users
- Browse available plugins
- Request access with specific scopes
- Receive real-time notifications
- Access approved plugins instantly

## 📦 Project Structure

```
acl-api/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Authentication & Guards
│   │   ├── plugins/  # Plugin management
│   │   ├── requests/ # Access requests
│   │   ├── users/    # User management
│   │   └── ...
│   └── prisma/       # Database schema
├── frontend/         # Next.js UI
│   ├── app/          # Pages
│   ├── components/   # React components
│   └── lib/          # Utilities
├── docs/             # Documentation
└── docker-compose.yml
```

## 🛠️ Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/acl"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="your-secret-key"
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```