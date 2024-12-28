import type { IdentityProviderInstance } from '@orbitdb/core'

const type = 'custom'

async function verifyIdentity(_data) {
  return true
}

// function CustomIdentityProvider() {
//   return async () => {
//     const getId = () => {
//       return 'custom'
//     }

//     const signIdentity = (data) => {
//       return `signature '${data}'`
//     }

//     return {
//       getId,
//       signIdentity,
//       type,
//     } as IdentityProviderInstance
//   }
// }

class CustomIdentityProvider implements IdentityProviderInstance {
  static type = 'custom'

  static verifyIdentity = verifyIdentity

  constructor() {
    console.log('CustomIdentityProvider.constructor')
  }

  static signIdentity = (data) => {
    return `false signature '${data}'`
  }

  getId = () => {
    return 'pubKey'
  }

  signIdentity() {
    return 'false signature'
  }
}

// CustomIdentityProvider.type = type

export default CustomIdentityProvider
