const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const boundaries = require('eslint-plugin-boundaries');

const sameFeature = { feature: '{{ from.element.captured.feature }}' };
const el = (type, captured) => ({ element: captured ? { type, captured } : { type } });
const to = (type, captured) => ({ to: el(type, captured) });

/**
 * Clean Architecture được ép bằng lint (vi phạm là lỗi CI):
 *   domain        -> core, domain cùng tính năng
 *   data          -> core, domain + data cùng tính năng
 *   presentation  -> core, shared, domain + presentation cùng tính năng
 *   composition   -> tất cả (nơi DUY NHẤT nối data với presentation)
 *   route (app)   -> core, shared, presentation, domain, composition (file route chỉ là lớp mỏng)
 *   core          -> chỉ core;  shared -> core, shared
 * Tính năng không import data/presentation của tính năng khác.
 */
module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*', 'design-system/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'route', pattern: 'src/app/**' },
        { type: 'composition', pattern: 'src/composition/**' },
        { type: 'core', pattern: 'src/core/**' },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'domain', pattern: 'src/features/*/domain/**', capture: ['feature'] },
        { type: 'data', pattern: 'src/features/*/data/**', capture: ['feature'] },
        { type: 'presentation', pattern: 'src/features/*/presentation/**', capture: ['feature'] },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: el('core'), allow: [to('core')] },
            { from: el('shared'), allow: [to('core'), to('shared')] },
            {
              from: el('domain'),
              allow: [to('core'), to('domain', sameFeature)],
            },
            {
              from: el('data'),
              allow: [to('core'), to('domain', sameFeature), to('data', sameFeature)],
            },
            {
              from: el('presentation'),
              allow: [
                to('core'),
                to('shared'),
                to('domain', sameFeature),
                to('presentation', sameFeature),
              ],
            },
            {
              from: el('composition'),
              allow: [
                to('core'),
                to('shared'),
                to('domain'),
                to('data'),
                to('presentation'),
                to('composition'),
              ],
            },
            {
              from: el('route'),
              allow: [
                to('core'),
                to('shared'),
                to('domain'),
                to('presentation'),
                to('composition'),
                to('route'),
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // Lớp domain và core/domain không được biết gì về React, Expo, React Native hay fetch.
    files: ['src/features/*/domain/**/*.ts', 'src/core/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'],
              message: 'Lớp domain phải thuần TypeScript.',
            },
          ],
        },
      ],
    },
  },
]);
