'use client'

/** AssetPicker - 页面私有的授权图片多选与顺序展示。 */
import type { ImageAsset } from '@/api/enterprise/enterprise.types'
import { OssImage } from '@/components/common/OssImage'
import { Button } from '@/components/ui/button'

export function AssetPicker({ images, selected, onChange, maxCount = 9, disabled = false }: { images: ImageAsset[], selected: string[], onChange: (ids: string[]) => void, maxCount?: number, disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((image) => {
        const index = selected.indexOf(image.id)
        return (
          <Button type="button" disabled={disabled} variant="outline" key={image.id} aria-label={image.filename} aria-pressed={index >= 0} className={`relative aspect-square h-auto overflow-hidden rounded-lg border-2 p-0 ${index >= 0 ? 'border-primary' : 'border-border'}`} onClick={() => onChange(index >= 0 ? selected.filter(id => id !== image.id) : selected.length < maxCount ? [...selected, image.id] : selected)}>
            <OssImage src={image.url} alt={image.filename} fill sizes="120px" disableOssThumbnail className="object-cover" />
            {index >= 0 && <span className="absolute right-1 top-1 rounded-md bg-gradient-back px-2 text-gradient-foreground">{index + 1}</span>}
          </Button>
        )
      })}
    </div>
  )
}
