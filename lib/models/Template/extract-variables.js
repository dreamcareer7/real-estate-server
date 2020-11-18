const { parser } = require('nunjucks')
const Nodes = require('nunjucks/src/nodes')
const { uniq } = require('lodash')

const find = lv => {
  if (lv instanceof Nodes.Symbol)
    return [
      lv.value
    ]

  const stack = [
    lv.val.value
  ]

  stack.push(...find(lv.target))

  return stack
}

const format = stack => {
  stack.reverse()
  return stack.join('.')
}


module.exports = str => {
  const ast = parser.parse(str)
  const nodes = ast.findAll(Nodes.LookupVal)

  /*
   * Imagine we have `listing.property.bedroom_count` in variables.
   * Without this function, we'll return ['listing', 'listing.propperty', 'listing.property.bedroom_count']
   * But the desired value is just `[listing.property.bedroom_count]`
   */
  const full_path = vars => {
    return i => {
      return !(vars.some(v =>  {
        return v.startsWith(`${i}.`)
      }))
    }
  }

  const vars = nodes.map(find).map(format)
  return uniq(vars.filter(full_path(vars)))
}
