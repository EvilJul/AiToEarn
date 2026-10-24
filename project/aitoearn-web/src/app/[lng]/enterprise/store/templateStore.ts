import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { BrandTemplateKind } from '../components/BrandTemplateComposer/utils/renderTemplate'

const initial = { kind: BrandTemplateKind.Cover, knowledgeId: '', title: '', body: '', operationId: null as symbol | null, busy: false, error: '' }
export const useTemplateStore = create(combine(initial, set => ({
  update(data: Partial<typeof initial>) { set(data) },
  reset() { set(initial) },
})))
