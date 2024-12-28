import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktypeMultiFile,
} from 'quicktype-core'

import type {
  JSONSchemaSourceData,
  Options,
  TargetLanguage,
} from './vendor.d'

export async function quicktypeMultipleJSONSchema(
  lang: string | TargetLanguage,
  data: JSONSchemaSourceData[],
  options: Omit<Partial<Options>, 'inputData'>,
) {
  const inputData = new InputData()
  const schemaStore = new FetchingJSONSchemaStore()
  const jsonSchemaInput = new JSONSchemaInput(schemaStore)

  await Promise.all(data.map(jsonSchemaInput.addSource))
  inputData.addInput(jsonSchemaInput)

  return quicktypeMultiFile({
    alphabetizeProperties: true,
    combineClasses: true,
    inputData,
    lang,
    ...options,
  })
}
