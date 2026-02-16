export type Role = "PORTAL_ADMIN" | "PLUGIN_MANAGER" | "USER";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  createdAt: string;
}

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PermissionStatus = "ACTIVE" | "REVOKED";
export type ScopeType = "GLOBAL" | "UNIT" | "FACTORY";

export interface AccessRequest {
  id: string;
  userId: string;
  pluginId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string;
  status: RequestStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedById?: string;
  user?: User;
  plugin?: Plugin;
  role?: PluginRole;
}

export interface PluginPermissionDefinition {
  id: string;
  pluginId?: string;
  name: string;
  label: string;
}

export interface PluginRole {
  id: string;
  pluginId: string;
  name: string;
  description?: string;
  definitions?: PluginPermissionDefinition[];
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isPublic: boolean;
  isActive: boolean;
  roleDefinitions?: PluginRole[];
  availableDefinitions?: PluginPermissionDefinition[];
}

export interface PluginPermission {
  id: string;
  userId: string;
  pluginId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string;
  status: PermissionStatus;
  role?: PluginRole;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  context: any;
  sentAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: Role;
  token: string;
}
