"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function BrandMark({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect width="24" height="24" rx="7" fill="currentColor" />
      <rect x="6.5" y="7" width="11" height="2" rx="1" fill="white" />
      <rect x="6.5" y="11" width="8" height="2" rx="1" fill="white" />
      <rect x="6.5" y="15" width="5.5" height="2" rx="1" fill="white" />
    </IconBase>
  );
}

export function SectionsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </IconBase>
  );
}

export function QuestionsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M12 20.5c4.7 0 8.5-3.58 8.5-8s-3.8-8-8.5-8-8.5 3.58-8.5 8c0 2.12.86 4.05 2.28 5.5L5 20.5l3.4-1.18A9.4 9.4 0 0 0 12 20.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 10.2c.28-1.18 1.2-1.9 2.45-1.9 1.4 0 2.4.82 2.4 2.02 0 1.08-.7 1.62-1.55 2.12-.82.46-1.1.82-1.1 1.46v.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.2" r="1" fill="currentColor" />
    </IconBase>
  );
}

export function StructureIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="5" y="3.5" width="14" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="5" y="10" width="14" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="5" y="16.5" width="14" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </IconBase>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </IconBase>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M7 3.5h7.2L19 8.3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.7V8h4.3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12.5h6M9 16h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M12 4.5 20.5 19H3.5L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1" fill="currentColor" />
    </IconBase>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
