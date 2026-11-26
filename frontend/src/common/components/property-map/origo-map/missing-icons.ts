// Icons Origo and its multiselect plugin reference but the sprites hosted on
// karta.sundsvall.se/origo2client/css/svg/ lack, so those buttons render empty.
// Copied from upstream Origo (github.com/origo-map/origo, css/svg/), except where noted.
// Remove once the hosted sprites include them.

interface SpriteSymbol {
  id: string;
  viewBox: string;
  content: string;
}

const MISSING_ICONS: SpriteSymbol[] = [
  // fa-icons.svg
  {
    id: 'fa-mouse-pointer',
    viewBox: '-100 0 600 500',
    content:
      '<path d="m397 298c6 6 7 12 4 20-3 7-9 11-17 11l-109 0 57 136c2 5 2 10 0 14-2 5-5 8-9 10l-51 22c-5 1-9 1-14 0-5-2-8-6-10-10l-55-129-89 89c-3 3-8 5-13 5-2 0-4 0-6-1-8-3-12-9-12-17l0-430c0-8 4-13 12-17 2-1 4-1 6-1 6 0 10 2 13 5z"/>',
  },
  // fa-icons.svg
  {
    id: 'fa-circle-o',
    viewBox: '0 0 512 512',
    content:
      '<path d="m256 101c-28 0-54 7-78 20-24 14-43 33-57 57-13 24-20 50-20 78 0 28 7 54 20 78 14 24 33 43 57 57 24 13 50 20 78 20 28 0 54-7 78-20 24-14 43-33 57-57 13-24 20-50 20-78 0-28-7-54-20-78-14-24-33-43-57-57-24-13-50-20-78-20z m219 155c0 40-9 77-29 110-20 34-46 60-80 80-33 20-70 29-110 29-40 0-77-9-110-29-34-20-60-46-80-80-20-33-29-70-29-110 0-40 9-77 29-110 20-34 46-60 80-80 33-20 70-29 110-29 40 0 77 9 110 29 34 20 60 46 80 80 20 33 29 70 29 110z"/>',
  },
  // fa-icons.svg
  {
    id: 'fa-draw-polygon-o',
    viewBox: '0 0 512 512',
    content:
      '<path d="M384 352c-.35 0-.67.1-1.02.1l-39.2-65.32c5.07-9.17 8.22-19.56 8.22-30.78s-3.14-21.61-8.22-30.78l39.2-65.32c.35.01.67.1 1.02.1 35.35 0 64-28.65 64-64s-28.65-64-64-64c-23.63 0-44.04 12.95-55.12 32H119.12C108.04 44.95 87.63 32 64 32 28.65 32 0 60.65 0 96c0 23.63 12.95 44.04 32 55.12v209.75C12.95 371.96 0 392.37 0 416c0 35.35 28.65 64 64 64 23.63 0 44.04-12.95 55.12-32h209.75c11.09 19.05 31.49 32 55.12 32 35.35 0 64-28.65 64-64 .01-35.35-28.64-64-63.99-64zm-288 8.88V151.12A63.825 63.825 0 0 0 119.12 128h208.36l-38.46 64.1c-.35-.01-.67-.1-1.02-.1-35.35 0-64 28.65-64 64s28.65 64 64 64c.35 0 .67-.1 1.02-.1l38.46 64.1H119.12A63.748 63.748 0 0 0 96 360.88zM272 256c0-8.82 7.18-16 16-16s16 7.18 16 16-7.18 16-16 16-16-7.18-16-16zM400 96c0 8.82-7.18 16-16 16s-16-7.18-16-16 7.18-16 16-16 16 7.18 16 16zM64 80c8.82 0 16 7.18 16 16s-7.18 16-16 16-16-7.18-16-16 7.18-16 16-16zM48 416c0-8.82 7.18-16 16-16s16 7.18 16 16-7.18 16-16 16-16-7.18-16-16zm336 16c-8.82 0-16-7.18-16-16s7.18-16 16-16 16 7.18 16 16-7.18 16-16 16z" />',
  },
  // miscellaneous.svg
  {
    id: 'baseline-select-all-24px',
    viewBox: '0 0 24 24',
    content:
      '<path d="M0 0h24v24H0z" fill="none"/><path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z"/>',
  },
  // material-icons.svg
  {
    id: 'ic_close_fullscreen_24px',
    viewBox: '0 0 24 24',
    content:
      '<path d="M22,3.41l-5.29,5.29L20,12h-8V4l3.29,3.29L20.59,2L22,3.41z M3.41,22l5.29-5.29L12,20v-8H4l3.29,3.29L2,20.59L3.41,22z"/>',
  },
  // origo-icons.svg as hosted for internkarta.sundsvall.se (css/svg/). The legend's icon for layers
  // whose legend opens below the row (`hasThemeLegend`).
  {
    id: 'o_legend_24px',
    viewBox: '-0.5 0.5 24 24',
    content:
      '<path d="m 4.4280908,6.2955215 h 2 v 2 h -2 z m 0,3.9999995 h 2 v 2 h -2 z m 2,6 c -4.6666667,4.666667 -2.3333333,2.333333 0,0 z m 2,-9.9999995 H 18.428091 v 2 H 8.4280908 Z m 0,3.9999995 H 18.428091 v 2 H 8.4280908 Z m 10.0000002,6 c -12.6666669,4.666667 -6.333333,2.333333 0,0 z"/><path d="M 5.0562073,14.476263 11.57649,18.60927 c 1.910735,-1.378734 4.192292,-2.778121 6.013397,-4.067268"/>',
  },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Adds a hidden sprite with the icons not already present in the document. */
export const addMissingIcons = () => {
  const missing = MISSING_ICONS.filter(({ id }) => !document.getElementById(id));
  if (missing.length === 0) return;

  const sprite = document.createElementNS(SVG_NS, 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.display = 'none';
  sprite.innerHTML = missing
    .map(({ id, viewBox, content }) => `<symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`)
    .join('');
  document.body.appendChild(sprite);
};
