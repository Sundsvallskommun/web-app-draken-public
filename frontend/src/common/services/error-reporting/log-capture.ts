import { CapturedLogEntry, LogLevel, LogSource } from './types';

const LOG_BUFFER_SIZE = 100;
const MAX_MESSAGE_LENGTH = 1000;

const IGNORED_PATTERNS = [
  '[HMR]',
  '[Fast Refresh]',
  'React DevTools',
  'Download the React DevTools',
  '[next]',
  'hot-reloader',
];

let buffer: CapturedLogEntry[] = [];
let initialized = false;

const originalConsole: Record<LogLevel, (...args: unknown[]) => void> = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatMessage(args: unknown[]): string {
  const message = args.map(stringifyArg).join(' ');
  return message.length > MAX_MESSAGE_LENGTH ? message.slice(0, MAX_MESSAGE_LENGTH) + '...' : message;
}

function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => message.includes(pattern));
}

function addEntry(level: LogLevel, message: string, source: LogSource = 'console'): void {
  if (source === 'console' && shouldIgnore(message)) return;

  const entry: CapturedLogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    source,
  };

  if (buffer.length >= LOG_BUFFER_SIZE) {
    buffer.shift();
  }
  buffer.push(entry);
}

function wrapConsoleMethod(level: LogLevel): void {
  const original = originalConsole[level];
  console[level] = (...args: unknown[]) => {
    addEntry(level, formatMessage(args));
    original.apply(console, args);
  };
}

function handleWindowError(event: ErrorEvent): void {
  const message = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
  addEntry('error', message, 'unhandled');
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason = event.reason;
  const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : stringifyArg(reason);
  addEntry('error', message, 'promise-rejection');
}

export function captureNetworkError(url: string, status: number, message: string): void {
  addEntry('error', `[${status}] ${url}: ${message}`, 'network');
}

export function initLogCapture(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const levels: LogLevel[] = ['log', 'warn', 'error', 'info', 'debug'];
  levels.forEach(wrapConsoleMethod);

  window.addEventListener('error', handleWindowError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

export function getLogBuffer(): CapturedLogEntry[] {
  return [...buffer];
}

export function clearLogBuffer(): void {
  buffer = [];
}
