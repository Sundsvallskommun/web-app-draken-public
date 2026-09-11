import { MascotSpeechBubble } from './mascot-speech-bubble.component';

/**
 * Decorative mascot for the rebuild, shown on the errand view: a stitched-together monster,
 * much like the errand pages themselves at the moment. Purely visual — hidden from assistive
 * technology and not clickable.
 */
export const FrankensteinMonster = () => (
  <div className="under-construction-mascot under-construction-mascot--monster" aria-hidden="true">
    <svg width="62" height="88" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
      <g className="under-construction-monster-body">
        {/* Legs and oversized boots */}
        <rect x="52" y="150" width="16" height="32" fill="#2b3324" />
        <rect x="72" y="150" width="16" height="32" fill="#2b3324" />
        <rect x="44" y="176" width="28" height="16" rx="3" fill="#1b1b1b" />
        <rect x="68" y="176" width="28" height="16" rx="3" fill="#1b1b1b" />

        {/* Jacket, far too small in the sleeves */}
        <rect x="42" y="96" width="56" height="58" rx="6" fill="#3b4a33" />
        <rect x="66" y="96" width="8" height="58" fill="#2b3324" />
        <rect x="28" y="100" width="16" height="44" rx="6" fill="#3b4a33" />
        <rect x="96" y="100" width="16" height="44" rx="6" fill="#3b4a33" />
        <rect x="26" y="140" width="20" height="16" rx="5" fill="#7fa055" />
        <rect x="94" y="140" width="20" height="16" rx="5" fill="#7fa055" />

        {/* Neck bolts */}
        <rect x="30" y="92" width="16" height="10" rx="3" fill="#8f979c" />
        <rect x="94" y="92" width="16" height="10" rx="3" fill="#8f979c" />

        {/* Flat-topped head */}
        <rect x="44" y="44" width="52" height="50" rx="4" fill="#7fa055" />
        <rect x="44" y="44" width="52" height="14" rx="3" fill="#20211c" />
        <rect x="50" y="34" width="40" height="12" rx="2" fill="#20211c" />

        {/* Eyes */}
        <g className="under-construction-monster-eye">
          <ellipse cx="58" cy="68" rx="7" ry="6" fill="#f7f2e7" />
          <ellipse cx="82" cy="68" rx="7" ry="6" fill="#f7f2e7" />
          <circle cx="59" cy="68" r="3" fill="#20211c" />
          <circle cx="83" cy="68" r="3" fill="#20211c" />
        </g>

        {/* Stitched mouth and scar */}
        <path d="M56 84h28" stroke="#20211c" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M60 80v8M68 80v8M76 80v8" stroke="#20211c" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M50 62l6-4" stroke="#5d7a3c" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* The bolts arcing over */}
      <g className="under-construction-monster-spark" stroke="#8ad8ff" strokeWidth="3" strokeLinecap="round">
        <path d="M46 90l8-6-4-4 8-5" />
        <path d="M94 90l-8-6 4-4-8-5" />
      </g>
    </svg>
    <MascotSpeechBubble variant="comic">
      Access
      <br />
      granted!
    </MascotSpeechBubble>
  </div>
);
