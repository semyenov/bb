const type = 'no-verify-identity'

function NoVerifyIdentityIdentityProvider() {
  return async () => {
    return {
      type,
    }
  }
}

NoVerifyIdentityIdentityProvider.type = type

export default NoVerifyIdentityIdentityProvider
