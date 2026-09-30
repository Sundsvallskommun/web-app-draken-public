import { preset } from '@sk-web-gui/core';
import { Config } from 'tailwindcss/types/config';

export default {
  mode: 'jit',
  content: [
    './node_modules/@sk-web-gui/*/dist/**/*.js',
    // Only markup files carry class names. Classes that appear solely in UI schemas delivered by
    // the API cannot be scanned and belong in the safelist below.
    './src/**/*.tsx',
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
