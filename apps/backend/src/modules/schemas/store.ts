import { v4 as uuidv4 } from 'uuid'
import { JsonSchema, JsonSchemaInput, JsonSchemaSchema } from './schema'
import { KeyStoreInstance } from '@regioni/orbit'
import { Storage } from '@regioni/orbit'

export interface JsonSchemaStoreInstance {
  create(input: JsonSchemaInput): Promise<JsonSchema>
  get(id: string): Promise<JsonSchema | null>
  update(id: string, input: Partial<JsonSchemaInput>): Promise<JsonSchema>
  delete(id: string): Promise<void>
  list(options?: { limit?: number, offset?: number }): Promise<JsonSchema[]>
}

export class JsonSchemaStore implements JsonSchemaStoreInstance {
  private storage: Storage<JsonSchema>
  private keystore: KeyStoreInstance

  constructor(storage: Storage<JsonSchema>, keystore: KeyStoreInstance) {
    this.storage = storage
    this.keystore = keystore
  }

  async create(input: JsonSchemaInput): Promise<JsonSchema> {
    const schemaToSave: JsonSchema = {
      ...input,
      id: uuidv4(),
      createdAt: new Date(),
      version: input.version || '1.0.0'
    }

    const validatedSchema = JsonSchemaSchema.parse(schemaToSave)
    await this.storage.put(validatedSchema.id, validatedSchema)
    return validatedSchema
  }

  async get(id: string): Promise<JsonSchema | null> {
    return await this.storage.get(id)
  }

  async update(id: string, input: Partial<JsonSchemaInput>): Promise<JsonSchema> {
    const existing = await this.get(id)
    if (!existing) throw new Error('Schema not found')

    const updatedSchema: JsonSchema = {
      ...existing,
      ...input,
      updatedAt: new Date()
    }

    const validatedSchema = JsonSchemaSchema.parse(updatedSchema)
    await this.storage.put(id, validatedSchema)
    return validatedSchema
  }

  async delete(id: string): Promise<void> {
    await this.storage.del(id)
  }

  async list(options?: { limit?: number, offset?: number }): Promise<JsonSchema[]> {
    const { limit = 100, offset = 0 } = options || {}
    const all = await this.storage.all()
    return all.slice(offset, offset + limit)
  }
}
