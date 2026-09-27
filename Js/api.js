const API_BASE_URL = 'http://localhost:8082/api/v1';

export async function apiFetch(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || errorData?.message || `Error HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        if (response.status === 204) return null;

        return await response.json();
    } catch (error) {
        console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
        throw error;
    }
}