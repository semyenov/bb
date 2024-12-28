import type { TransformableInfo } from 'logform'
import type { LoggerOptions as WinstonLoggerOptions } from 'winston'

export interface LoggerMeta extends TransformableInfo {
  label: string
  module: string
  service: string
  stack?: string

  timestamp?: string
  version: string
}

export interface LoggerOptions extends WinstonLoggerOptions {
  defaultMeta: Partial<LoggerMeta>
}
