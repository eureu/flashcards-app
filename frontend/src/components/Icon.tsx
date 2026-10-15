import type { SVGProps } from "react";

export type IconName = "study" | "words" | "groups" | "chevron" | "plus" | "spark" | "close" | "search" | "lock" | "edit" | "trash" | "list";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 22, className = "", ...props }: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {name === "study" && (
        <g {...common}>
          <rect x="4" y="5" width="14" height="14" rx="3" />
          <path d="M8 9h6M8 13h4" />
          <path d="M8 3h10a3 3 0 0 1 3 3v10" />
        </g>
      )}
      {name === "words" && (
        <g {...common}>
          <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z" />
          <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z" />
        </g>
      )}
      {name === "groups" && (
        <g {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M15 5.4a3 3 0 0 1 0 5.2M16.5 14a5 5 0 0 1 4 5" />
        </g>
      )}
      {name === "chevron" && <path {...common} d="m9 6 6 6-6 6" />}
      {name === "plus" && <path {...common} d="M12 5v14M5 12h14" />}
      {name === "close" && <path {...common} d="m6 6 12 12M18 6 6 18" />}
      {name === "search" && <g {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></g>}
      {name === "lock" && <g {...common}><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></g>}
      {name === "edit" && <g {...common}><path d="m4 16-.8 4.8L8 20l10.5-10.5-4-4z" /><path d="m12.8 7.2 4 4" /></g>}
      {name === "trash" && <g {...common}><path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></g>}
      {name === "list" && <g {...common}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></g>}
      {name === "spark" && (
        <g {...common}>
          <path d="M12 3c.5 4.1 2.7 6.4 7 7-4.3.6-6.5 2.9-7 7-.5-4.1-2.7-6.4-7-7 4.3-.6 6.5-2.9 7-7Z" />
          <path d="M19 15.5c.2 1.8 1.2 2.8 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3Z" />
        </g>
      )}
    </svg>
  );
}
