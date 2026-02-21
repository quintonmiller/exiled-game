/** Log levels — higher number = more verbose */
export const LogLevel = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.OFF]: 'OFF',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
};

const CATEGORY_COLORS: Record<string, string> = {
  NEEDS: '#ff6b6b',
  AI: '#4ecdc4',
  PRODUCTION: '#ffe66d',
  STORAGE: '#a8e6cf',
  POPULATION: '#ff8b94',
  CONSTRUCTION: '#ffd93d',
  GAME: '#6c5ce7',
  DISEASE: '#fd79a8',
  WEATHER: '#74b9ff',
  TRADE: '#fdcb6e',
};

class LoggerImpl {
  private _level: LogLevel = LogLevel.OFF;

  get level(): LogLevel {
    return this._level;
  }

  set level(l: LogLevel) {
    this._level = l;
    console.log(
      `%c[LOGGER] Log level set to ${LOG_LEVEL_NAMES[l]}`,
      'color: #6c5ce7; font-weight: bold',
    );
  }

  /** Cycle to next log level (OFF -> ERROR -> WARN -> INFO -> DEBUG -> OFF) */
  cycleLevel(): LogLevel {
    const next = ((this._level + 1) % 5) as LogLevel;
    this.level = next;
    return next;
  }

  error(category: string, message: string, ...args: any[]): void {
    if (this._level < LogLevel.ERROR) return;
    const color = CATEGORY_COLORS[category] || '#ff0000';
    console.error(`%c[${category}] ${message}`, `color: ${color}; font-weight: bold`, ...args);
  }

  warn(category: string, message: string, ...args: any[]): void {
    if (this._level < LogLevel.WARN) return;
    const color = CATEGORY_COLORS[category] || '#ffaa00';
    console.warn(`%c[${category}] ${message}`, `color: ${color}`, ...args);
  }

  info(category: string, message: string, ...args: any[]): void {
    if (this._level < LogLevel.INFO) return;
    const color = CATEGORY_COLORS[category] || '#00aaff';
    console.log(`%c[${category}] ${message}`, `color: ${color}`, ...args);
  }

  debug(category: string, message: string, ...args: any[]): void {
    if (this._level < LogLevel.DEBUG) return;
    const color = CATEGORY_COLORS[category] || '#888888';
    console.debug(`%c[${category}] ${message}`, `color: ${color}`, ...args);
  }
}

/** Singleton logger instance — import and use directly */
export const logger = new LoggerImpl();
