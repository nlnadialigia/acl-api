# Guia de Teste - Postman

Este documento descreve como testar o fluxo completo da API de ACL, incluindo a nova gestão de plugins.

---

## 📂 0. Gestão de Plugins (Admin)

### Listar Todos os Plugins (Painel Admin)
*   **GET** `/admin/plugins`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### Criar Novo Plugin
*   **POST** `/admin/plugins`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "name": "Inventory",
      "description": "Gestão de estoque e logística"
    }
    ```

### Atualizar/Desativar Plugin
*   **PATCH** `/admin/plugins/{{pluginId}}`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**: `{"isActive": false}` ou `{"description": "Nova descrição"}`

---

---

## 📂 1. Fluxo de Usuário (Cadastro e Login)

### 💡 Dica: Importar Swagger no Postman
Para facilitar os testes, você pode importar toda a especificação da API de uma vez:
1. No Postman, clique em **Import**.
2. Na aba **Link**, cole a URL: `http://localhost:5001/api-json`.
3. Siga as instruções de importação. Isso criará uma Collection com todas as rotas e tipos de dados.

### Preparação Manual
1.  **Swagger UI**: Acesse `http://localhost:5001/api` para ver a documentação visual.
2.  **Variáveis Postman**: Crie um Environment com:
    *   `baseUrl`: `http://localhost:5001`
    *   `token_user`: (JWT do usuário comum)
    *   `token_admin`: (JWT do Portal Admin)

---

### Cadastro
*   **POST** `/users/register`
*   **Body**:
    ```json
    {
      "email": "user@exemplo.com",
      "name": "João Silva"
    }
    ```

### Login
*   **POST** `/auth/login`
*   **Body**: `{"email": "user@exemplo.com"}`
*   **Resposta**: Copie o `access_token` e salve como `token_user`.

---

## 📂 2. Fluxo de Solicitação (Access Requests)

### Solicitar Acesso
*   **POST** `/requests`
*   **Headers**: `Authorization: Bearer {{token_user}}`
*   **Body**:
    ```json
    {
      "pluginId": "ID_DO_PLUGIN",
      "scopeType": "GLOBAL"
    }
    ```

---

## 📂 3. Fluxo Administrativo (Aprovação)

### Listar Solicitações
*   **GET** `/requests`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### Aprovar Solicitação
*   **POST** `/requests/{{requestId}}/approve`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

---

## 📂 4. Validação de Acesso (Plugins)

### Acessar Plugin (Bate no Cache)
*   **GET** `/plugins`
*   **Headers**: `Authorization: Bearer {{token_user}}`
*   **Comportamento**: A primeira chamada busca no banco e salva no Redis. A segunda chamada vem direto do Redis.

---

## 📂 5. Revogação e Invalidação (Pente Fino)

### Revogar Acesso
*   **POST** `/requests/revoke`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "userId": "ID_DO_USER",
      "pluginId": "ID_DO_PLUGIN"
    }
    ```

### Testar Invalidação
*   Tente acessar `/plugins` novamente com o `token_user`. O acesso deve ser negado imediatamente (403), pois o cache foi invalidado durante a revogação.

---

## 📂 6. Auditoria e Notificações

### Ver Notificações
*   **GET** `/notifications` (Precisa implementar controller se desejar listar via API, ou ver via Banco)

### Ver Auditoria
*   Verifique a tabela `permission_audit_logs` no banco de dados para confirmar os registros de `APPROVE_ACCESS` e `REVOKE_ACCESS`.
