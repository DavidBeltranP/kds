declare module 'mssql' {
  export interface config {
    server: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    options?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
      enableArithAbort?: boolean;
    };
    pool?: {
      max?: number;
      min?: number;
      idleTimeoutMillis?: number;
    };
    connectionTimeout?: number;
    requestTimeout?: number;
  }

  export class ConnectionPool {
    constructor(config: config);
    connect(): Promise<ConnectionPool>;
    close(): Promise<void>;
    request(): Request;
  }

  export class Request {
    input(name: string, value: unknown): Request;
    query<T = Record<string, unknown>>(query: string): Promise<{ recordset: T[] }>;
  }
}
