export interface ClockInstance {
  clone: () => ClockInstance
  id: string

  tick: () => ClockInstance
  time: number
}

export class Clock implements ClockInstance {
  constructor(
    public id: string,
    public time = 0,
  ) {}

  static compare(a: ClockInstance, b: ClockInstance): number {
    const dist = a.time - b.time

    if (dist === 0 && a.id !== b.id) {
      return a.id < b.id ? -1 : 1
    }

    return dist
  }

  static create(id: string, time?: number): Clock {
    return new Clock(id, time)
  }

  clone(): Clock {
    return new Clock(this.id, this.time)
  }

  tick(): Clock {
    return new Clock(this.id, this.time + 1)
  }
}
