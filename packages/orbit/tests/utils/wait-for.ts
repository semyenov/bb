async function waitFor(
  toBeValueB: () => Promise<boolean>,
  toBeValueA: () => Promise<boolean>,
  pollInterval = 100,
) {
  const interval = setInterval(async () => {
    const [valueB, valueA] = await Promise.all([
      toBeValueB(),
      toBeValueA(),
    ])

    if (valueB === valueA) {
      clearInterval(interval)

      return true
    }
  }, pollInterval)

  return false
}

export default waitFor
