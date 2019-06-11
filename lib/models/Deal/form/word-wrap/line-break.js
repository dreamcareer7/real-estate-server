const measure = require('string-pixel-width')

const breakText = (text, rects, fontSize, fontName, isBold) => {
  if (!text) {
    text = ''
  }

  const values = {}

  const words = text
    .toString()
    .trim()
    .split(/\s{1,}/g)

  let i = -1
  let line

  if (!fontSize)
    fontSize = rects[0].height

  if (rects[0].multiline) {
    return {
      values: [text],
      fontSize
    }
  }

  const linebreak = () => {
    if (!rects[i + 1]) {
      return false
    }

    i++
    line = ''



    return true
  }

  linebreak()

  let word
  let pre = ''

  while ((word = words[0])) {
    pre = line

    line += `${word} `

    const width = measure(line, {
      size: fontSize,
      font: 'Arial'
    })

    if (width >= rects[i].width) {
      if (linebreak()) {
        values[i - 1] = pre
        continue
      } else {
        /* Text did not fit the boundaries but line break is not possible
           because there is no more new text areas.
           We have to shrink the font size and try again
           */
        return breakText(text, rects, fontSize - 1, fontName, isBold)
      }
    }

    values[i] = line.trim()
    words.shift()
  }

  return values
}

module.exports = breakText
