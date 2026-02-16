# API de ACL (Access Control List)

[![en](https://img.shields.io/badge/lang-en-red.svg)](../README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

Um sistema abrangente de Controle de Acesso Baseado em Papéis (RBAC) para gerenciar autenticação, autorização e governança em múltiplos plugins de um portal corporativo.

## 📋 Visão Geral

A API de ACL é um serviço central responsável por gerenciar o acesso de usuários a múltiplas aplicações (plugins) hospedadas em um portal corporativo. Ela fornece:

- **Controle de Acesso Baseado em Papéis (RBAC)** com escopos hierárquicos
- **Fluxo de Solicitação/Aprovação** para gerenciamento de acesso
- **Notificações em tempo real** e alertas por email
- **Permissões granulares** em níveis de Unidade e Fábrica
- **Log de auditoria** para conformidade
- **Cache Redis** para alta performance

Para regras de negócio detalhadas, veja a [Documentação de Regras de Negócio](./regras-negocio-acl.md).

## 🏗️ Arquitetura

- **Backend**: NestJS + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js + React Query + Tailwind CSS
- **Infraestrutura**: Docker Compose para desenvolvimento local

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- pnpm (recomendado)

### 1. Iniciar Serviços de Infraestrutura

Inicie PostgreSQL, Redis e MailHog (teste de email):

```bash
docker-compose up -d
```

Isso iniciará:
- PostgreSQL na porta `5432`
- Redis na porta `6379`
- MailHog UI em `http://localhost:8025`

### 2. Configuração do Backend

```bash
cd backend

# Instalar dependências
pnpm install

# Configurar banco de dados
pnpm prisma generate
pnpm prisma migrate dev

# Iniciar servidor de desenvolvimento
pnpm start:dev
```

Backend estará disponível em `http://localhost:5001`
- Documentação da API (Swagger): `http://localhost:5001/api`

### 3. Configuração do Frontend

```bash
cd frontend

# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev
```

Frontend estará disponível em `http://localhost:3000`

## 📚 Documentação

- [Regras de Negócio (Português)](./regras-negocio-acl.md)
- [Regras de Negócio (Inglês)](./business-rules-acl.md)
- [Guia de Testes da API (Português)](./postman-testing.md)
- [Guia de Testes da API (Inglês)](./postman-testing-en.md)

## 🧪 Testando a API

Você pode testar a API usando:

1. **Swagger UI**: Navegue até `http://localhost:5001/api`
2. **Postman**: Importe a especificação OpenAPI de `http://localhost:5001/api-json`
3. **Testes Manuais**: Siga o [Guia de Testes](./postman-testing.md)

## 🔑 Funcionalidades Principais

### Para Administradores do Portal
- Gerenciar todos os plugins e usuários
- Criar definições de permissões e papéis
- Aprovar/rejeitar solicitações de acesso globalmente
- Conceder acesso direto aos usuários
- Visualizar logs de auditoria e histórico de emails

### Para Gerentes de Plugin
- Gerenciar plugins específicos
- Criar papéis para seus plugins
- Aprovar/rejeitar solicitações para plugins gerenciados
- Visualizar análises específicas do plugin

### Para Usuários
- Navegar pelos plugins disponíveis
- Solicitar acesso com escopos específicos
- Receber notificações em tempo real
- Acessar plugins aprovados instantaneamente

## 📦 Estrutura do Projeto

```
acl-api/
├── backend/          # API NestJS
│   ├── src/
│   │   ├── auth/     # Autenticação & Guards
│   │   ├── plugins/  # Gerenciamento de plugins
│   │   ├── requests/ # Solicitações de acesso
│   │   ├── users/    # Gerenciamento de usuários
│   │   └── ...
│   └── prisma/       # Schema do banco de dados
├── frontend/         # UI Next.js
│   ├── app/          # Páginas
│   ├── components/   # Componentes React
│   └── lib/          # Utilitários
├── docs/             # Documentação
└── docker-compose.yml
```

## 🛠️ Variáveis de Ambiente

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

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](../LICENSE) para detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para enviar um Pull Request.

## 📧 Suporte

Para dúvidas ou problemas, por favor abra uma issue no repositório.
