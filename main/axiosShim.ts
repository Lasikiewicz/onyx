export interface AxiosResponse<T = any> {
  data: T;
  status: number;
}

export interface AxiosRequestConfig {
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface AxiosInstance {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

function buildUrl(baseURL: string | undefined, url: string, params?: Record<string, any>): string {
  const isAbsoluteUrl = /^https?:\/\//i.test(url);

  let full: URL;
  if (!baseURL || isAbsoluteUrl) {
    full = new URL(url, baseURL || undefined);
  } else {
    const normalizedBase = baseURL.replace(/\/+$/, '');
    const normalizedPath = url.replace(/^\/+/, '');
    full = new URL(`${normalizedBase}/${normalizedPath}`);
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        full.searchParams.set(key, String(value));
      }
    }
  }
  return full.toString();
}

async function doRequest<T>(
  method: 'GET' | 'POST',
  url: string,
  {
    baseURL,
    data,
    params,
    headers,
  }: { baseURL?: string; data?: any; params?: Record<string, any>; headers?: Record<string, string> } = {}
): Promise<AxiosResponse<T>> {
  const finalUrl = buildUrl(baseURL, url, params);
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': data != null && typeof data === 'string' ? 'text/plain' : 'application/json',
      ...(headers || {}),
    },
  };

  if (method === 'POST') {
    if (data == null) {
      // leave body undefined
    } else if (typeof data === 'string') {
      init.body = data;
    } else {
      init.body = JSON.stringify(data);
    }
  }

  let response: Response;
  try {
    response = await fetch(finalUrl, init);
  } catch (err: any) {
    const error: any = new Error(err?.message || 'Network error');
    error.isAxiosError = true;
    throw error;
  }

  const status = response.status;
  let parsed: any = null;
  const text = await response.text().catch(() => '');
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const error: any = new Error(
      typeof parsed === 'string'
        ? parsed
        : parsed?.message || `Request failed with status code ${status}`
    );
    error.isAxiosError = true;
    error.response = { status, data: parsed };
    throw error;
  }

  return { status, data: parsed as T };
}

function createInstance(baseURL?: string): AxiosInstance {
  return {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
      return doRequest<T>('GET', url, {
        baseURL,
        params: config?.params,
        headers: config?.headers,
      });
    },
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
      return doRequest<T>('POST', url, {
        baseURL,
        data,
        params: config?.params,
        headers: config?.headers,
      });
    },
  };
}

const axios = {
  create(config: { baseURL?: string } = {}): AxiosInstance {
    return createInstance(config.baseURL);
  },
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return doRequest<T>('GET', url, { params: config?.params, headers: config?.headers });
  },
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return doRequest<T>('POST', url, { data, params: config?.params, headers: config?.headers });
  },
  isAxiosError(error: any): boolean {
    return !!(error && error.isAxiosError);
  },
};

export default axios;

