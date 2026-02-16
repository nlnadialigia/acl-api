const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

async function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const session = localStorage.getItem("acl-session");
  if (!session) return {};
  try {
    const {token} = JSON.parse(session);
    return token ? {Authorization: `Bearer ${token}`} : {};
  } catch {
    return {};
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("acl-session");
      window.location.href = "/";
    }
    throw new Error(data.message || "Erro na requisição");
  }

  return data;
}
