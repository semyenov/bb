import type { TransformableInfo } from 'logform'
import type { LoggerOptions as WinstonLoggerOptions } from 'winston'

export interface LoggerMeta extends TransformableInfo {
  service: string
  module: string
  label: string
  version: string

  stack?: string
  timestamp?: string
}

export interface LoggerOptions extends WinstonLoggerOptions {
  defaultMeta: Partial<LoggerMeta>
}
