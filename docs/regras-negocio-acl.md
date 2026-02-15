# Especificação de Regras de Negócio - ACL (Access Control List)

Este documento consolida o entendimento das regras de negócio do ACL, definindo papéis, fluxos e governança de acesso para o Portal de Plugins.

---

## 1. Visão Geral
O ACL é o sistema central responsável pela **autenticação, autorização e governança** de acesso no Portal corporativo. Ele gerencia o acesso de usuários às múltiplas aplicações (chamadas de **plugins**) hospedadas no portal, garantindo segurança e granularidade no controle de permissões.

O modelo adotado é baseado em **RBAC (Role-Based Access Control)** com escopos hierárquicos (Unidade e Fábrica).

---

## 2. Atores e Responsabilidades

### 2.1. Administrador do Portal (Admin)
- **Perfil:** Superusuário com acesso global.
- **Poderes:**
    - Pode conceder e revogar qualquer permissão em qualquer plugin.
    - Gerencia o cadastro de todos os plugins, unidades e fábricas.
    - Pode atuar sobre qualquer solicitação de acesso.
    - Tem precedência sobre qualquer outro perfil.

### 2.2. Manager (Administrador do Plugin)
- **Perfil:** Responsável pela gestão de um ou mais plugins específicos.
- **Poderes:**
    - Gerencia apenas os plugins sob sua responsabilidade.
    - Pode aprovar ou rejeitar solicitações de acesso direcionadas aos seus plugins.
    - Pode revogar permissões ativas em seus plugins.

### 2.3. Usuário Comum
- **Perfil:** Usuário final do portal.
- **Permissões:**
    - Pode visualizar a lista de plugins disponíveis (vitrine).
    - Pode solicitar acesso aos plugins que desejar utilizar.
    - Acessa os plugins conforme as permissões que lhe foram expressamente concedidas.

---

## 3. Entidades e Estrutura

### 3.1. Entidades Principais
- **Plugin:** Aplicação independente hospedada no portal.
- **Unidade:** Entidade organizacional macro do negócio.
- **Fábrica:** Subdivisão organizacional vinculada a uma Unidade.

### 3.2. Modelo de Permissões e Escopos
As permissões não são apenas "sim/não". Elas possuem um **escopo** que define a abrangência do acesso dentro de um plugin:

1.  **Escopo GERAL (Global):**
    - O usuário tem acesso irrestrito ao plugin, independente de unidade ou fábrica.
    - É o nível mais alto de acesso.

2.  **Escopo por UNIDADE:**
    - O acesso é limitado a dados e operações de uma Unidade específica.
    - **Regra de Herança:** Quem tem acesso a uma Unidade, implicitamente tem acesso a **todas as Fábricas** pertencentes àquela Unidade.

3.  **Escopo por FÁBRICA:**
    - O acesso é restrito apenas a uma fábrica específica.
    - É o nível mais granular e restritivo.

---

## 4. Fluxos de Negócio

### 4.1. Solicitação de Acesso
O acesso não é automático; ele deve ser solicitado e aprovado.

1.  **Vitrine:** O usuário vê os plugins no portal. O status visual muda: "Solicitar Acesso", "Solicitação Pendente" ou "Acessar".
2.  **Ação:** Ao solicitar acesso, o usuário deve especificar o **tipo de escopo** desejado (Geral, Unidade ou Fábrica) e, se aplicável, qual Unidade ou Fábrica.
3.  **Registro:** O sistema registra a solicitação com status **PENDENTE**.

### 4.2. Aprovação de Acesso
1.  **Análise:** O Manager do plugin (ou Admin) visualiza as solicitações pendentes.
2.  **Decisão:** O aprovador pode:
    - **Aprovar:** Cria-se imediatamente uma permissão **ATIVA**. A solicitação torna-se **APROVADA**.
    - **Rejeitar:** A solicitação torna-se **REJEITADA**.
    - **Alterar Escopo:** O aprovador pode modificar o pedido original (ex: usuário pediu Fábrica, mas Manager concede Geral) antes de aprovar.

### 4.3. Revogação de Acesso
- A permissão pode ser revogada a qualquer momento por um Admin ou Manager.
- **Consequência:** A perda de acesso deve ser imediata.
- O status da permissão muda para **REVOGADA**.

### 4.4. Notificações
O sistema deve manter os usuários informados sobre o andamento dos processos:

- **Nova Solicitação:** Envia notificação (Tempo Real e E-mail) para o Manager e Admin.
- **Decisão (Aprovação/Rejeição/Revogação):** Envia notificação para o Usuário solicitante.
- **Conteúdo:** As notificações devem informar qual plugin, qual o status e qual o escopo envolvido.

---

## 5. Regras de Negócio Críticas (Invariantes)

1.  **Hierarquia de Decisão:** A decisão de um Admin sobrepõe a de um Manager.
2.  **Soberania do Manager:** Um Manager só pode visualizar e atuar sobre solicitações dos plugins que ele gerencia.
3.  **Unicidade:** Não pode haver mais de uma permissão ativa par o mesmo usuário, no mesmo plugin e com o mesmo escopo.
4.  **Precedência de Escopo:** Permissão Geral > Unidade > Fábrica.
5.  **Impedimento de Auto-aprovação:** Um usuário com perfil de aprovação não pode aprovar suas próprias solicitações.
6.  **Transições de Estado:**
    - Uma solicitação REJEITADA ou APROVADA é estado final; não pode voltar para PENDENTE.
    - Uma permissão REVOGADA não pode ser reativada; exige nova solicitação.

---

## 6. Governança e Auditoria
Para fins de compliance e segurança:

- **Auditoria Imutável:** Todas as ações (concessão, revogação, rejeição) são logadas permanentemente.
- **Rastreabilidade:** Deve-se saber exatamente quem aprovou, quando e se houve alteração do escopo solicitado original.
- **Histórico:** O sistema mantém o histórico completo de solicitações passadas.

---

## 7. Requisitos de Qualidade (SLA e Segurança)

- **Segurança:** Autenticação robusta (JWT/OAuth2) é pré-requisito obrigatório. Proteção contra injeção e escalação de privilégios.
- **Performance:** A verificação de "O usuário X pode acessar o recurso Y?" deve ser respondida em menos de 100ms.
- **Disponibilidade:** O serviço é crítico (SLA 99.5%); se o ACL cair, ninguém acessa nada no portal.
