import type { TransformableInfo } from 'logform'

import { inspect } from 'node:util'
import {
  config as c,
  createLogger as createWinstonLogger,
  format as f,
  transports as t,
} from 'winston'

import type { LoggerMeta, LoggerOptions } from './types'

const {
  colors: defaultColors,
  levels: defaultLevels,
} = c.npm

export function createLogger({
  defaultMeta,
  levels = defaultLevels,
  ...options
}: LoggerOptions) {
  return createWinstonLogger({
    defaultMeta,
    exitOnError: false,
    format: f.combine(
      ...[
        f.label({
          label: defaultMeta.label,
        }),
        f.timestamp({
          format: 'DD.MM.YYYY HH:mm:ss.SSS',
        }),
        f.errors({
          inspect: false,
          stack: true,
        }),
        f.metadata({
          fillExcept: [
            'service',
            'module',
            'label',
            'version',

            'level',
            'message',
            'stack',
            'timestamp',
          ],
          key: 'data',
        }),
      ],
    ),
    handleExceptions: true,
    handleRejections: true,
    levels,

    transports: [
      new t.Console({
        format: f.combine(
          f.colorize({
            colors: defaultColors,
            level: true,
            message: false,
          }),
          f.printf((log): string => {
            const {
              label = 'label',
              level = 'debug',
              module = 'module',
              service = 'service',
              stack,
              timestamp = new Date()
                .toISOString(),
              version = '0.0.0',
            } = log as LoggerMeta

            let {
              data = {},
              message,
            } = log as {
              message: object | string
              data: object
            } & TransformableInfo

            if (typeof message === 'object') {
              data = { ...data, ...message }
              message = ''
            }

            return [
              `. ${[
                level,
                module,
                label,
              ]
                .filter(Boolean)
                .join(':')}`,
              `\\ ${[service, version]
                .filter(Boolean)
                .join('@')}`,
              `> ${timestamp}`,

              message
                ? `/ ${message}`
                : undefined,
              stack
                ? `/ ${stack.slice(
                  stack.indexOf('\n') + 1,
                )}`
                : undefined,
              Object.keys(data).length > 0
                ? inspect(data, {
                    breakLength: 80,
                    colors: true,
                    compact: true,
                    depth: 4,
                    showHidden: true,
                    sorted: true,
                  })
                : undefined,
            ]
              .filter(Boolean)
              .join('\n')
              .concat('\n')
          }),
        ),
      }),

      new t.File({
        filename: '.out/logs/debug.log',
        format: f.json(),
        level: 'debug',
      }),
      new t.File({
        filename: '.out/logs/errors.log',
        format: f.json(),
        level: 'error',
      }),
    ],

    ...options,
  })
}
