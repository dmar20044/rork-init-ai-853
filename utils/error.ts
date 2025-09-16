export function serializeError(error: unknown): string {
  try {
    if (error instanceof Error) {
      const base = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...(error as any),
      };
      return JSON.stringify(base, null, 2);
    }
    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error, null, 2);
    }
    return String(error);
  } catch {
    try {
      return String(error);
    } catch {
      return '[unserializable error]';
    }
  }
}

export function errorDetails(error: any): Record<string, unknown> {
  if (!error || typeof error !== 'object') return { value: error };
  return {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status,
  };
}
