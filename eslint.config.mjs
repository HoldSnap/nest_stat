// eslint.config.mjs
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    // Явно указываем парсер для TypeScript
    parser: '@typescript-eslint/parser',

    languageOptions: {
      sourceType: 'commonjs', // или "commonjs" — в зависимости от вашего проекта
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        // Подключаем проект для type-aware линтинга
        project: resolve(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
    ignores: ['eslint.config.mjs'],
  },
  // Базовый набор правил ESLint
  eslint.configs.recommended,

  // Подключаем рекомендованные проверки TS с type-aware правилами
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier
  eslintPluginPrettierRecommended,

  // Ваши кастомные правила
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // При правильном подключении parserOptions.project
      // это правило больше не будет срабатывать на $connect()/$disconnect()
      // можно даже вернуть его в ошибку:
      '@typescript-eslint/no-unsafe-call': 'error',
    },
  },
);
