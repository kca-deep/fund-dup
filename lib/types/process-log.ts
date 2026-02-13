export type LogLevel = "info" | "success" | "warning" | "error";

export interface ProcessLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  detail?: string;
  fileId?: string;
  fileName?: string;
}

export type LogEventPayload = Omit<ProcessLogEntry, "id" | "timestamp">;
