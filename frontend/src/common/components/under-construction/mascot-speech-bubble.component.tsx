import { ReactNode } from 'react';

type MascotSpeechBubbleVariant = 'plain' | 'comic';

interface MascotSpeechBubbleProps {
  children: ReactNode;
  /** 'plain' is a small label above the mascot, 'comic' a comic-book balloon. */
  variant?: MascotSpeechBubbleVariant;
}

/**
 * Speech bubble above a rebuild mascot. Decorative like the mascots themselves — the
 * surrounding wrapper already hides it from assistive technology.
 */
export const MascotSpeechBubble = ({ children, variant = 'plain' }: Readonly<MascotSpeechBubbleProps>) => (
  <span className={`under-construction-bubble under-construction-bubble--${variant}`}>{children}</span>
);
