declare module 'lru' {
  export default class LRU<T> {
    readonly keys: string[]
    constructor(size: number)
    get(key: string): T | undefined
    remove(key: string): void
    set(key: string, value: T): void
  }
}
