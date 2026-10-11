'use client'

import React from 'react'
import { TenantPlan } from '@/lib/planAccess'
import { usePlanAccess } from '../../../src/hooks/usePlanAccess'

interface FeatureGateProps {
  minPlan: TenantPlan
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ minPlan, children, fallback = null }: FeatureGateProps) {
  const { hasMinPlan } = usePlanAccess()

  if (!hasMinPlan(minPlan)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}