import type { EntryInstance } from './entry'

import { Clock } from './clock'

export class ConflictResolution {
  static LastWriteWins<T>(a: EntryInstance<T>, b: EntryInstance<T>): number {
    const sortByEntryClocks = (a: EntryInstance<T>, b: EntryInstance<T>) => {
      return ConflictResolution.SortByClocks(a, b, ConflictResolution.sortById)
    }

    return sortByEntryClocks(a, b)
  }

  static NoZeroes<T>(
    func: (a: EntryInstance<T>, b: EntryInstance<T>) => number,
  ): (a: EntryInstance<T>, b: EntryInstance<T>) => number {
    const msg = `Your log's tiebreaker function, ${func.name}, has returned zero and therefore cannot be used to resolve conflicts.`

    return (a: EntryInstance<T>, b: EntryInstance<T>) => {
      const result = func(a, b)
      if (result === 0) {
        throw new Error(msg)
      }

      return result
    }
  }

  static SortByClockId<T>(
    a: EntryInstance<T>,
    b: EntryInstance<T>,
    resolveConflict: (a: EntryInstance<T>, b: EntryInstance<T>) => number,
  ): number {
    return a.clock.id === b.clock.id
      ? resolveConflict(a, b)
      : (a.clock.id < b.clock.id
          ? -1
          : 1)
  }

  static SortByClocks<T>(
    a: EntryInstance<T>,
    b: EntryInstance<T>,
    resolveConflict: (a: EntryInstance<T>, b: EntryInstance<T>) => number,
  ): number {
    const diff = Clock.compare(a.clock, b.clock)

    return diff === 0 ? resolveConflict(a, b) : diff
  }

  private static First<T>(_a: EntryInstance<T>, _b: EntryInstance<T>): number {
    return 1
  }

  private static sortById<T>(a: EntryInstance<T>, b: EntryInstance<T>): number {
    return ConflictResolution.SortByClockId(a, b, ConflictResolution.First)
  }
}
