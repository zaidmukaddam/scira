export function FamasiLogo({
  className,
  width,
  height,
  color = 'currentColor',
}: {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
      color={color}
    >
      {/* Medical cross with modern styling */}
      <rect
        x="85"
        y="40"
        width="30"
        height="120"
        rx="15"
        fill={color}
      />
      <rect
        x="40"
        y="85"
        width="120"
        height="30"
        rx="15"
        fill={color}
      />
      
      {/* Pill/capsule elements around the cross */}
      <ellipse
        cx="50"
        cy="50"
        rx="8"
        ry="15"
        fill={color}
        opacity="0.7"
        transform="rotate(-45 50 50)"
      />
      <ellipse
        cx="150"
        cy="50"
        rx="8"
        ry="15"
        fill={color}
        opacity="0.7"
        transform="rotate(45 150 50)"
      />
      <ellipse
        cx="50"
        cy="150"
        rx="8"
        ry="15"
        fill={color}
        opacity="0.7"
        transform="rotate(45 50 150)"
      />
      <ellipse
        cx="150"
        cy="150"
        rx="8"
        ry="15"
        fill={color}
        opacity="0.7"
        transform="rotate(-45 150 150)"
      />
      
      {/* Central circle for brand mark */}
      <circle
        cx="100"
        cy="100"
        r="20"
        fill="white"
        stroke={color}
        strokeWidth="3"
      />
      <text
        x="100"
        y="107"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill={color}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        F
      </text>
    </svg>
  );
}
