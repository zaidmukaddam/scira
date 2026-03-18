import type { SVGProps } from 'react';

interface ProcessorIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function ProcessorIcon({ size = 24, className, ...props }: ProcessorIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <path
        d="M12.0002 4.74693V2.74609M16 4.75V2.75M8.00018 4.75V2.74609M12 21.25V19.25M16 21.25V19.25M8 21.25V19.25M19.25 16H21.25M19.25 8H21.25M19.25 12H21.25M2.75 12H4.75M2.75 16H4.75M2.75 8H4.75M15.2488 11.999C15.2488 13.7939 13.7937 15.249 11.9988 15.249C10.2039 15.249 8.74878 13.7939 8.74878 11.999C8.74878 10.2041 10.2039 8.74902 11.9988 8.74902C13.7937 8.74902 15.2488 10.2041 15.2488 11.999ZM7.75 19.25H16.25C17.9069 19.25 19.25 17.9069 19.25 16.25V7.75C19.25 6.09315 17.9069 4.75 16.25 4.75H7.75C6.09315 4.75 4.75 6.09315 4.75 7.75V16.25C4.75 17.9069 6.09315 19.25 7.75 19.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
