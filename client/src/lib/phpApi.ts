/**
 * PHP API Client - connects to the PHP backend via Vite proxy
 * Base URL: /php/ (proxied to the PHP server at localhost:80/boarding-house-cms/php/)
 */

const PHP_BASE = '/php';

export interface PhpUser {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'tenant';
  phone?: string;
  address?: string;
  apartment_number?: string;
  is_active: number;
  created_at: string;
  last_login?: string;
  session_id?: string;
}

export interface PhpComplaint {
  id: number;
  tenant_id: number;
  category_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  tenant_name?: string;
}

export interface PhpNotification {
  id: number;
  user_id: number;
  complaint_id?: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export interface PhpCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

// Store for auth token
let authToken: string | null = localStorage.getItem('php_auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('php_auth_token', token);
  } else {
    localStorage.removeItem('php_auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

// Error class for PHP backend not being available
export class PhpBackendError extends Error {
  public isSetupError = true;
  constructor(message = 'PHP backend not available') {
    super(message);
    this.name = 'PhpBackendError';
  }
}

async function phpFetch<T>(endpoint: string, params: Record<string, string> = {}, options: RequestInit = {}): Promise<T> {
  const url = new URL(`${PHP_BASE}/${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (networkError) {
    throw new PhpBackendError(
      'Cannot reach the PHP server. Make sure XAMPP is running and the php/ folder is copied to C:\\xampp\\htdocs\\boarding-house-cms\\php\\'
    );
  }

  // Read raw text first to detect HTML responses (XAMPP error pages, etc.)
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  // If the response looks like HTML (XAMPP default page, 404, error page), throw a helpful error
  if (rawText.trim().startsWith('<!') || rawText.trim().startsWith('<html') || contentType.includes('text/html')) {
    throw new PhpBackendError(
      'PHP backend returned an HTML page instead of JSON. Make sure:\n1. XAMPP Apache is running\n2. The php/ folder is copied to C:\\xampp\\htdocs\\boarding-house-cms\\php\\\n3. The database is imported in phpMyAdmin'
    );
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new PhpBackendError(`Invalid response from PHP server: ${rawText.slice(0, 100)}`);
  }
  
  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }
  
  return data as T;
}

// ============================================================
// Auth API
// ============================================================
export const phpAuth = {
  async login(identifier: string, password: string): Promise<{ token: string; user: PhpUser }> {
    const data = await phpFetch<{ success: boolean; token: string; user: PhpUser }>(
      'auth.php',
      { action: 'login' },
      { method: 'POST', body: JSON.stringify({ email: identifier, username: identifier, password }) }
    );
    setAuthToken(data.token);
    return data;
  },

  async register(payload: {
    name: string; username: string; email: string; password: string; role?: string; phone?: string; address?: string;
  }): Promise<{ user_id: number }> {
    return phpFetch('auth.php', { action: 'register' }, { method: 'POST', body: JSON.stringify(payload) });
  },

  async logout(): Promise<void> {
    try {
      await phpFetch('auth.php', { action: 'logout' }, { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  async me(): Promise<PhpUser | null> {
    const data = await phpFetch<{ user: PhpUser | null }>('auth.php', { action: 'me' });
    return data.user;
  },
};

// ============================================================
// Complaints API
// ============================================================
export const phpComplaints = {
  async list(filters: Record<string, string> = {}): Promise<PhpComplaint[]> {
    const data = await phpFetch<{ data: PhpComplaint[] }>('complaints.php', { action: 'list', ...filters });
    return data.data;
  },

  async get(id: number): Promise<PhpComplaint> {
    const data = await phpFetch<{ data: PhpComplaint }>('complaints.php', { action: 'get', id: String(id) });
    return data.data;
  },

  async create(payload: {
    category_id: number; title: string; description: string; priority?: string;
  }): Promise<{ complaint_id: number }> {
    return phpFetch('complaints.php', { action: 'create' }, { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateStatus(id: number, status: string): Promise<void> {
    await phpFetch('complaints.php', { action: 'update_status' }, { method: 'POST', body: JSON.stringify({ id, status }) });
  },

  async delete(id: number): Promise<void> {
    await phpFetch('complaints.php', { action: 'delete', id: String(id) }, { method: 'DELETE' });
  },

  async stats(): Promise<{ total: number; pending: number; in_progress: number; resolved: number; rejected: number }> {
    const data = await phpFetch<{ data: any }>('complaints.php', { action: 'stats' });
    return data.data;
  },
};

// ============================================================
// Users API
// ============================================================
export const phpUsers = {
  async list(filters: Record<string, string> = {}): Promise<PhpUser[]> {
    const data = await phpFetch<{ data: PhpUser[] }>('users.php', { action: 'list', ...filters });
    return data.data;
  },

  async create(payload: object): Promise<{ user_id: number }> {
    return phpFetch('users.php', { action: 'create' }, { method: 'POST', body: JSON.stringify(payload) });
  },

  async update(id: number, payload: object): Promise<void> {
    await phpFetch('users.php', { action: 'update', id: String(id) }, { method: 'POST', body: JSON.stringify(payload) });
  },

  async delete(id: number): Promise<void> {
    await phpFetch('users.php', { action: 'delete', id: String(id) }, { method: 'DELETE' });
  },

  async getStaff(): Promise<PhpUser[]> {
    const data = await phpFetch<{ data: PhpUser[] }>('users.php', { action: 'staff' });
    return data.data;
  },

  async bulkCreate(users: any[]): Promise<{ count: number; errors: string[] }> {
    return phpFetch('users.php', { action: 'bulk_create' }, { method: 'POST', body: JSON.stringify({ users }) });
  },

  async stats(): Promise<{ total: number; admins: number; staff: number; tenants: number }> {
    const data = await phpFetch<{ data: any }>('users.php', { action: 'stats' });
    return data.data;
  },

  async updateProfile(payload: object): Promise<void> {
    await phpFetch('users.php', { action: 'update_profile' }, { method: 'POST', body: JSON.stringify(payload) });
  },
};

// ============================================================
// Notifications API
// ============================================================
export const phpNotifications = {
  async list(limit = 20): Promise<PhpNotification[]> {
    const data = await phpFetch<{ data: PhpNotification[] }>('notifications.php', { action: 'list', limit: String(limit) });
    return data.data;
  },

  async markRead(id: number): Promise<void> {
    await phpFetch('notifications.php', { action: 'mark_read' }, { method: 'POST', body: JSON.stringify({ id }) });
  },

  async markAllRead(): Promise<void> {
    await phpFetch('notifications.php', { action: 'mark_all_read' }, { method: 'POST' });
  },

  async unreadCount(): Promise<number> {
    const data = await phpFetch<{ data: { count: number } }>('notifications.php', { action: 'unread_count' });
    return data.data.count;
  },
};

// Simple cache for categories to avoid repeated requests
let categoriesCache: PhpCategory[] | null = null;

export const phpApi = {
  async categories(): Promise<PhpCategory[]> {
    if (categoriesCache) return categoriesCache;
    const data = await phpFetch<{ data: PhpCategory[] }>('api.php', { action: 'categories' });
    categoriesCache = data.data;
    return categoriesCache;
  },

  async analytics(): Promise<any> {
    const data = await phpFetch<{ data: any }>('api.php', { action: 'analytics' });
    return data.data;
  },

  async assignStaff(payload: { complaint_id: number; staff_id: number; deadline?: string; notes?: string }): Promise<void> {
    await phpFetch('api.php', { action: 'assign' }, { method: 'POST', body: JSON.stringify(payload) });
  },

  async listStaffAssignments(staffId?: number): Promise<any[]> {
    const params: Record<string, string> = { action: 'list_by_staff' };
    if (staffId) params.staff_id = String(staffId);
    const data = await phpFetch<{ data: any[] }>('api.php', params);
    return data.data;
  },

  async completeAssignment(assignmentId: number, notes?: string): Promise<void> {
    await phpFetch('api.php', { action: 'complete' }, { method: 'POST', body: JSON.stringify({ assignment_id: assignmentId, notes }) });
  },

  async submitFeedback(complaintId: number, rating: number, comment?: string): Promise<void> {
    await phpFetch('api.php', { action: 'submit_feedback' }, { method: 'POST', body: JSON.stringify({ complaint_id: complaintId, rating, comment }) });
  },
};
