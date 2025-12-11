const IS_DEV = import.meta.env.DEV;

export const debug = {
  log: (...args: any[]) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (IS_DEV) {
      console.error(...args);
    }
  },
  info: (...args: any[]) => {
    if (IS_DEV) {
      console.info(...args);
    }
  }
};

// For critical errors that should always be logged
export const criticalLog = {
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args)
};