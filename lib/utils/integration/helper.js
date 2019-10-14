const cleanString = function (input) {
  let output = ''

  for (let i = 0; i < input.length; i ++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i)
    }
  }

  return output.replace(/%20/g, ' ')
}


module.exports = {
  cleanString
}