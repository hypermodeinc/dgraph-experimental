import debug from "debug";

declare global {
  interface Window {
    enableDebug: (pattern?: string) => void;
    disableDebug: () => void;
  }
}

const base = "@hypermode";

// @ts-ignore
const isBrowser = typeof window !== "undefined";

if (isBrowser && typeof localStorage !== "undefined") {
  const debugSetting = localStorage.getItem("debug");
  if (debugSetting) {
    debug.enable(debugSetting);
  }

  // @ts-ignore
  (window as any).enableDebug = (pattern = `${base}:*`) => {
    localStorage.setItem("debug", pattern);
    debug.enable(pattern);
    console.log(`Debug enabled: ${pattern}`);
  };

  // @ts-ignore
  (window as any).disableDebug = () => {
    localStorage.removeItem("debug");
    debug.disable();
    console.log("Debug disabled");
  };
}

export const createLogger = (packageName: string) => {
  const packageLogger = debug(`${base}:${packageName}`);

  return (namespace: string) => {
    const namespaceLogger = packageLogger.extend(namespace);

    return {
      info: namespaceLogger.extend("info"),
      warning: namespaceLogger.extend("warning"),
      error: namespaceLogger.extend("error"),
    };
  };
};

export const enableDebug = (pattern = `${base}:*`) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("debug", pattern);
  }
  debug.enable(pattern);
};

export const disableDebug = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("debug");
  }
  debug.disable();
};

export type Logger = ReturnType<ReturnType<typeof createLogger>>;
