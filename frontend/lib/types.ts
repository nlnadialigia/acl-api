export type Role = "user" | "admin" | "manager"

export interface User {
  id: string
  username: string
  password: string
  role: Role
  managedPlugins: string[]
  createdAt: string
}

export type AccessStatus = "pending" | "approved" | "rejected"

export interface AccessRequest {
  id: string
  userId: string
  pluginId: string
  permissionTypeId?: string
  units: string[]
  factories: string[]
  status: AccessStatus
  grantedUnits?: string[]
  grantedFactories?: string[]
  grantedPermissionTypeId?: string
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface Plugin {
  id: string
  name: string
  description: string
  icon: string
  isPublic: boolean
}

export interface PermissionType {
  id: string
  pluginId: string
  name: string
  description: string
}

export interface Notification {
  id: string
  userId: string
  type: "access_request" | "access_granted" | "access_rejected"
  message: string
  relatedRequestId?: string
  read: boolean
  createdAt: string
}

export interface EmailLog {
  id: string
  to: string
  subject: string
  body: string
  sentAt: string
}

export interface AuthSession {
  userId: string
  username: string
  role: Role
  managedPlugins: string[]
}
