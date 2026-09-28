type LogLevel = "info" | "warn" | "error";

type LogDetails = Record<string, unknown>;

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
  };
}

function write(level: LogLevel, event: string, details: LogDetails = {}) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
    ...(details["error"] !== undefined ? { error: serializeError(details["error"]) } : {}),
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  info: (event: string, details?: LogDetails) => write("info", event, details),
  warn: (event: string, details?: LogDetails) => write("warn", event, details),
  error: (event: string, details?: LogDetails) => write("error", event, details),
};
