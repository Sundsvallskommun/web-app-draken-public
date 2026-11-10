'use client';

import { RefObject, useEffect } from 'react';

/**
 * Quill shows a placeholder from the `data-placeholder` attribute on its editor, but the SK editor takes
 * no such prop and mounts through next/dynamic, so the attribute is set on the node once it appears.
 */
export const useTextEditorPlaceholder = (host: RefObject<HTMLElement | null>, placeholder: string): void => {
  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const write = (): boolean => {
      const editor = node.querySelector<HTMLElement>('.ql-editor');
      if (!editor) return false;
      editor.dataset.placeholder = placeholder;
      return true;
    };

    if (write()) return;

    const observer = new MutationObserver(() => {
      if (write()) observer.disconnect();
    });
    observer.observe(node, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [host, placeholder]);
};
