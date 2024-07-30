import antfu from '@antfu/eslint-config'

import typescriptRules from './configs/typescript'
import unicornRules from './configs/unicorn'

import type { Linter } from 'eslint'

async function config(): Promise<Linter.FlatConfig[]> {
  return await antfu({
    type: 'lib',
    stylistic: true,
    rules: {
      'antfu/if-newline': ['error'],
      'style/max-statements-per-line': ['off'],
      'style/array-bracket-newline': ['error', { multiline: true }],
      'eol-last': ['error', 'always'],

      // Eslint rules
      'no-else-return': 'warn',
      'logical-assignment-operators': 'warn',
      'no-implicit-coercion': 'warn',
      'operator-assignment': 'warn',
      'prefer-destructuring': 'warn',
      'prefer-object-has-own': 'warn',

      // Style rules
      'style/no-confusing-arrow': 'error',
      'style/newline-per-chained-call': 'error',
      'style/wrap-regex': 'error',
      'style/type-named-tuple-spacing': 'error',

      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          'distinctGroup': true,

          'groups': [
            'builtin',
            'external',
            'object',
            'parent',
            'internal',
            'sibling',
            'index',
            'type',
          ],

          'pathGroups': [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '~/**',
              group: 'internal',
              position: 'after',
            },
          ],

          'alphabetize': {
            order: 'asc',
            orderImportKind: 'asc',
            caseInsensitive: false,
          },
        },
      ],

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-use-before-define': ['error', { functions: false }],
      'no-param-reassign': ['error', { props: false }],
      'no-underscore-dangle': ['error', { allow: ['_id', '_count'] }],
      'no-shadow': ['off', { allow: ['_id', '_count', 'T'] }],
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      'no-shadow-restricted-names': ['error'],

      // Stylistic
      'curly': ['error', 'multi-line', 'consistent'],
      'newline-before-return': ['error'],
      'newline-per-chained-call': ['error', { ignoreChainWithDepth: 1 }],
      'multiline-ternary': ['error', 'always-multiline'],
      'brace-style': ['error', 'stroustrup'],
      'arrow-body-style': ['error', 'always'],
      'eqeqeq': ['error', 'smart'],

    },
  }, [
    typescriptRules,
    unicornRules,
  ])
}

export default config
