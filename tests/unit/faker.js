class Faker {
  static string(length = 16) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
  }

  static number(min = 0 , max = 10000) {
    return Math.floor(Math.random() * (max + 1)) + min
  }

  static id() { 
    return `${this.string(8)}-${this.string(4)}-${this.string(4)}-${this.string(4)}-${this.string(12)}`.toLowerCase()
  }

  static simpleName(length = 6) {
    const characters = 'abcdefghijklmnopqrstuvwxyz'
    let result = ''
    const charactersLength = characters.length
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
  }
}

module.exports = {
  Faker
}