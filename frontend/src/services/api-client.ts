import { appStore } from '../core/state';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const lang = appStore.getState().language;
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${separator}lang=${lang}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  public async getStatus(refresh = false): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/status${refresh ? '?refresh=true' : ''}`);
  }

  public async getHealth(): Promise<any> {
    return this.request('/api/v1/health');
  }

  public async getRanks(): Promise<ApiResponse<any[]>> {
    return this.request('/api/v1/ranks');
  }

  public async getStaff(): Promise<ApiResponse<any[]>> {
    return this.request('/api/v1/staff');
  }

  public async getRules(): Promise<ApiResponse<Record<string, any>>> {
    return this.request('/api/v1/rules');
  }

  public async calculateUpgrade(currentRank: string, targetRank: string): Promise<ApiResponse<any>> {
    return this.request('/api/v1/ranks/calculate', {
      method: 'POST',
      body: JSON.stringify({ currentRank, targetRank })
    });
  }
}

export const apiClient = new ApiClient();
