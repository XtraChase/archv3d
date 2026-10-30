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
