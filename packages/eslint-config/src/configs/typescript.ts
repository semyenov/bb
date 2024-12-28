import type { Linter } from 'eslint'

import tsParser from '@typescript-eslint/parser'

const typescript = {
  files: [
    '**/*.ts',
    '**/*.tsx',
    '**/*.d.ts',
  ],
  languageOptions: {
    parser: tsParser,
  },
  rules: {

    'no-empty-function': 'off',
    'ts/adjacent-overload-signatures': 'error',

    'ts/array-type': 'error',
    'ts/ban-tslint-comment': 'error',
    'ts/class-literal-property-style': 'error',
    'ts/consistent-generic-constructors': 'error',
    'ts/consistent-indexed-object-style': 'error',
    'ts/consistent-type-assertions': 'error',
    'ts/consistent-type-definitions': 'off',
    // Typescript rules
    'ts/explicit-function-return-type': 'off',
    'ts/no-confusing-non-null-assertion': 'error',
    'ts/no-empty-function': 'error',
    'ts/no-empty-interface': 'error',
    'ts/no-inferrable-types': 'error',
    'ts/prefer-for-of': 'error',
    'ts/prefer-function-type': 'error',
    'ts/prefer-namespace-keyword': 'error',
  },
} as const satisfies Linter.Config

export default typescript
