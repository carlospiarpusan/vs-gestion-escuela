interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

type ErrorWithStatus = Error & { status?: number };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error: unknown) {
  const err = error as ErrorWithStatus | null;
  const message = err?.message?.toLowerCase?.() ?? "";
  const status = err?.status;

  if (status != null) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }

  return [
    "failed to fetch",
    "fetch failed",
    "network",
    "timeout",
    "timed out",
    "connection",
    "econnreset",
    "temporarily unavailable",
  ].some((pattern) => message.includes(pattern));
}

export async function withRetry<T>(
  operation: () => PromiseLike<T>,
  options: RetryOptions = {}
) {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const shouldRetry = options.shouldRetry ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError;
}

export async function runSupabaseMutationWithRetry<T extends { error?: { message?: string } | null }>(
  operation: () => PromiseLike<T>,
  options?: RetryOptions
) {
  return withRetry(async () => {
    const result = await operation();

    if (result?.error) {
      const err = new Error(result.error.message || "Error al guardar datos.");
      throw err;
    }

    return result;
  }, options);
}

export async function fetchJsonWithRetry<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions
) {
  return withRetry(async () => {
    const response = await fetch(input, init);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const err = new Error(
        (body as { error?: string } | null)?.error || `Error HTTP ${response.status}`
      ) as ErrorWithStatus;
      err.status = response.status;
      throw err;
    }

    return body as T;
  }, options);
}
