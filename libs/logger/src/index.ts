import type { TransformableInfo } from 'logform'
import type { LoggerOptions } from 'winston'
import { inspect } from 'node:util'

import {
  createLogger as createWinstonLogger,
  format as f,
  transports as t,
} from 'winston'

export function createLogger(options: LoggerOptions = {}) {
  return createWinstonLogger({
    defaultMeta: {
      service: 'service',
      version: '0.0.1',
      label: 'root',
    },

    exitOnError: false,
    handleRejections: true,

    format: f.combine(
      ...[
        f.timestamp(),
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
        level: 'debug',

        format: f.combine(
          ...[
            f.colorize({
              level: true,
              message: false,

              colors: {
                error: 'red',
                warn: 'yellow',
                info: 'blue',
                debug: 'gray',
              },
            }),
            f.printf((log): string => {
              const {
                level = 'debug',
                label = 'label',
                service = 'service',
                version = '0.0.1',
                timestamp = new Date()
                  .toISOString(),
                message,
                stack,
                data,
              } = log as TransformableInfo & {
                level: string
                label: string
                service: string
                version: string
                timestamp: string
                message: string
                stack: string
                data: object
              }

              return [
                `. ${[level, label]
                  .filter(Boolean)
                  .join(':')}`,
                `\\ ${[service, version]
                  .filter(Boolean)
                  .join('@')}`,
                `> ${(timestamp).split('T')[1]}`,

                message
                  ? `\\ ${message}`
                  : undefined,
                stack
                  ? `\\ ${stack.slice(stack.indexOf('\n') + 1)}`
                  : undefined,
                Object.keys(data).length > 0
                  ? inspect(data, {
                      breakLength: 80,
                      compact: true,
                      colors: true,
                      showHidden: true,
                      sorted: true,
                    })
                  : undefined,
              ]
                .filter(Boolean)
                .join('\n')
                .concat('\n')
            }),
          ],
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
