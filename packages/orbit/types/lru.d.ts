declare module 'lru' {
  export default class LRU<T> {
    constructor(size: number)
    set(key: string, value: T): void
    get(key: string): T | undefined
    remove(key: string): void
    readonly keys: string[]
  }
}
