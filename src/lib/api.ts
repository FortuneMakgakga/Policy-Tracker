/**
 * Central API client for Policy-Tracker / Home Assist backend.
 * Covers all routes registered in api_routes.py (the-_great_Unifier).
 *
 * Set VITE_API_BASE in .env (see .env.example).
 * Auth is cookie/session based (credentials: 'include').
 * Optional X-Client-Id / X-SP-Id headers are sent when ids are in localStorage.
 */

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:5000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AddressInput = {
  label?: 'home' | 'business' | 'other';
  line1: string;
  line2?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  latitude: number;
  longitude: number;
  formatted_address?: string;
  place_id?: string;
};

export type Address = AddressInput & {
  id?: number;
  owner_type?: string;
  owner_id?: number;
};

export type Skill = {
  id: number;
  name: string;
  category: string;
};

export type VerificationDocument = {
  id: number;
  owner_type: string;
  owner_id: number;
  doc_type: string;
  file_url: string;
  original_filename?: string;
  mime_type?: string;
  file_size?: number;
  status: 'pending' | 'approved' | 'rejected' | string;
  notes?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at?: string;
};

export type PayoutMethod = {
  id: number;
  method_type: 'cash' | 'bank' | string;
  bank_id?: number | null;
  bank_name?: string | null;
  account_holder?: string | null;
  account_number?: string | null;
  branch_code?: string | null;
  account_type?: string | null;
  is_primary?: boolean;
};

export type Bank = {
  id: number;
  name: string;
  universal_branch_code?: string | null;
};

export type ClientProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  registration_step: number;
  profile_complete: boolean;
  profile_strength: number;
  current_latitude?: number | null;
  current_longitude?: number | null;
  addresses: Address[];
};

export type PendingSP = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  business_name?: string | null;
  province?: string | null;
  skills: string[];
  profile_strength: number;
  documents: VerificationDocument[];
  document_summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    has_id: boolean;
  };
  created_at?: string | null;
  onboarding_completed_at?: string | null;
};

export type DocType =
  | 'id_document'
  | 'certificate'
  | 'proof_of_address'
  | 'police_clearance'
  | 'other';

export type LocationEvent =
  | 'heartbeat'
  | 'assigned'
  | 'accepted'
  | 'arrived'
  | 'completed'
  | string;

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const clientId = localStorage.getItem('clientId');
  const spId = localStorage.getItem('spId');
  if (clientId) h['X-Client-Id'] = clientId;
  if (spId) h['X-SP-Id'] = spId;
  return h;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const isForm = init.body instanceof FormData;

  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...authHeaders(),
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    let extra: Record<string, unknown> | undefined;
    try {
      const data = (await res.json()) as Record<string, unknown>;
      message =
        (data.error as string) ||
        (data.status as string) ||
        (data.message as string) ||
        message;
      extra = data;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        /* ignore */
      }
    }
    const err = new Error(message) as Error & {
      status?: number;
      data?: Record<string, unknown>;
    };
    err.status = res.status;
    err.data = extra;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return undefined as T;
  return res.json() as Promise<T>;
}

function jsonBody(data: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(data) };
}

function putJson(data: unknown): RequestInit {
  return { method: 'PUT', body: JSON.stringify(data) };
}

// ---------------------------------------------------------------------------
// Client – registration (sectioned + legacy)
// ---------------------------------------------------------------------------

