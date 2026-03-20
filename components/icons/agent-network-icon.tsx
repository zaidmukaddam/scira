import type { SVGProps } from 'react';

export function AgentNetworkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="18.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="16.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="17.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 6.8501L16 7.2501M17.75 10.0001L16.55 14.0001M13.5 14.3572L12 12.0001L10.4091 9.5001M6.25 14.0001L7.45 10.0001M8 16.7501L12 17.1501"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
