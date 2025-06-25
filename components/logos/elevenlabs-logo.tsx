export function ElevenLabsLogo() {
  return (
    <div className="flex items-center justify-center">
      {/* Dark logo for light backgrounds */}
      <img 
        src="https://eleven-public-cdn.elevenlabs.io/payloadcms/pwsc4vchsqt-ElevenLabsGrants.webp" 
        alt="ElevenLabs" 
        className="h-12 w-auto block dark:hidden"
      />
      {/* White logo for dark backgrounds */}
      <img 
        src="https://eleven-public-cdn.elevenlabs.io/payloadcms/cy7rxce8uki-IIElevenLabsGrants%201.webp" 
        alt="ElevenLabs" 
        className="h-12 w-auto hidden dark:block"
      />
    </div>
  )
} 