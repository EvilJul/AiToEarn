export enum BrandTemplateKind {
  Cover = 'cover',
  Case = 'case',
  Faq = 'faq',
}

interface TemplateInput { kind: BrandTemplateKind, companyName: string, title: string, body: string, photo?: string }

function linesFor(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > width) { lines.push(line); line = '' }
      line += character
    }
    lines.push(line)
  }
  return lines
}

/** Pure layout from approved text and authorized photos; never generates facts or model output. */
export async function renderBrandTemplate(input: TemplateInput) {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('TEMPLATE_CANVAS_UNAVAILABLE')
  const style = getComputedStyle(document.documentElement)
  const colors = { background: style.getPropertyValue('--background').trim(), foreground: style.getPropertyValue('--foreground').trim(), accent: style.getPropertyValue('--brand-ink').trim(), muted: style.getPropertyValue('--muted').trim() }
  if (Object.values(colors).some(color => !color))
    throw new Error('TEMPLATE_THEME_UNAVAILABLE')
  const family = getComputedStyle(document.body).fontFamily
  context.textBaseline = 'top'
  context.fillStyle = colors.background
  context.fillRect(0, 0, 1080, 1440)
  context.fillStyle = colors.accent
  context.fillRect(72, 72, 936, 8)
  let companySize = 36
  context.font = `600 ${companySize}px ${family}`
  while (linesFor(context, input.companyName, 936).length > 3 && companySize > 28) {
    companySize -= 2
    context.font = `600 ${companySize}px ${family}`
  }
  for (const [index, line] of linesFor(context, input.companyName, 936).entries()) context.fillText(line, 72, 132 + index * 42)
  const write = (text: string, x: number, y: number, width: number, fontSize: number, lineHeight: number, maxLines: number, weight = 400) => {
    context.font = `${weight} ${fontSize}px ${family}`
    const lines = linesFor(context, text, width)
    if (lines.length > maxLines)
      throw new Error('TEMPLATE_TEXT_TOO_LONG')
    context.fillStyle = colors.foreground
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight))
  }
  const photo = input.photo ? await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('TEMPLATE_INVALID_IMAGE'))
    image.src = input.photo!
  }) : null
  const drawPhoto = (y: number, height: number) => {
    if (!photo)
      return
    const scale = Math.max(936 / photo.width, height / photo.height)
    context.save()
    context.beginPath()
    context.rect(72, y, 936, height)
    context.clip()
    context.drawImage(photo, 72 + (936 - photo.width * scale) / 2, y + (height - photo.height * scale) / 2, photo.width * scale, photo.height * scale)
    context.restore()
  }
  if (input.kind === BrandTemplateKind.Case) {
    if (!photo)
      throw new Error('TEMPLATE_PHOTO_REQUIRED')
    write(input.title, 72, 292, 936, 64, 76, 2, 600)
    drawPhoto(470, 440)
    write(input.body, 72, 966, 936, 36, 48, 8)
  }
  else if (input.kind === BrandTemplateKind.Faq) {
    write(input.title, 72, 300, 936, 64, 80, 3, 600)
    context.fillStyle = colors.muted
    context.fillRect(72, 600, 936, 720)
    write(input.body, 112, 660, 856, 40, 56, 11)
  }
  else {
    if (photo)
      drawPhoto(330, 640)
    write(input.title, 72, photo ? 1020 : 420, 936, 72, 88, 3, 600)
    write(input.body, 72, photo ? 1310 : 820, 936, 36, 48, photo ? 2 : 10)
  }
  return canvas
}
