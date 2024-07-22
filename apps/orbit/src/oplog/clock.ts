export interface ClockInstance {
  id: string
  time: number
}

export const Clock = (id: string, time: number) => {
  return {
    id,
    time: time || 0,
  }
}

export function compareClocks(a: ClockInstance, b: ClockInstance) {
  // Calculate the "distance" based on the clock, ie. lower or greater
  const dist = a.time - b.time

  // If the sequence number is the same (concurrent events),
  // and the IDs are different, take the one with a "lower" id
  if (dist === 0 && a.id !== b.id) {
    return a.id < b.id ? -1 : 1
  }

  return dist
}

export function tickClock(clock: ClockInstance) {
  return Clock(clock.id, ++clock.time)
}
