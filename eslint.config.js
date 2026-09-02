import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.keep-assets'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    /**
     * A cena 3D roda fora do ciclo de render do React.
     *
     * `useFrame` é um callback de animação chamado ~60 vezes por segundo pelo
     * loop do three.js, e mutar refs ali dentro é o padrão prescrito pelo
     * react-three-fiber — pôr a posição do personagem em estado causaria 60
     * re-renders por segundo. As regras de imutabilidade do React Compiler não
     * distinguem esse callback de um corpo de render, então acusam falso
     * positivo. As demais regras de hooks continuam valendo.
     */
    files: ['src/game/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
