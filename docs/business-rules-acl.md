# Business Rules Specification - ACL (Access Control List)

This document consolidates the understanding of ACL business rules, defining roles, workflows, and access governance for the Plugin Portal.

---

## 1. Overview
The ACL is the central system responsible for **authentication, authorization, and governance** of access in the corporate Portal. It manages user access to multiple applications (called **plugins**) hosted on the portal, ensuring security and granularity in permission control.

The adopted model is based on **RBAC (Role-Based Access Control)** with hierarchical scopes (Unit and Factory).

---

## 2. Actors and Responsibilities

### 2.1. Portal Administrator (Admin)
- **Profile:** Superuser with global access.
- **Powers:**
    - Can grant and revoke any permission on any plugin.
    - Manages the registration of all plugins, units, and factories.
    - Can act on any access request.
    - Has precedence over any other profile.

### 2.2. Manager (Plugin Administrator)
- **Profile:** Responsible for managing one or more specific plugins.
- **Powers:**
    - Manages only the plugins under their responsibility.
    - Can approve or reject access requests directed to their plugins.
    - Can revoke active permissions on their plugins.

### 2.3. Regular User
- **Profile:** End user of the portal.
- **Permissions:**
    - Can view the list of available plugins (showcase).
    - Can request access to plugins they wish to use.
    - Accesses plugins according to permissions expressly granted to them.

---

## 3. Entities and Structure

### 3.1. Main Entities
- **Plugin:** Independent application hosted on the portal.
- **Unit:** Macro organizational entity of the business.
- **Factory:** Organizational subdivision linked to a Unit.

### 3.2. Permission and Scope Model
Permissions are not just "yes/no". They have a **scope** that defines the extent of access within a plugin:

1.  **GLOBAL Scope:**
    - The user has unrestricted access to the plugin, regardless of unit or factory.
    - This is the highest level of access.

2.  **UNIT Scope:**
    - Access is limited to data and operations of a specific Unit.
    - **Inheritance Rule:** Those who have access to a Unit implicitly have access to **all Factories** belonging to that Unit.

3.  **FACTORY Scope:**
    - Access is restricted to only a specific factory.
    - This is the most granular and restrictive level.

---

## 4. Business Workflows

### 4.1. Access Request
Access is not automatic; it must be requested and approved.

1.  **Showcase:** The user sees the plugins on the portal. The visual status changes: "Request Access", "Pending Request", or "Access".
2.  **Action:** When requesting access, the user must specify the desired **scope type** (Global, Unit, or Factory) and, if applicable, which Unit or Factory.
3.  **Registration:** The system records the request with **PENDING** status.

### 4.2. Access Approval
1.  **Analysis:** The plugin Manager (or Admin) views pending requests.
2.  **Decision:** The approver can:
    - **Approve:** An **ACTIVE** permission is immediately created. The request becomes **APPROVED**.
    - **Reject:** The request becomes **REJECTED**.
    - **Change Scope:** The approver can modify the original request (e.g., user requested Factory, but Manager grants Global) before approving.

### 4.3. Access Revocation
- Permission can be revoked at any time by an Admin or Manager.
- **Consequence:** Loss of access must be immediate.
- The permission status changes to **REVOKED**.

### 4.4. Notifications
The system must keep users informed about the progress of processes:

- **New Request:** Sends notification (Real-Time and Email) to Manager and Admin.
- **Decision (Approval/Rejection/Revocation):** Sends notification to the requesting User.
- **Content:** Notifications must inform which plugin, what status, and what scope is involved.

---

## 5. Critical Business Rules (Invariants)

1.  **Decision Hierarchy:** An Admin's decision overrides a Manager's.
2.  **Manager Sovereignty:** A Manager can only view and act on requests for plugins they manage.
3.  **Uniqueness:** There cannot be more than one active permission for the same user, on the same plugin, and with the same scope.
4.  **Scope Precedence:** Global Permission > Unit > Factory.
5.  **Self-Approval Prevention:** A user with approval profile cannot approve their own requests.
6.  **State Transitions:**
    - A REJECTED or APPROVED request is a final state; it cannot return to PENDING.
    - A REVOKED permission cannot be reactivated; it requires a new request.

---

## 6. Governance and Audit
For compliance and security purposes:

- **Immutable Audit:** All actions (grant, revoke, reject) are permanently logged.
- **Traceability:** It must be known exactly who approved, when, and if there was a change from the original requested scope.
- **History:** The system maintains a complete history of past requests.

---

## 7. Quality Requirements (SLA and Security)

- **Security:** Robust authentication (JWT/OAuth2) is a mandatory prerequisite. Protection against injection and privilege escalation.
- **Performance:** The verification of "Can user X access resource Y?" must be answered in less than 100ms.
- **Availability:** The service is critical (SLA 99.5%); if ACL goes down, no one accesses anything on the portal.
