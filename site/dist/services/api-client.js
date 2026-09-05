import { appStore } from '../core/state';
export class ApiClient {
    baseUrl;
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }
    async request(endpoint, options = {}) {
        const lang = appStore.getState().language;
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${this.baseUrl}${endpoint}${separator}lang=${lang}`;
        const headers = {
            'Accept': 'application/json',
            ...(options.headers || {})
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
    async getStatus(refresh = false) {
        return this.request(`/api/v1/status${refresh ? '?refresh=true' : ''}`);
    }
    async getHealth() {
        return this.request('/api/v1/health');
    }
    async getRanks() {
        return this.request('/api/v1/ranks');
    }
    async getStaff() {
        return this.request('/api/v1/staff');
    }
    async getRules() {
        return this.request('/api/v1/rules');
    }
    async calculateUpgrade(currentRank, targetRank) {
        return this.request('/api/v1/ranks/calculate', {
            method: 'POST',
            body: JSON.stringify({ currentRank, targetRank })
        });
    }
}
export const apiClient = new ApiClient();
//# sourceMappingURL=api-client.js.map