let getAuthTokenFn: (() => Promise<string | null>) | null = null;
let getActiveCompanyIdFn: (() => string | null) | null = null;

export function configureApiClient(
  getToken: () => Promise<string | null>,
  getCompanyId: () => string | null
) {
  getAuthTokenFn = getToken;
  getActiveCompanyIdFn = getCompanyId;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getAuthTokenFn ? await getAuthTokenFn() : null;
  const companyId = getActiveCompanyIdFn ? getActiveCompanyIdFn() : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (companyId && !headers['X-Company-Id']) {
    headers['X-Company-Id'] = companyId;
  }

  let finalBody: BodyInit | null | undefined = undefined;

  if (options.body) {
    if (options.body instanceof FormData) {
      finalBody = options.body;
      // Do not set Content-Type header manually for FormData, browser will set it with boundary
    } else if (typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      finalBody = JSON.stringify(options.body);
    } else {
      finalBody = options.body;
    }
  }

  const apiBaseUrl = (import.meta as any).env?.VITE_API_URL
    ? String((import.meta as any).env.VITE_API_URL).replace(/\/+$/, '')
    : '';

  let url = endpoint;
  if (apiBaseUrl && endpoint.startsWith('/')) {
    url = `${apiBaseUrl}${endpoint}`;
  }
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: finalBody,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
