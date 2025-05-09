import { useState, useCallback, useEffect } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

interface UseApiRequestOptions<T> {
  /**
   * URL for the API request
   */
  url?: string;
  /**
   * Request method
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /**
   * Request payload/data
   */
  data?: any;
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  /**
   * Query parameters
   */
  params?: Record<string, any>;
  /**
   * Whether to execute the request on mount
   */
  executeOnMount?: boolean;
  /**
   * Optional callback when the request succeeds
   */
  onSuccess?: (data: T) => void;
  /**
   * Optional callback when the request fails
   */
  onError?: (error: AxiosError) => void;
}

/**
 * Custom hook for handling API requests with loading states
 */
export function useApiRequest<T = any>(options: UseApiRequestOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const {
    url,
    method = 'GET',
    data: requestData,
    headers,
    params,
    executeOnMount = false,
    onSuccess,
    onError,
  } = options;

  const execute = useCallback(
    async (customOptions: Partial<UseApiRequestOptions<T>> = {}) => {
      if (!url && !customOptions.url) {
        console.error('URL is required for API request');
        return;
      }

      setIsLoading(true);
      setError(null);

      const requestConfig: AxiosRequestConfig = {
        url: customOptions.url || url,
        method: customOptions.method || method,
        headers: {
          ...headers,
          ...customOptions.headers,
        },
        params: {
          ...params,
          ...customOptions.params,
        },
      };

      // Only add data for non-GET requests
      if (requestConfig.method !== 'GET') {
        requestConfig.data = customOptions.data || requestData;
      }

      try {
        const response = await axios(requestConfig);
        setData(response.data);
        
        if (onSuccess) {
          onSuccess(response.data);
        }
        if (customOptions.onSuccess) {
          customOptions.onSuccess(response.data);
        }
        
        return response.data;
      } catch (err) {
        const axiosError = err as AxiosError;
        setError(axiosError);
        
        if (onError) {
          onError(axiosError);
        }
        if (customOptions.onError) {
          customOptions.onError(axiosError);
        }
        
        throw axiosError;
      } finally {
        setIsLoading(false);
      }
    },
    [url, method, requestData, headers, params, onSuccess, onError]
  );

  useEffect(() => {
    if (executeOnMount && url) {
      execute().catch((err) => {
        console.error('Failed to execute API request on mount:', err);
      });
    }
  }, [execute, executeOnMount, url]);

  return {
    data,
    isLoading,
    error,
    execute,
    reset: () => {
      setData(null);
      setError(null);
    },
  };
} 