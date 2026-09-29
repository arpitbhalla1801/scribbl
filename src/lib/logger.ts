// Structured (JSON) logging for server-side code, so log lines are greppable
// and parseable by a log aggregator. No Sentry/error-tracking service yet -
// this just gets error context (message, stack) into a consistent shape.
type Level = 'info' | 'warn' | 'error';
type Meta = Record<string, unknown>;

function serialize(meta?: Meta): Meta | undefined {
  if (!meta?.error) return meta;
  const { error, ...rest } = meta;
  if (!(error instanceof Error)) return meta;
  return { ...rest, error: { name: error.name, message: error.message, stack: error.stack } };
}

function emit(level: Level, message: string, meta?: Meta) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...serialize(meta) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Meta) => emit('info', message, meta),
  warn: (message: string, meta?: Meta) => emit('warn', message, meta),
  error: (message: string, meta?: Meta) => emit('error', message, meta),
};
