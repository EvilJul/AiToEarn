import { REDNOTE_METADATA } from '../channels/platforms/rednote/rednote.constants'

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
}

export function getEnterpriseImageExtension(mimeType: string) {
  const extension = imageExtensions[mimeType]
  return extension && REDNOTE_METADATA.mediaRules.imageFormats.includes(extension) ? extension : undefined
}
