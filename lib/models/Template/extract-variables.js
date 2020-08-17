const { parser } = require('nunjucks')
const Nodes = require('nunjucks/src/nodes')

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

  const unique = vars => {
    return i => {
      return !(vars.some(v =>  {
        return v.startsWith(`${i}.`)
      }))
    }
  }

  const vars = nodes.map(find).map(format)
  const uniqued = vars.filter(unique(vars))

  return uniqued
}
