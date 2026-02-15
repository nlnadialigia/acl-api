import type { User, AccessRequest, Plugin, Notification, EmailLog, PermissionType } from "./types"

const plugins: Plugin[] = [
  {
    id: "plugin-1",
    name: "Tom & Jerry",
    description: "Sistema de gerenciamento de inventario e rastreamento de ativos.",
    icon: "Cat",
    isPublic: false,
  },
  {
    id: "plugin-2",
    name: "Scooby-Doo",
    description: "Plataforma de investigacao e resolucao de problemas.",
    icon: "Dog",
    isPublic: false,
  },
  {
    id: "plugin-3",
    name: "Os Flintstones",
    description: "Modulo de gestao de recursos humanos e folha de pagamento.",
    icon: "Mountain",
    isPublic: true,
  },
  {
    id: "plugin-4",
    name: "Dragon Ball Z",
    description: "Sistema de monitoramento de performance e metricas.",
    icon: "Zap",
    isPublic: false,
  },
  {
    id: "plugin-5",
    name: "Os Jetsons",
    description: "Ferramenta de automacao e workflows futuristas.",
    icon: "Rocket",
    isPublic: false,
  },
  {
    id: "plugin-6",
    name: "Pica-Pau",
    description: "Modulo de notificacoes e alertas inteligentes.",
    icon: "Bird",
    isPublic: true,
  },
  {
    id: "plugin-7",
    name: "Bob Esponja",
    description: "Plataforma de comunicacao e colaboracao em equipe.",
    icon: "Waves",
    isPublic: false,
  },
  {
    id: "plugin-8",
    name: "Cavaleiros do Zodiaco",
    description: "Sistema de seguranca e controle de acesso avancado.",
    icon: "Shield",
    isPublic: false,
  },
]

const defaultPermissionTypes: PermissionType[] = [
  { id: "perm-1", pluginId: "plugin-1", name: "Leitura", description: "Visualizar dados de inventario" },
  { id: "perm-2", pluginId: "plugin-1", name: "Escrita", description: "Cadastrar e editar ativos" },
  { id: "perm-3", pluginId: "plugin-1", name: "Admin", description: "Gerenciar configuracoes do modulo" },
  { id: "perm-4", pluginId: "plugin-2", name: "Investigador", description: "Abrir e conduzir investigacoes" },
  { id: "perm-5", pluginId: "plugin-2", name: "Observador", description: "Acompanhar investigacoes" },
  { id: "perm-6", pluginId: "plugin-3", name: "Colaborador", description: "Acesso geral ao modulo" },
  { id: "perm-7", pluginId: "plugin-4", name: "Viewer", description: "Visualizar dashboards e metricas" },
  { id: "perm-8", pluginId: "plugin-4", name: "Editor", description: "Editar e criar dashboards" },
  { id: "perm-9", pluginId: "plugin-5", name: "Operador", description: "Executar workflows" },
  { id: "perm-10", pluginId: "plugin-5", name: "Designer", description: "Criar e editar workflows" },
  { id: "perm-11", pluginId: "plugin-6", name: "Receptor", description: "Receber alertas" },
  { id: "perm-12", pluginId: "plugin-6", name: "Configurador", description: "Configurar regras de alerta" },
  { id: "perm-13", pluginId: "plugin-7", name: "Membro", description: "Participar de canais" },
  { id: "perm-14", pluginId: "plugin-7", name: "Moderador", description: "Moderar canais e mensagens" },
  { id: "perm-15", pluginId: "plugin-8", name: "Auditor", description: "Visualizar logs de seguranca" },
  { id: "perm-16", pluginId: "plugin-8", name: "Guardiao", description: "Gerenciar regras de seguranca" },
]

export const AVAILABLE_UNITS = [
  "Geral",
  "Unidade SP",
  "Unidade RJ",
  "Unidade MG",
  "Unidade RS",
  "Unidade PR",
  "Unidade BA",
]

export const AVAILABLE_FACTORIES = [
  "Fabrica Norte",
  "Fabrica Sul",
  "Fabrica Leste",
  "Fabrica Oeste",
  "Fabrica Central",
]

class Store {
  users: User[] = [
    {
      id: "admin-1",
      username: "admin",
      password: "admin123",
      role: "admin",
      managedPlugins: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "manager-1",
      username: "manager",
      password: "manager123",
      role: "manager",
      managedPlugins: ["plugin-1", "plugin-2", "plugin-3", "plugin-4"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "manager-2",
      username: "manager2",
      password: "manager123",
      role: "manager",
      managedPlugins: ["plugin-5", "plugin-6", "plugin-7", "plugin-8"],
      createdAt: new Date().toISOString(),
    },
  ]

  accessRequests: AccessRequest[] = []
  plugins: Plugin[] = plugins
  permissionTypes: PermissionType[] = [...defaultPermissionTypes]
  notifications: Notification[] = []
  emailLogs: EmailLog[] = []

  private idCounter = 1

  generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${this.idCounter++}`
  }

  findUserByUsername(username: string): User | undefined {
    return this.users.find((u) => u.username === username)
  }

  findUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id)
  }

  getPluginManagers(pluginId: string): User[] {
    return this.users.filter(
      (u) => u.role === "manager" && u.managedPlugins.includes(pluginId)
    )
  }

  getAdmins(): User[] {
    return this.users.filter((u) => u.role === "admin")
  }

  getUserNotifications(userId: string): Notification[] {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  getUnreadNotificationCount(userId: string): number {
    return this.notifications.filter((n) => n.userId === userId && !n.read).length
  }

  getUserAccessForPlugin(userId: string, pluginId: string): AccessRequest | undefined {
    return this.accessRequests.find(
      (r) => r.userId === userId && r.pluginId === pluginId
    )
  }

  getUserAccesses(userId: string): AccessRequest[] {
    return this.accessRequests.filter((r) => r.userId === userId)
  }

  getPendingRequestsForManager(managedPlugins: string[]): AccessRequest[] {
    return this.accessRequests.filter(
      (r) => r.status === "pending" && managedPlugins.includes(r.pluginId)
    )
  }

  getAllPendingRequests(): AccessRequest[] {
    return this.accessRequests.filter((r) => r.status === "pending")
  }

  getPermissionTypesForPlugin(pluginId: string): PermissionType[] {
    return this.permissionTypes.filter((pt) => pt.pluginId === pluginId)
  }

  getPermissionTypeById(id: string): PermissionType | undefined {
    return this.permissionTypes.find((pt) => pt.id === id)
  }
}

export const store = new Store()
