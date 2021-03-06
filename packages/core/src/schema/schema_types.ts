import * as types from "./standard_data_types"
import { Component } from "../component"

export type SchemaKey<T = unknown> = Schema | DataType<T> | { type: DataType<T>; defaultValue?: T }

export type Schema = {
  [key: string]: SchemaKey
}

export type AnySchema = {
  [key: string]: SchemaKey<any>
}

export type ComponentOfSchema<S extends Schema> = S extends DataType<infer T>
  ? T
  : {
      [K in keyof S]: S[K] extends SchemaKey<infer T> ? T : never
    }

export const $isDataType = Symbol("isDataType")

export type DataType<T> = {
  [$isDataType]: true
  create(defaultValue: T): T
  reset(component: {}, key: string, defaultValue: T): void
}
