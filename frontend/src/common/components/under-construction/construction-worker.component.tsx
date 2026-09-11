import { MascotSpeechBubble } from './mascot-speech-bubble.component';

/**
 * Decorative mascot for the rebuild: a builder hammering away in the corner.
 * Purely visual — hidden from assistive technology and not clickable, so it never
 * gets in the way of the errand it sits on top of.
 */
export const ConstructionWorker = () => (
  <div className="under-construction-mascot under-construction-mascot--worker" aria-hidden="true">
    <MascotSpeechBubble>Kallekula</MascotSpeechBubble>
    <svg width="79" height="88" viewBox="0 0 180 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
      {/* The plank taking the beating */}
      <rect x="98" y="168" width="48" height="16" rx="2" fill="#a9763f" />
      <rect x="98" y="168" width="48" height="5" rx="2" fill="#c48d4f" />

      <g className="under-construction-worker-body">
        {/* Legs and boots */}
        <rect x="54" y="146" width="14" height="38" fill="#2f4a6d" />
        <rect x="74" y="146" width="14" height="38" fill="#2f4a6d" />
        <rect x="48" y="180" width="22" height="10" rx="3" fill="#3a3a3a" />
        <rect x="72" y="180" width="22" height="10" rx="3" fill="#3a3a3a" />

        {/* High-visibility vest over a blue shirt */}
        <rect x="44" y="94" width="52" height="58" rx="8" fill="#2f4a6d" />
        <rect x="50" y="96" width="40" height="54" rx="6" fill="#f47b20" />
        <rect x="50" y="112" width="40" height="6" fill="#f7f2e7" />
        <rect x="50" y="128" width="40" height="6" fill="#f7f2e7" />

        {/* Head and hard hat */}
        <circle cx="70" cy="74" r="18" fill="#e8b88f" />
        <circle cx="63" cy="72" r="2.6" fill="#2b2b2b" />
        <circle cx="77" cy="72" r="2.6" fill="#2b2b2b" />
        <path d="M63 82c4 3.5 8 3.5 12 0" stroke="#2b2b2b" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M48 62a22 22 0 0 1 44 0Z" fill="#f5c400" />
        <rect x="44" y="60" width="52" height="7" rx="3.5" fill="#f5c400" />
        <rect x="66" y="42" width="8" height="20" rx="4" fill="#e0b100" />

        {/* Idle arm */}
        <rect x="40" y="100" width="10" height="34" rx="5" fill="#f47b20" />
        <circle cx="45" cy="138" r="6" fill="#e8b88f" />

        {/* Swinging arm with the hammer */}
        <g className="under-construction-hammer-arm">
          <rect x="84" y="100" width="11" height="38" rx="5.5" fill="#f47b20" />
          <circle cx="90" cy="140" r="7" fill="#e8b88f" />
          <rect x="88" y="138" width="7" height="30" rx="3" fill="#a9763f" transform="rotate(-38 91 138)" />
          <rect x="112" y="152" width="24" height="14" rx="3" fill="#6e7478" transform="rotate(-38 124 159)" />
          <rect x="112" y="152" width="8" height="14" rx="2" fill="#8f979c" transform="rotate(-38 124 159)" />
        </g>
      </g>

      {/* Sparks at the point of impact */}
      <g className="under-construction-impact" stroke="#f5c400" strokeWidth="3" strokeLinecap="round">
        <path d="M124 160v-10" />
        <path d="M113 164l-8-7" />
        <path d="M135 164l8-7" />
        <path d="M118 167l-6 6" />
        <path d="M131 167l6 6" />
      </g>
    </svg>
  </div>
);