export const clientApi = {
  /** Step 1 – account. Body: { name, email, password, phone? } */
  registerStart(body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    return apiFetch<{
      message: string;
      client_id: number;
      registration_step: number;
      profile_strength: number;
      next_step: number;
    }>('/api/client/register/start', jsonBody(body));
  },

  /** Step 2 – home address (map + pin) */
  registerStep2(body: AddressInput) {
    return apiFetch<{
      message: string;
      registration_step: number;
      profile_strength: number;
      next_step: number;
      address?: Address;
    }>('/api/client/register/step/2', putJson(body));
  },

  /** Mark client onboarding complete (requires home address) */
  registerComplete() {
    return apiFetch<{
      message: string;
      client_id: number;
      profile_complete: boolean;
      profile_strength: number;
    }>('/api/client/register/complete', { method: 'POST' });
  },

  /** Legacy single-shot register (still supported by backend) */
  registerLegacy(body: {
    name: string;
    client_name?: string;
    email: string;
    phone?: string;
    password: string;
    address?: string;
    province?: string;
  }) {
    return apiFetch<{ message: string; client_id: number }>(
      '/api/client/register',
      jsonBody(body)
    );
  },

  login(body: { email: string; password: string }) {
    return apiFetch<{
      message: string;
      client_id: number;
      name: string;
      email: string;
      registration_step: number;
      profile_complete: boolean;
      profile_strength: number;
    }>('/api/client/login', jsonBody(body));
  },

  profile() {
    return apiFetch<ClientProfile>('/api/client/profile');
  },

  /** Location ping. Events: heartbeat | … */
  pingLocation(body: {
    latitude: number;
    longitude: number;
    accuracy_m?: number;
    event?: LocationEvent;
    job_request_id?: number;
    source?: string;
  }) {
    return apiFetch<{ message: string; recorded_at: string }>(
      '/api/client/location',
      jsonBody(body)
    );
  },
};

// ---------------------------------------------------------------------------
// Service provider – registration (sectioned + legacy)
// ---------------------------------------------------------------------------

