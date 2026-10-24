import { create } from 'zustand'
import { combine } from 'zustand/middleware'

const initial = { generationId: '', title: '', body: '', topics: '', knowledgeIds: [] as string[], sourceRevisionId: '', topicId: '', imageIds: [] as string[], saving: false, error: '' }
export const useEditorStore = create(combine(initial, set => ({
  update(data: Partial<typeof initial>) { set(data) },
  reset() { set({ ...initial, imageIds: [], knowledgeIds: [] }) },
})))
