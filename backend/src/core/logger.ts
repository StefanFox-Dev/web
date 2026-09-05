export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string | undefined;
  context?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
}

export class Logger {
  private readonly context: string;
  private minLevel: LogLevel;

  constructor(context = 'App', minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  public setLogLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (/pass|token|secret|auth|key/i.test(k)) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  private write(level: LogLevel, levelName: string, message: string, meta?: Record<string, unknown>, err?: Error, reqId?: string): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      context: this.context,
      ...(reqId ? { requestId: reqId } : {}),
      ...(meta && Object.keys(meta).length > 0 ? { metadata: this.sanitizeMetadata(meta) } : {}),
      ...(err ? {
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack
        }
      } : {})
    };

    const serialized = JSON.stringify(entry);
    if (level >= LogLevel.ERROR) {
      process.stderr.write(`${serialized}\n`);
    } else {
      process.stdout.write(`${serialized}\n`);
    }
  }

  public debug(message: string, meta?: Record<string, unknown>, reqId?: string): void {
    this.write(LogLevel.DEBUG, 'DEBUG', message, meta, undefined, reqId);
  }

  public info(message: string, meta?: Record<string, unknown>, reqId?: string): void {
    this.write(LogLevel.INFO, 'INFO', message, meta, undefined, reqId);
  }

  public warn(message: string, meta?: Record<string, unknown>, reqId?: string): void {
    this.write(LogLevel.WARN, 'WARN', message, meta, undefined, reqId);
  }

  public error(message: string, error?: Error, meta?: Record<string, unknown>, reqId?: string): void {
    this.write(LogLevel.ERROR, 'ERROR', message, meta, error, reqId);
  }

  public child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`, this.minLevel);
  }
}
