import type { SVGProps } from "react";

export type IconName = "study" | "words" | "groups";

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
    </svg>
  );
}
