const slug = require('slug')

/**
 * @param {string} str
 * @param {string=} [sep]
 */
module.exports = function slugify (str, sep = '-') {
  if (!str) {
    return ''
  }
  
  str = str.toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s{1,}/g, ' ')

  return slug(str, sep)
}
