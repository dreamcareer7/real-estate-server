const parseAppearance = require('./appearance')
const lineBreak = require('./line-break')

const w = (
  annotations,
  value,
  options = {
    maxFontSize: 20
  }
) => {
  const first = annotations[0]
  const appearance = parseAppearance(first.defaultAppearance)

  const rects = annotations.map(annotation => {
    const rect = annotation.rect

    return {
      left: rect[0],
      top: rect[1],
      right: rect[2],
      bottom: rect[3],
      width: Math.floor(rect[2] - rect[0]),
      height: Math.floor(rect[3] - rect[1]),
      multiline: annotation.multiLine
    }
  })

  const broken = lineBreak(
    value,
    rects,
    appearance.size,
    appearance.font,
    appearance.bold
  )

  const values = {}

  for (const i in annotations) {
    const annotation = annotations[i]
    const { fieldName } = annotation

    values[fieldName] = broken[i] || ''
  }

  return values
}

module.exports = w
