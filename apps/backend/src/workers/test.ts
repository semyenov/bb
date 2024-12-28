import consola from 'consola'

type TestType = Record<string, string[]>

function generateCombinations(test: Record<string, string[]>): string[][] {
  const keys = Object.keys(test)
  const combinations: string[][] = []

  const generate = (current: string[], index: number): void => {
    if (index === keys.length) {
      combinations.push(current)

      return
    }

    const key = keys[index]!
    const values = test[key]

    for (const value of values!) {
      const newCurrent = current.concat(`${key}-${value}`)
      generate(newCurrent, index + 1)
    }
  }

  generate([], 0)

  return combinations
}

const test: TestType = {
  color: [
    'red',
    'green',
    'blue',
  ],
  material: [
    'wood',
    'plastic',
    'metal',
  ],
  size: [
    'xs',
    's',
    'm',
    'l',
    'xl',
  ],
}

const result = generateCombinations(test)
consola.log(result)
