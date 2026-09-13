import nextConfig from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  ...nextConfig,
  {
    ignores: ['src/**/data-contracts/**'],
  },
  eslintConfigPrettier,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  // Import boundaries (docs/architecture/boundaries.md) are enforced by dependency-cruiser, but an
  // environment read is not an import, so this one is ESLint's: process.env.NEXT_PUBLIC_APPLICATION is
  // the app identity and only the shell may read it. Existing reads are recorded as bulk suppressions
  // in eslint-suppressions.json (picked up automatically from the frontend cwd). That file is a
  // ratchet: it may only shrink. After removing a read, run `yarn lint:prune-suppressions`; never
  // regenerate it to add one. NEXT_PUBLIC_APPLICATION_NAME is a different variable and stays allowed.
  {
    files: ['src/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[computed=false][object.object.name='process'][object.property.name='env'][property.name='NEXT_PUBLIC_APPLICATION']",
          message:
            'Do not read process.env.NEXT_PUBLIC_APPLICATION outside the shell. Import the app identity from @shell/app-identity, or express the variation as a domain-owned contract that the shell fulfils. See docs/architecture/boundaries.md.',
        },
        {
          selector:
            "MemberExpression[computed=true][object.object.name='process'][object.property.name='env'][property.value='NEXT_PUBLIC_APPLICATION']",
          message:
            'Do not read process.env["NEXT_PUBLIC_APPLICATION"] outside the shell. Import the app identity from @shell/app-identity, or express the variation as a domain-owned contract that the shell fulfils. See docs/architecture/boundaries.md.',
        },
      ],
    },
  },
  {
    // The shell owns the app identity, the Next.js routes are part of the shell, and
    // application-service.ts is the legacy reader that the shell is replacing.
    files: ['src/shell/**', 'src/app/**', 'src/common/services/application-service.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  // Playwright-sviten lintas för det som faktiskt kan gå sönder i den, inte för stilregler.
  // Importsortering och react-hooks är avstängda här: den förra skulle kräva en normalisering
  // av hela e2e-trädet som inte hör hemma i samma ändring, den senare tolkar Playwrights
  // fixture-callback `use` som en React-hook.
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',
      'react-hooks/rules-of-hooks': 'off',
      // sk-web-gui renderar både Modal och useConfirm-dialogen som article.sk-modal-dialog;
      // dialogen skiljs bara av klassen sk-dialog. En selektor som inte skiljer dem åt matchar
      // två element så snart båda är monterade och fälls av Playwrights strict mode — vilket
      // ger tester som växlar mellan grönt och rött utan att koden ändrats. Använd MODAL_DIALOG
      // respektive CONFIRM_DIALOG från e2e/utils/modal.ts.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/sk-modal-dialog(?![-\\w])/]',
          message:
            'Använd MODAL_DIALOG eller CONFIRM_DIALOG från e2e/utils/modal.ts — rå sk-modal-dialog matchar både modalen och bekräftelsedialogen.',
        },
        {
          selector: 'TemplateElement[value.raw=/sk-modal-dialog(?![-\\w])/]',
          message:
            'Använd MODAL_DIALOG eller CONFIRM_DIALOG från e2e/utils/modal.ts — rå sk-modal-dialog matchar både modalen och bekräftelsedialogen.',
        },
      ],
    },
  },
  {
    // Modulen som definierar selektorerna måste förstås få skriva ut dem.
    files: ['e2e/utils/modal.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
