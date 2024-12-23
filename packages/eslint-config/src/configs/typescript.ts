import type { Linter } from 'eslint'
import tsParser from '@typescript-eslint/parser'

const typescript = {
  languageOptions: {
    parser: tsParser,
  },
  files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
  rules: {

    // Typescript rules
    'ts/explicit-function-return-type': 'off',
    'ts/array-type': 'error',

    'ts/adjacent-overload-signatures': 'error',
    'ts/ban-tslint-comment': 'error',
    'ts/class-literal-property-style': 'error',
    'ts/consistent-generic-constructors': 'error',
    'ts/consistent-indexed-object-style': 'error',
    'ts/consistent-type-assertions': 'error',
    'ts/consistent-type-definitions': 'off',
    'ts/no-confusing-non-null-assertion': 'error',
    'no-empty-function': 'off',
    'ts/no-empty-function': 'error',
    'ts/no-empty-interface': 'error',
    'ts/no-inferrable-types': 'error',
    'ts/prefer-for-of': 'error',
    'ts/prefer-function-type': 'error',
    'ts/prefer-namespace-keyword': 'error',
  },
} satisfies Linter.FlatConfig

export default typescript
