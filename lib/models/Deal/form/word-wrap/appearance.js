const parseAppearanceString = (string = '') => {
  const annotation = string.split(/\s/)

  let red = 0
  let green = 0
  let blue = 0

  const parsed = string.match(/\/([a-zA-Z_,]*)\s*(\d+)/)

  const fullFont = parsed[1]

  const font = fullFont.match(/([a-zA-Z_]*)/gi)[0]
  const size = parseFloat(parsed[2])
  const bold = fullFont.search(/bold/gi) > -1

  const gi = annotation.indexOf('g')

  if (gi > -1) {
    // eslint-disable-next-line
    red = green = blue = parseFloat(annotation[gi - 1]) * 255
  }

  const rgi = annotation.indexOf('rg')

  if (rgi > -1) {
    red = parseFloat(annotation[rgi - 3]) * 255
    green = parseFloat(annotation[rgi - 2]) * 255
    blue = parseFloat(annotation[rgi - 1]) * 255
  }

  /*
   * Safari cannot accept floats in css rgb().
   * That's why we round them.
   */
  const color = `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(
    blue
  )})`

  return {
    font,
    size,
    color,
    bold
  }
}

module.exports = parseAppearanceString
