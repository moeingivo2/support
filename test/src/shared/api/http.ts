import { getToken, clearAuth } from '@/shared/lib/auth-storage'

export class HttpApiError extends Error {
  readonly status: number
  readonly fieldErrors?: Record<string, string[]>

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = 'HttpApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload?: unknown
  query?: Record<string, string | number | undefined>
}

export async function request<TResponse>(url: string, options: RequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', payload, query } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let body: string | undefined
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(payload)
  }

  let fullUrl = url
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.append(key, String(value))
      }
    }
    const qs = params.toString()
    if (qs) fullUrl += `?${qs}`
  }

  let response: Response
  try {
    response = await fetch(fullUrl, { method, headers, body })
  } catch {
    throw new HttpApiError('اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.', 0)
  }

  if (response.status === 401) {
    clearAuth()
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }

  const responseBody = await readJsonBody(response)

  if (!response.ok) {
    throw new HttpApiError(
      getServerMessage(responseBody) ?? `درگاه ارتباطی با کد ${response.status} پاسخ داد.`,
      response.status,
      getFieldErrors(responseBody),
    )
  }

  return responseBody as TResponse
}

export function getJson<TResponse>(
  url: string,
  query?: Record<string, string | number | undefined>,
): Promise<TResponse> {
  return request<TResponse>(url, { query })
}

export function postJson<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse> {
  return request<TResponse>(url, { method: 'POST', payload })
}

export function putJson<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse> {
  return request<TResponse>(url, { method: 'PUT', payload })
}

export function deleteJson<TResponse>(url: string): Promise<TResponse> {
  return request<TResponse>(url, { method: 'DELETE' })
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getServerMessage(payload: unknown): string | undefined {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message
  }
  return undefined
}

function getFieldErrors(payload: unknown): Record<string, string[]> | undefined {
  if (!isRecord(payload) || !isRecord(payload.errors)) {
    return undefined
  }

  const fieldErrors: Record<string, string[]> = {}

  for (const [field, messages] of Object.entries(payload.errors)) {
    if (!Array.isArray(messages)) {
      continue
    }

    const validMessages = messages.filter((message): message is string => typeof message === 'string')

    if (validMessages.length > 0) {
      fieldErrors[field] = validMessages
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
