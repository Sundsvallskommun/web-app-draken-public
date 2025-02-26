import { Config } from 'tailwindcss/types/config';
import { preset } from '@sk-web-gui/core';

export default {
  mode: 'jit',
  content: [
    './node_modules/@sk-web-gui/*/dist/**/*.js',
    './src/layouts/**/*.{js,ts,jsx,tsx}',
    './src/services/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/casedata/components/**/*.{js,ts,jsx,tsx}',
    './src/common/**/*.{js,ts,jsx,tsx}',
    './src/supportmanagement/components/**/*.{js,ts,jsx,tsx}',
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
