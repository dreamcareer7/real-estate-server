// Credit: https://github.com/esoodev

module.exports = {

  extract: function (str) {
    let currIndex = 0
    const objs    = []

    while (str[currIndex]) {
      const openClose = this._getOpenCloseBraceIndex(str, currIndex, '{', '}')

      if (openClose) {
        const objStr = str.substr(openClose[0], openClose[1] - openClose[0] + 1)

        try {
          const parsed = JSON.parse(objStr)
          
          if (parsed)
            objs.push(parsed)
            
          currIndex = openClose[1]

        } catch (err) {
          currIndex ++
        }

      } else {
        currIndex ++
      }
    }

    return objs
  },

  _getOpenCloseBraceIndex: function (str, indexStart, openBrace, closeBrace) {
    const openIndex = str.substr(indexStart).indexOf(openBrace) + indexStart

    if (!openIndex)
      return null

    let openCount  = 1
    let closeCount = 0
    let currIndex  = openIndex + 1

    while (str[currIndex]) {

      if (str[currIndex] === openBrace) {
        openCount ++
        currIndex ++
      
        continue

      } else if (str[currIndex] === closeBrace) {

        closeCount ++

        if (openCount === closeCount) {
          return [openIndex, currIndex]
        }
      }

      currIndex ++
    }

    return null
  }
}