export const spApi = {
  /** Step 1 – account. Body: { name, email, password, phone } */
  registerStart(body: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) {
    return apiFetch<{
      message: string;
      sp_id: number;
      registration_step: number;
      profile_strength: number;
      next_step: number;
      verification_status: string;
      is_active: boolean;
    }>('/api/sp/register/start', jsonBody(body));
  },

  /**
   * Step 2 – business info + addresses.
   * Body: { business_name?, bio?, years_experience?, addresses: AddressInput[] }
   * or a single address at top level for convenience.
   */
  registerStep2(
    body: {
      business_name?: string;
      bio?: string;
      years_experience?: number;
      addresses?: AddressInput[];
    } & Partial<AddressInput>
  ) {
    return apiFetch<{
      message: string;
      registration_step: number;
      profile_strength: number;
      next_step: number;
    }>('/api/sp/register/step/2', putJson(body));
  },

  /**
   * Step 3 – skills.
   * Body: { skill_ids: number[] } or { skills: string[] } depending on backend seed.
   */
  registerStep3(body: { skill_ids: number[] } | { skills: string[] }) {
    return apiFetch<{
      message: string;
      registration_step: number;
      profile_strength: number;
      next_step: number;
      skills?: Skill[];
    }>('/api/sp/register/step/3', putJson(body));
  },

  /**
   * Step 4 – payout method.
   * method_type: 'cash' | 'bank'
   */
  registerStep4(body: {
    method_type: 'cash' | 'bank';
    bank_id?: number;
    bank_name?: string;
    account_holder?: string;
    account_number?: string;
    branch_code?: string;
    account_type?: string;
  }) {
    return apiFetch<{
      message: string;
      payout_method: Partial<PayoutMethod>;
      registration_step: number;
      profile_strength: number;
      next_step: string;
      hint?: string;
    }>('/api/sp/register/step/4', putJson(body));
  },

  /** Submit registration for admin review */
  registerComplete() {
    return apiFetch<{
      message: string;
      sp_id: number;
      profile_complete: boolean;
      profile_strength: number;
      verification_status: string;
      is_active: boolean;
    }>('/api/sp/register/complete', { method: 'POST' });
  },

  /** Legacy single-shot register */
  registerLegacy(body: {
    name: string;
    email: string;
    phone: string;
    province?: string;
    skill?: string;
    latitude?: number | null;
    longitude?: number | null;
    password: string;
  }) {
    return apiFetch<{
      message: string;
      sp_id: number;
      verification_status: string;
      is_active: boolean;
    }>('/api/sp/register', jsonBody(body));
  },

  login(body: { email: string; password: string }) {
    return apiFetch<{
      message: string;
      sp_id: number;
      name: string;
      email: string;
      is_active: boolean;
      verification_status: string;
      registration_step: number;
      profile_complete: boolean;
      profile_strength: number;
    }>('/api/sp/login', jsonBody(body));
  },

  /** Upload verification document (multipart). doc_type required. */
  async uploadDocument(file: File, doc_type: DocType, notes?: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('doc_type', doc_type);
    if (notes) form.append('notes', notes);
    return apiFetch<{
      message: string;
      document: VerificationDocument;
      profile_strength: number;
      registration_step: number;
    }>('/api/sp/register/documents', {
      method: 'POST',
      body: form,
    });
  },

  listDocuments() {
    return apiFetch<{ documents: VerificationDocument[]; count: number }>(
      '/api/sp/register/documents'
    );
  },

  deleteDocument(docId: number) {
    return apiFetch<{ message: string }>(
      `/api/sp/register/documents/${docId}`,
      { method: 'DELETE' }
    );
  },

  listPayoutMethods() {
    return apiFetch<{ methods: PayoutMethod[] } | PayoutMethod[]>(
      '/api/sp/payout-methods'
    );
  },

  addPayoutMethod(body: {
    method_type: 'cash' | 'bank';
    bank_id?: number;
    bank_name?: string;
    account_holder?: string;
    account_number?: string;
    branch_code?: string;
    account_type?: string;
    is_primary?: boolean;
  }) {
    return apiFetch<{ message: string; id: number }>(
      '/api/sp/payout-methods',
      jsonBody(body)
    );
  },

  pingLocation(body: {
    latitude: number;
    longitude: number;
    accuracy_m?: number;
    event?: LocationEvent;
    job_request_id?: number;
    source?: string;
  }) {
    return apiFetch<{ message: string; recorded_at: string }>(
      '/api/sp/location',
      jsonBody(body)
    );
  },
};

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const lookupsApi = {
  skills() {
    return apiFetch<{ skills: Skill[]; by_category: Record<string, Skill[]> }>(
      '/api/skills'
    );
  },

  banks() {
    return apiFetch<Bank[]>('/api/banks');
  },
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminApi = {
  login(body: { email?: string; username?: string; password: string }) {
    return apiFetch<{
      message: string;
      admin_id?: number;
      name?: string;
      role: string;
    }>('/api/admin/login', jsonBody(body));
  },

  listPendingSps() {
    return apiFetch<PendingSP[]>('/api/admin/sp/pending');
  },

  getSp(spId: number) {
    return apiFetch<Record<string, unknown>>(`/api/admin/sp/${spId}`);
  },

  /** Activate SP. Pass { force: true } to skip document checks. */
  activateSp(spId: number, body: { force?: boolean } = {}) {
    return apiFetch<{
      message: string;
      sp_id: number;
      verification_status: string;
      is_active: boolean;
      activated_at?: string;
    }>(`/api/admin/sp/${spId}/activate`, jsonBody(body));
  },

  rejectSp(spId: number, body: { reason?: string } = {}) {
    return apiFetch<{
      message: string;
      sp_id: number;
      verification_status: string;
      is_active: boolean;
    }>(`/api/admin/sp/${spId}/reject`, jsonBody(body));
  },

  listPendingDocuments() {
    return apiFetch<VerificationDocument[] | { documents: VerificationDocument[] }>(
      '/api/admin/documents/pending'
    );
  },

  getDocument(docId: number) {
    return apiFetch<VerificationDocument>(`/api/admin/documents/${docId}`);
  },

  approveDocument(docId: number) {
    return apiFetch<{ message: string; document: VerificationDocument }>(
      `/api/admin/documents/${docId}/approve`,
      { method: 'POST' }
    );
  },

  rejectDocument(docId: number, body: { reason: string; notes?: string }) {
    return apiFetch<{ message: string; document: VerificationDocument }>(
      `/api/admin/documents/${docId}/reject`,
      jsonBody(body)
    );
  },

  listSpDocuments(spId: number) {
    return apiFetch<{
      sp_id: number;
      sp_name: string;
      sp_email: string;
      documents: VerificationDocument[];
      count: number;
    }>(`/api/admin/sp/${spId}/documents`);
  },
};

// ---------------------------------------------------------------------------
// Convenience: absolute URL for uploaded documents
// ---------------------------------------------------------------------------

export function documentUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_BASE}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

/** Default export grouped for ergonomic imports */
const api = {
  client: clientApi,
  sp: spApi,
  admin: adminApi,
  lookups: lookupsApi,
  fetch: apiFetch,
  documentUrl,
  API_BASE,
};

export default api;
