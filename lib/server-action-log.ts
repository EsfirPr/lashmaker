import "server-only";

type ServerActionLogContext = Record<string, unknown>;

export function logServerActionError(
  actionName: string,
  error: unknown,
  context: ServerActionLogContext = {}
) {
  if (error instanceof Error) {
    console.error(`[server-action:${actionName}]`, {
      ...context,
      message: error.message,
      stack: error.stack
    });
    return;
  }

  console.error(`[server-action:${actionName}]`, {
    ...context,
    error
  });
}
