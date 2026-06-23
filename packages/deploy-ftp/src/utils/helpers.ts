export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function timestamp(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${date}-${time}`;
}

export type LogLevel = "INFO" | "OK" | "WARN" | "ERROR";

const PREFIX: Record<LogLevel, string> = {
  INFO: "\u2139",
  OK: "\u2714",
  WARN: "\u26A0",
  ERROR: "\u2716",
};

export function log(level: LogLevel, msg: string): void {
  console.log(`[${PREFIX[level]}] ${msg}`);
}