export interface McpService {
    id: string
    name: string
    description: string
    version: string
    status: 'running' | 'stopped' | 'error'
    port?: number
    bin?: string
    repository?: string
    author?: string
    license?: string
}

export interface ServiceStats {
    total: number
    running: number
    stopped: number
    error: number
}
