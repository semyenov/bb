import type {
  JSONSchemaSourceData,
  Options,
  TargetLanguage,
} from './vendor.d'

import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktypeMultiFile,
} from 'quicktype-core'

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
    lang,
    inputData,
    combineClasses: true,
    alphabetizeProperties: true,
    ...options,
  })
}
