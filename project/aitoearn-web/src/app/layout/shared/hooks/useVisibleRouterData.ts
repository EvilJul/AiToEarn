/**
 * 返回当前侧边栏导航。
 * 企业开关关闭时始终保留原多平台导航；开启后停在企业页时只保留企业入口。
 */
'use client'

import { enterpriseRouterItem, visibleRouterData } from '@/app/layout/routerData'
import { useNavigationLogic } from './useNavigationLogic'

export function useVisibleRouterData() {
  const { currRouter } = useNavigationLogic()
  if (process.env.NEXT_PUBLIC_ENTERPRISE_OPS_ENABLED === 'true' && currRouter === '/enterprise')
    return [enterpriseRouterItem]
  return visibleRouterData
}
