import { mutableEmpty } from "../util"
import { createDataType } from "./schema_utils"
import { DataType } from "./schema_types"

export const array = <T>(type: DataType<T>) =>
  createDataType<T[]>({
    create(value = []) {
      return value
    },
    reset(c, key, defaultValue) {
      if (typeof defaultValue !== "undefined") {
        c[key] = defaultValue.slice()
      } else {
        mutableEmpty(c[key])
      }
    },
  })

export const number = createDataType<number>({
  create(value = 0) {
    return value
  },
  reset(c, key, value = 0) {
    c[key] = value
  },
})
