// Small inline icons; they take the current text color.
const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
const stroke = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const ArrowIcon = () => (
  <svg {...common}>
    <path d="M5 12h14M13 6l6 6-6 6" {...stroke} />
  </svg>
);

export const BackIcon = () => (
  <svg {...common}>
    <path d="M19 12H5M11 6l-6 6 6 6" {...stroke} />
  </svg>
);

export const PlayIcon = () => (
  <svg {...common}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
);

export const ExternalIcon = () => (
  <svg {...common}>
    <path d="M9 6h9v9M18 6 7 17" {...stroke} />
  </svg>
);

export const CloseIcon = () => (
  <svg {...common}>
    <path d="M6 6l12 12M18 6L6 18" {...stroke} />
  </svg>
);

export const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg {...common}>
    <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} {...stroke} />
  </svg>
);

export const SoundIcon = ({ muted }: { muted: boolean }) => (
  <svg {...common}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" {...stroke} /> : <path d="M16 9a4.2 4.2 0 0 1 0 6M18.5 6.5a7.8 7.8 0 0 1 0 11" {...stroke} />}
  </svg>
);
