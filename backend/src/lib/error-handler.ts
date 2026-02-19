// Utility for safe error handling
export function safeError(error: unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return { message: String((error as { message: unknown }).message) };
  }
  return { message: 'Unknown error occurred' };
}