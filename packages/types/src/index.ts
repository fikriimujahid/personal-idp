export enum ServiceLifecycleState {
  REQUESTED = 'REQUESTED',
  CREATING = 'CREATING',
  PROVISIONING = 'PROVISIONING',
  DEPLOYING = 'DEPLOYING',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
}

export enum TemplateType {
  NESTJS_API = 'nestjs-api',
  REACT_ADMIN = 'react-admin',
}

export interface ServiceMetadata {
  name: string;
  description: string;
  owner: string;
  port: number;
  healthCheckPath: string;
  templateType: TemplateType;
}

export interface ServiceStatus {
  name: string;
  status: ServiceLifecycleState;
  createdAt: string;
  lastDeployedAt: string | null;
  owner: string;
  repositoryUrl: string;
  serviceUrl: string;
  templateType: TemplateType;
  deprecatedAt: string | null;
  archivedAt: string | null;
  failureReason: string | null;
  retryCount: number;
}

export interface CreateServiceRequest {
  name: string;
  description: string;
  owner: string;
  port: number;
  healthCheckPath: string;
  templateType: TemplateType;
}

export interface CreateServiceResponse {
  service: ServiceStatus;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}
