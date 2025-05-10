declare module 'ws' {
  export class WebSocket {
    constructor(address: string, protocols?: string | string[], options?: any);
    on(event: string, listener: Function): this;
    close(): void;
    send(data: any, options?: any, callback?: Function): void;
    readonly readyState: number;
    readonly url: string;
  }
} 