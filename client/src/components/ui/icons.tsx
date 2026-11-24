import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const outline = (props: IconProps): IconProps => ({
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

const solid = (props: IconProps): IconProps => ({
  viewBox: '0 0 20 20',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const IconDashboard = (p: IconProps) => (
  <svg {...outline(p)}>
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="11" y="3" width="6" height="4" rx="1" />
    <rect x="11" y="9" width="6" height="8" rx="1" />
    <rect x="3" y="11" width="6" height="6" rx="1" />
  </svg>
);

export const IconList = (p: IconProps) => (
  <svg {...outline(p)}>
    <path d="M4 5h12M4 10h12M4 15h8" />
  </svg>
);

export const IconPlusCircle = (p: IconProps) => (
  <svg {...outline(p)}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 7v6M7 10h6" />
  </svg>
);

export const IconSignOut = (p: IconProps) => (
  <svg {...outline(p)}>
    <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h3M13 14l4-4-4-4M17 10H8" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...outline({ strokeWidth: 1.8, ...p })}>
    <circle cx="9" cy="9" r="5" />
    <path d="M13 13l4 4" />
  </svg>
);

export const IconInbox = (p: IconProps) => (
  <svg {...outline(p)}>
    <path d="M3 7l2-4h10l2 4M3 7v9a1 1 0 001 1h12a1 1 0 001-1V7M3 7h4l1 2h4l1-2h4" />
  </svg>
);

export const IconWarningCircle = (p: IconProps) => (
  <svg {...outline(p)}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v5M10 14h.01" />
  </svg>
);

export const IconLock = (p: IconProps) => (
  <svg {...outline(p)}>
    <rect x="4" y="9" width="12" height="8" rx="1.5" />
    <path d="M7 9V6a3 3 0 016 0v3" />
  </svg>
);

export const IconMenu = (p: IconProps) => (
  <svg {...outline({ strokeWidth: 1.8, ...p })}>
    <path d="M3 6h14M3 10h14M3 14h14" />
  </svg>
);

export const IconErrorSolid = (p: IconProps) => (
  <svg {...solid(p)}>
    <path fillRule="evenodd" clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

export const IconWarnSolid = (p: IconProps) => (
  <svg {...solid(p)}>
    <path fillRule="evenodd" clipRule="evenodd" d="M8.26 3.1c.77-1.33 2.7-1.33 3.47 0l5.58 9.66c.77 1.33-.2 3-1.73 3H4.42c-1.54 0-2.5-1.67-1.73-3L8.26 3.1zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-7a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1z" />
  </svg>
);

export const IconInfoSolid = (p: IconProps) => (
  <svg {...solid(p)}>
    <path fillRule="evenodd" clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
  </svg>
);

export const IconCheckSolid = (p: IconProps) => (
  <svg {...solid(p)}>
    <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
  </svg>
);
