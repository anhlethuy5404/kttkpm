// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  category_id?: number;
  description?: string;
  ratings?: number;
  stock?: number;
  short_description?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Product endpoints
  async getProducts(): Promise<{ products: Product[] }> {
    return this.request('/api/products/');
  }

  async getProduct(id: number): Promise<Product> {
    return this.request(`/api/products/${id}/`);
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    return this.request('/api/products/', 'POST', product);
  }

  // Search/Filter
  async searchProducts(query: string): Promise<{ products: Product[] }> {
    return this.request(`/api/products/?search=${encodeURIComponent(query)}`);
  }

  async getProductsByCategory(categoryId: number): Promise<{ products: Product[] }> {
    return this.request(`/api/products/?category=${categoryId}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
