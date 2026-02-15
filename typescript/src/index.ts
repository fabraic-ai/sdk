const DEFAULT_BASE_URL = 'https://api.fabraic.co'
const DEFAULT_SERVICE_VERSION = 'v1'

export type Primitive = string | number | boolean

export type ClientConfig = {
  apiKey?: string
  accessToken?: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, Primitive | Primitive[] | null | undefined>
  body?: unknown
  headers?: Record<string, string>
}

export type ServiceRequestOptions = RequestOptions & {
  pathParams?: Record<string, Primitive>
}

function normalizeServicePath(value: string): string {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '')
  if (!trimmed) throw new Error('`servicePath` must be a non-empty string')
  return trimmed
}

function applyPathParams(path: string, pathParams?: Record<string, Primitive>): string {
  if (!pathParams) return path

  return Object.entries(pathParams).reduce((current, [key, value]) => {
    return current.replaceAll(`{${key}}`, encodeURIComponent(String(value)))
  }, path)
}

export class FabraicClient {
  private readonly apiKey?: string
  private readonly accessToken?: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(config: ClientConfig = {}) {
    const { apiKey, accessToken, baseUrl = DEFAULT_BASE_URL, fetchImpl } = config

    if (!apiKey && !accessToken) {
      throw new Error('Provide either `apiKey` or `accessToken`')
    }

    this.apiKey = apiKey
    this.accessToken = accessToken
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetchImpl = fetchImpl ?? globalThis.fetch

    if (!this.fetchImpl) {
      throw new Error('No global fetch implementation found. Provide `fetchImpl`.')
    }
  }

  service(servicePath: string, version = DEFAULT_SERVICE_VERSION): ServiceClient {
    return new ServiceClient(this, servicePath, version)
  }

  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const { method = 'GET', query, body, headers = {} } = options
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const url = new URL(cleanPath, `${this.baseUrl}/`)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, String(item))
          }
        } else {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...this.authHeaders(),
      ...headers,
    }

    let payload: string | undefined
    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const response = await this.fetchImpl(url, {
      method,
      headers: requestHeaders,
      body: payload,
    })

    if (!response.ok) {
      const error = new Error(`Request failed with status ${response.status}`)
      ;(error as Error & { status?: number; body?: unknown }).status = response.status
      ;(error as Error & { status?: number; body?: unknown }).body = await this.safeJson(response)
      throw error
    }

    return this.safeJson(response)
  }

  private authHeaders(): Record<string, string> {
    if (this.accessToken) {
      return { Authorization: `Bearer ${this.accessToken}` }
    }

    if (this.apiKey) {
      return { 'x-api-key': this.apiKey }
    }

    return {}
  }

  private async safeJson(response: Response): Promise<unknown> {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
}

export class ServiceClient {
  private readonly client: FabraicClient
  private readonly servicePath: string
  private readonly version: string

  constructor(client: FabraicClient, servicePath: string, version = DEFAULT_SERVICE_VERSION) {
    this.client = client
    this.servicePath = normalizeServicePath(servicePath)
    this.version = version || DEFAULT_SERVICE_VERSION
  }

  private buildPath(path: string, pathParams?: Record<string, Primitive>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const substituted = applyPathParams(cleanPath, pathParams)
    return `/${this.servicePath}/${this.version}${substituted}`.replace(/\/+/g, '/')
  }

  request(path: string, options: ServiceRequestOptions = {}): Promise<unknown> {
    const { pathParams, ...rest } = options
    return this.client.request(this.buildPath(path, pathParams), rest)
  }

  get(path: string, options: Omit<ServiceRequestOptions, 'method'> = {}): Promise<unknown> {
    return this.request(path, { ...options, method: 'GET' })
  }

  post(path: string, options: Omit<ServiceRequestOptions, 'method'> = {}): Promise<unknown> {
    return this.request(path, { ...options, method: 'POST' })
  }

  put(path: string, options: Omit<ServiceRequestOptions, 'method'> = {}): Promise<unknown> {
    return this.request(path, { ...options, method: 'PUT' })
  }

  patch(path: string, options: Omit<ServiceRequestOptions, 'method'> = {}): Promise<unknown> {
    return this.request(path, { ...options, method: 'PATCH' })
  }

  delete(path: string, options: Omit<ServiceRequestOptions, 'method'> = {}): Promise<unknown> {
    return this.request(path, { ...options, method: 'DELETE' })
  }
}
