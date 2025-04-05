import fs from "fs";
import path from "path";

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const envToLogLevel = {
  local: LogLevel.DEBUG,
  test: LogLevel.DEBUG,
  development: LogLevel.DEBUG,
  production: LogLevel.INFO,
};

class BaseLogger {
  private logStream: fs.WriteStream;
  private consoleLogLevel: LogLevel;
  private writeLogLevel: LogLevel;

  constructor(logFilePath: string) {
    this.logStream = fs.createWriteStream(path.resolve(logFilePath), {
      flags: "a",
    });
    this.consoleLogLevel =
      envToLogLevel[process.env.ENVIRONMENT as keyof typeof envToLogLevel];
    this.writeLogLevel =
      envToLogLevel[process.env.ENVIRONMENT as keyof typeof envToLogLevel];
  }

  private log(level: keyof typeof LogLevel, message: string): void {
    if (LogLevel[level] >= this.consoleLogLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} [${level}] ${message}\n`;
      if (LogLevel[level] >= this.writeLogLevel)
        this.logStream.write(logMessage);
      console.log(logMessage);
    }
  }

  debug(message: string): void {
    this.log("DEBUG", message);
  }

  info(message: string): void {
    this.log("INFO", message);
  }

  warn(message: string): void {
    this.log("WARN", message);
  }

  error(message: string): void {
    this.log("ERROR", message);
  }
}

export default BaseLogger;
