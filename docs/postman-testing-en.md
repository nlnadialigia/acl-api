# Testing Guide - Postman

This document describes how to test the complete ACL API flow, including the new plugin management.

---

## 📂 0. Plugin Management (Admin)

### List All Plugins (Admin Panel)
*   **GET** `/admin/plugins`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### Create New Plugin
*   **POST** `/admin/plugins`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "name": "Inventory",
      "description": "Stock and logistics management"
    }
    ```

### Update/Deactivate Plugin
*   **PATCH** `/admin/plugins/{{pluginId}}`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**: `{"isActive": false}` or `{"description": "New description"}`

---

## 📂 0.1 ACL Management (Admin/Manager)

### Create Permission Definition (Admin)
*   **POST** `/admin/plugins/definitions`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "name": "users:read",
      "label": "Read Users",
      "pluginId": "PLUGIN_ID" // Optional (if null, it's global)
    }
    ```

### List Plugin Definitions
*   **GET** `/admin/plugins/{{pluginId}}/definitions` (or `global` for global ones)
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### Create Role for Plugin (Manager/Admin)
*   **POST** `/admin/plugins/{{pluginId}}/roles`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "name": "Editor",
      "description": "Can read and edit data",
      "definitionIds": ["DEF_ID_1", "DEF_ID_2"]
    }
    ```

### List Plugin Roles
*   **GET** `/admin/plugins/{{pluginId}}/roles`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### View Complete Plugin ACL Structure
*   **GET** `/admin/plugins/{{pluginId}}/acl`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### Delete Role
*   **DELETE** `/admin/plugins/roles/{{roleId}}`
*   **Headers**: `Authorization: Bearer {{token_admin}}` (or token_manager)

### Delete Permission Definition
*   **DELETE** `/admin/plugins/definitions/{{definitionId}}`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

---

## 📂 1. User Flow (Registration and Login)

### 💡 Tip: Import Swagger into Postman
To facilitate testing, you can import the entire API specification at once:
1. In Postman, click **Import**.
2. In the **Link** tab, paste the URL: `http://localhost:5001/api-json`.
3. Follow the import instructions. This will create a Collection with all routes and data types.

### Manual Preparation
1.  **Swagger UI**: Access `http://localhost:5001/api` to see the visual documentation.
2.  **Postman Variables**: Create an Environment with:
    *   `baseUrl`: `http://localhost:5001`
    *   `token_user`: (Regular user JWT)
    *   `token_admin`: (Portal Admin JWT)

---

### Registration
*   **POST** `/users/register`
*   **Body**:
    ```json
    {
      "email": "user@example.com",
      "name": "John Silva"
    }
    ```

### Login
*   **POST** `/auth/login`
*   **Body**: `{"email": "user@example.com"}`
*   **Response**: Copy the `access_token` and save it as `token_user`.

---

## 📂 2. Request Flow (Access Requests)

### Request Access
*   **POST** `/requests`
*   **Headers**: `Authorization: Bearer {{token_user}}`
*   **Body**:
    ```json
    {
      "pluginId": "PLUGIN_ID",
      "roleId": "ROLE_ID",
      "scopeType": "GLOBAL"
    }
    ```

---

## 📂 3. Administrative Flow (Approval)

### List Requests
*   **GET** `/requests`
*   **Headers**: `Authorization: Bearer {{token_admin}}`

### Approve Request
*   **POST** `/requests/{{requestId}}/approve`
*   **Headers**: `Authorization: Bearer {{token_admin}}` (or token_manager if managing the plugin)

### Grant Direct Access (Bypass)
*   **POST** `/requests/grant`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "userId": "USER_ID",
      "pluginId": "PLUGIN_ID",
      "roleId": "ROLE_ID",
      "scopeType": "UNIT",
      "scopeId": "SP Unit"
    }
    ```

---

## 📂 4. Access Validation (Plugins)

### Access Plugin (Hits Cache)
*   **GET** `/plugins`
*   **Headers**: `Authorization: Bearer {{token_user}}`
*   **Behavior**: The first call fetches from the database and saves to Redis. The second call comes directly from Redis.

### List My Permissions and Requests
*   **GET** `/plugins/my-permissions`
*   **Headers**: `Authorization: Bearer {{token_user}}`
*   **Usage**: The dashboard uses this to show which plugins are already approved or pending.

---

## 📂 5. Revocation and Invalidation (Fine-Tuning)

### Revoke Access
*   **POST** `/requests/revoke`
*   **Headers**: `Authorization: Bearer {{token_admin}}`
*   **Body**:
    ```json
    {
      "userId": "USER_ID",
      "pluginId": "PLUGIN_ID",
      "scopeType": "GLOBAL",
      "scopeId": null
    }
    ```

### Test Invalidation
*   Try accessing `/plugins` again with `token_user`. Access should be immediately denied (403), as the cache was invalidated during revocation.

---

## 📂 6. Audit and Notifications

### View Notifications
*   **GET** `/notifications` (Need to implement controller if you want to list via API, or check via Database)

### View Audit
*   Check the `permission_audit_logs` table in the database to confirm records of `APPROVE_ACCESS` and `REVOKE_ACCESS`.
