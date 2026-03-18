"use client"

import { Toaster as SileoToaster } from "sileo"
import "sileo/styles.css"

function Toaster({
  position = "top-center",
}: {
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
}) {
  return (
    <SileoToaster
      position={position}
      offset={12}
      options={{
        fill: "var(--foreground)",
        duration: 2500,
      }}
    />
  )
}

export { Toaster }
