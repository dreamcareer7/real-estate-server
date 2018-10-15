const pdfjs = require('pdfjs-dist')

const ASSIGNMENT = 'Assignment'

const parse = (viewport, a) => {
  const has = a.additional && a.additional.calculate && a.additional.calculate.JS

  if (!has)
    return

  const { JS } = a.additional.calculate

  let assignment

  try {
    assignment = JSON.parse(JS)
  } catch(e) {
    return
  }

  if (assignment.type !== ASSIGNMENT)
    return

  const rect = pdfjs.Util.normalizeRect(
    viewport.convertToViewportRectangle(a.rect)
  )

  return {
    rect,
    assignment
  }
}

const extract = async data => {
  const assignments = []

  const document = await pdfjs.getDocument({data})

  for(let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i)
    const annotations = await page.getAnnotations()
    const viewport = page.getViewport(1)

    annotations
      .map(a => parse(viewport, a))
      .filter(Boolean)
      .map(assignment => {
        return {
          page: i,
          ...assignment
        }
      })
      .forEach(a => assignments.push(a))
  }

  return assignments
}

module.exports = extract