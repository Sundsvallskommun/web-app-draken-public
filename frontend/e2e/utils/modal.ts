/**
 * sk-web-gui renderar både `Modal` och bekräftelsedialogen från `useConfirm` som
 * `<article class="sk-modal-dialog">`. Dialogen är bokstavligen samma komponent —
 * `Dialog` anropar `Modal` med `cx('sk-dialog', className)` — så den enda skillnaden i
 * markupen är den extra klassen.
 *
 * En selektor som inte skiljer dem åt matchar därför två element så snart båda är
 * monterade. Det inträffar bland annat under dialogens stängning: headlessui behåller
 * elementet under leave-fasen, och med `duration-0` avfyras inget `transitionend` som
 * avmonterar det. Playwrights strict mode fäller då assertionen direkt i stället för att
 * invänta stängningen, vilket ger tester som växlar mellan grönt och rött utan att något
 * i koden har ändrats.
 *
 * Använd därför alltid den av de två som motsvarar det du faktiskt menar. Undvik att
 * skilja dem åt positionellt med `.first()` eller `.last()` — det beror på DOM-ordning
 * och går sönder så fort en till modal monteras.
 */
export const MODAL_DIALOG = 'article.sk-modal-dialog:not(.sk-dialog)';

/** Bekräftelsedialogen från `useConfirm` (Ja/Nej). */
export const CONFIRM_DIALOG = 'article.sk-modal-dialog.sk-dialog';
