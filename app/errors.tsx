import { useEffect } from "react"

export default function Error({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    useEffect(() => {
      console.error(error)
    }, [error])

    return (
        <div>
            <h1>Error</h1>
        </div>
    )
}