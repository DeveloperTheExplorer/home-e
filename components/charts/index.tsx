'use client'

import dynamic from 'next/dynamic'
import { ChartSkeleton } from './chart-skeleton'


const ChartSavings = dynamic(() => import('./chart-savings').then(mod => mod.ChartSavings), {
  ssr: false,
  loading: () => <ChartSkeleton />
})


export { ChartSavings }
