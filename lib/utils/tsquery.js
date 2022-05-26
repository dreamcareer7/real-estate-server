/*
 * So when users search for something super short like "12" or "12 texas",
 * we'd go turn it into this tsquery: "12:* & texas:*"
 * The problem with this is that "12" is so frequently used that the result set is huge, oftening causing timeouts and such.
 *
 * So, the query builder uses this term function to get a little more smart:
 *
 * Of there's a search term smaller than 3 characters, dont make it a `12:*` query. Instead, make it a "12" query.
 * I support this not only improve performance, it also improves accuracy of the results, because when you're searching for
 * something so common, you probably mean "12" specifically. If you're looking for "12345" and you search for "12" you already know
 * there's going to be so many results, your's is probably gonna be lost somewhere in between.
 */

const tokenize = t => {
  if (t.length < 3)
    return t

  return `${t}:*`
}

const tsquery = q => {
  if (typeof q !== 'string')
    return

  return q
    .replace(/&,|:|\*|\|/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(tokenize)
    .join(' & ')
}

module.exports = tsquery
