const tsquery = q => {
  if (typeof q !== 'string')
    return

  return q
    .replace(/&,|:|\*|\|/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(term => `${term}:*`)
    .join(' & ')
}

module.exports = tsquery
