import type { TransformableInfo } from 'logform'
import type { LoggerOptions } from 'winston'
import { inspect } from 'node:util'

import {
  config as c,
  createLogger as createWinstonLogger,
  format as f,
  transports as t,
} from 'winston'

const {
  colors: defaultColors,
  levels: defaultLevels,
} = c.npm

export function createLogger({
  levels = defaultLevels,
  defaultMeta = {
    service: 'service',
    label: 'root',
    version: '0.0.1',
  },
  ...options
}: LoggerOptions) {
  return createWinstonLogger({
    levels,
    defaultMeta,
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true,
    format: f.combine(
      ...[
        f.label({
          label: defaultMeta.label,
        }),
        f.timestamp({
          format: 'DD.MM.YYYY HH:mm:ss.SSS',
        }),
        f.errors({
          stack: true,
          inspect: false,
        }),
        f.metadata({
          key: 'data',
          fillExcept: [
            'service',
            'stack',
            'version',
            'message',
            'label',
            'level',
            'timestamp',
          ],
        }),
      ],
    ),

    transports: [
      new t.Console({
        format: f.combine(
          f.colorize({
            level: true,
            message: false,
            colors: defaultColors,
          }),
          f.printf((log): string => {
            const {
              level = 'debug',
              label = 'label',
              service = 'service',
              version = '0.0.1',
              timestamp = new Date()
                .getTime() / 1000,
              stack,
            } = log as TransformableInfo & {
              level: string
              label: string
              service: string
              version: string
              timestamp: number
              stack: string
            }

            let {
              message,
              data = {},
            } = log as TransformableInfo & {
              message: string | object
              data: object
            }

            if (typeof message === 'object') {
              data = { ...data, ...message }
              message = ''
            }

            return [
              `. ${[label, level]
                .filter(Boolean)
                .join(':')}`,
              `\\ ${[service, version]
                .filter(Boolean)
                .join('@')}`,
              `> ${timestamp}`,

              message
                ? `\\ ${message}`
                : undefined,
              stack
                ? `\\ ${stack.slice(
                  stack.indexOf('\n') + 1,
                )}`
                : undefined,
              Object.keys(data).length > 0
                ? inspect(data, {
                    breakLength: 40,
                    compact: true,
                    colors: true,
                    showHidden: true,
                    sorted: true,
                    depth: 4,
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
        level: 'debug',
        filename: '.out/logs/debug.log',
        format: f.json(),
      }),
      new t.File({
        level: 'error',
        filename: '.out/logs/errors.log',
        format: f.json(),
      }),
    ],

    ...options,
  })
}
