import { Config } from 'tailwindcss/types/config';
import { preset } from '@sk-web-gui/core';

export default {
  mode: 'jit',
  content: [
    './node_modules/@sk-web-gui/*/dist/**/*.js',
    './src/app/**/*.tsx',
    './src/pages/**/*.{ts,tsx}',
    './src/common/**/*.tsx',
    './src/casedata/components/**/*.tsx',
    './src/supportmanagement/components/**/*.tsx',
  ],
  safelist: ['text-error-surface-primary', 'text-vattjom-surface-primary', 'text-warning-surface-primary'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      maxWidth: {
        content: 'var(--sk-spacing-max-content)',
        errand: '1080px',
      },
    },
  },
  presets: [preset()],
} satisfies Config;
