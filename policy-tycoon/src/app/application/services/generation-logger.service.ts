/**
 * Generation Logger Service for OpenTTD-style City Generation
 * 
 * Provides comprehensive logging for city generation steps and issues
 * for debugging and monitoring purposes.
 */

import { Injectable } from '@angular/core';

export interface GenerationLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: any;
}

@Injectable({
  providedIn: 'root'
})
export class GenerationLoggerService {
  private logs: GenerationLogEntry[] = [];
  private maxLogs = 1000; // Limit logs to prevent memory issues

  /**
   * Log an informational message
   */
  info(message: string, context?: any): void {
    this.addLog('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    this.addLog('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: any): void {
    this.addLog('error', message, context);
  }

  /**
   * Add a log entry
   */
  private addLog(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
    const entry: GenerationLogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };

    this.logs.push(entry);

    // Limit the number of logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also output to console for development
    switch (level) {
      case 'info':
        console.log(`[Generation] ${message}`, context || '');
        break;
      case 'warn':
        console.warn(`[Generation] ${message}`, context || '');
        break;
      case 'error':
        console.error(`[Generation] ${message}`, context || '');
        break;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): GenerationLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: 'info' | 'warn' | 'error'): GenerationLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get formatted log messages for display
   */
  getFormattedLogs(): string {
    return this.logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
  }
}