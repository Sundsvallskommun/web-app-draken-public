import type { OrigoGlobal } from './origo.types';
import { ORIGO_ASSETS } from './origo-config';

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });

/** The root font size Origo's stylesheets are written for. */
const ORIGO_REM_PX = 16;

/**
 * Converts rem to px. Origo sizes its UI in rem for a 16px root, but the app's root is 10px, which
 * would render all of Origo's controls, icons and text at 62.5%.
 */
export const remToPx = (css: string) =>
  css.replace(/(-?\d*\.?\d+)rem\b/g, (_match, value: string) => `${Number(value) * ORIGO_REM_PX}px`);

/** Inlines a stylesheet with its rem converted to px (see `remToPx`) instead of linking it. */
const loadStylesheet = async (href: string) => {
  if (document.querySelector(`style[data-href="${href}"]`)) return;
  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`Failed to load stylesheet: ${href}`);
  }
  const style = document.createElement('style');
  style.dataset.href = href;
  style.textContent = remToPx(await response.text());
  document.head.appendChild(style);
};

const loadScripts = async () => {
  await loadScript(ORIGO_ASSETS.js);
  // UMD bundle that resolves the global `Origo`, so it must load after origo.min.js
  await loadScript(ORIGO_ASSETS.multiselectJs);
};

const load = async (): Promise<OrigoGlobal> => {
  await Promise.all([loadStylesheet(ORIGO_ASSETS.css), loadStylesheet(ORIGO_ASSETS.multiselectCss), loadScripts()]);

  if (!window.Origo) {
    throw new Error('Origo global missing after script load');
  }
  return window.Origo;
};

// Shared, so a map mounted while the scripts are still downloading waits for them instead of
// finding the <script> tag and going on without the global. Cleared on failure to allow a retry.
let loading: Promise<OrigoGlobal> | null = null;

/** Injects the Origo client and the multiselect plugin, resolving with the `Origo` global. */
export const loadOrigo = (): Promise<OrigoGlobal> => {
  if (window.Origo && window.Multiselect) return Promise.resolve(window.Origo);
  loading ??= load().catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
};
