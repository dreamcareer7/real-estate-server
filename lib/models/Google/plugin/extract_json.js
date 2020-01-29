/* 
  Credit: 
    https://github.com/esoodev
    https://stackoverflow.com/questions/10574520/extract-json-from-text
*/

module.exports = {

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
  },

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

  extractJSON: function(str) {
    const result = []

    let firstOpen  = 0
    let firstClose = 0
    let candidate  = 0
  
    firstOpen = str.indexOf('{', firstOpen + 1)
  
    do {
      firstClose = str.lastIndexOf('}')
  
      if ( firstClose <= firstOpen ) {
        return null
      }
  
      do {
        candidate = str.substring(firstOpen, firstClose + 1)
  
        try {
          result.push(JSON.parse(candidate))
          firstOpen = firstClose
        } catch (e) {
          firstClose = str.substr(0, firstClose).lastIndexOf('}')
        }
  
      } while ( firstClose > firstOpen )
  
      firstOpen = str.indexOf('{', firstOpen + 1)
  
    } while ( firstOpen !== -1 )
  
    return result
  }
}