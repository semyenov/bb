import type { Linter } from 'eslint'

const unicorn = {
  rules: {
    'unicorn/better-regex': 'error',
    'unicorn/catch-error-name': 'error',
    'unicorn/consistent-destructuring': 'error',
    'unicorn/consistent-function-scoping': 'error',
    'unicorn/empty-brace-spaces': 'error',
    'unicorn/expiring-todo-comments': 'error',
    'unicorn/filename-case': ['error', { cases: { kebabCase: true } }],
    'unicorn/no-array-for-each': 'error',
    'unicorn/no-array-method-this-argument': 'error',
    'unicorn/no-array-push-push': 'error',
    'unicorn/no-for-loop': 'error',
    'unicorn/no-invalid-remove-event-listener': 'error',
    'unicorn/no-lonely-if': 'error',
    'unicorn/no-negation-in-equality-check': 'error',
    'unicorn/no-nested-ternary': 'error',
    'unicorn/no-static-only-class': 'error',
    'unicorn/no-unnecessary-await': 'error',
    'unicorn/no-unreadable-array-destructuring': 'error',
    'unicorn/no-useless-undefined': 'error',
    'unicorn/prefer-number-properties': 'error',
    'unicorn/prefer-optional-catch-binding': 'error',
    'unicorn/template-indent': ['warn', { indent: 2 }],
    'unicorn/text-encoding-identifier-case': 'error',
  },
} as const satisfies Linter.Config

export default unicorn
