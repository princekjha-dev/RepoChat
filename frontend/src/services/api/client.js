import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30s timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Response interceptor with retry logic for transient failures.
 * Retries on network errors or 5xx server errors, with exponential backoff.
 */
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Determine if we should retry
    const isNetworkError = !response; // Network error (no response)
    const isServerError = response && response.status >= 500 && response.status <= 599;
    const isRateLimited = response && response.status === 429;
    
    const shouldRetry = isNetworkError || isServerError || isRateLimited;

    if (!config || !config.retry || !shouldRetry) {
      const errorMsg = response?.data?.error || error.message || 'API request failed';
      console.error('[API Error]', {
        method: config?.method,
        url: config?.url,
        status: response?.status,
        error: errorMsg,
      });
      return Promise.reject(new Error(errorMsg));
    }

    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= config.retry) {
      const errorMsg = response?.data?.error || error.message || 'API request failed after retries';
      console.error('[API Error - Max Retries]', {
        method: config.method,
        url: config.url,
        status: response?.status,
        attempts: config.retryCount,
        error: errorMsg,
      });
      return Promise.reject(new Error(errorMsg));
    }

    config.retryCount += 1;
    const delay = (config.retryDelay || 1000) * Math.pow(2, config.retryCount - 1);
    
    console.warn(`[API Retry] ${config.method.toUpperCase()} ${config.url} - Attempt ${config.retryCount}/${config.retry}, retrying in ${delay}ms`);
    
    await new Promise((resolve) => setTimeout(resolve, delay));
    return client(config);
  }
);

/**
 * Request interceptor for logging and request preparation.
 */
client.interceptors.request.use(
  (config) => {
    // Set retry defaults if not specified
    if (!config.retry) {
      config.retry = 3;
      config.retryDelay = 1000;
    }
    
    console.debug(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

export default client;
export { API_BASE };
