/**
 * useVisibleRouterData - open-source visible route data
 */
'use client'

import { enterpriseRouterItem, visibleRouterData } from '@/app/layout/routerData'
import { useNavigationLogic } from './useNavigationLogic'

export function useVisibleRouterData() {
  const { currRouter } = useNavigationLogic()
  return currRouter === '/enterprise' ? [enterpriseRouterItem] : visibleRouterData
}
