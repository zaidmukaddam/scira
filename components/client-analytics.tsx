'use client'

import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function ClientAnalytics (): React.JSX.Element {
	return (
		<>
			<Analytics />
			<SpeedInsights />
		</>
	)
}


