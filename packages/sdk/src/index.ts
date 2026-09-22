import type {
  CreateServiceRequest,
  CreateServiceResponse,
  ServiceStatus,
} from '@fikri-idp/types';

export interface IdpSdkConfig {
  baseUrl: string;
}

export class IdpSdk {
  private readonly baseUrl: string;

  constructor(config: IdpSdkConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async getServices(): Promise<ServiceStatus[]> {
    const response = await fetch(`${this.baseUrl}/api/services`);
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }
    return response.json() as Promise<ServiceStatus[]>;
  }

  async getService(name: string): Promise<ServiceStatus> {
    const response = await fetch(`${this.baseUrl}/api/services/${name}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch service: ${response.statusText}`);
    }
    return response.json() as Promise<ServiceStatus>;
  }

  async createService(
    request: CreateServiceRequest,
  ): Promise<CreateServiceResponse> {
    const response = await fetch(`${this.baseUrl}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to create service: ${response.statusText}`);
    }
    return response.json() as Promise<CreateServiceResponse>;
  }
}
