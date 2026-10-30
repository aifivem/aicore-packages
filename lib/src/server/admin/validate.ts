import { CORE, type DataSpec, type LookupSource } from "@aicore-fivem/shared"
import { resourceExport } from "../../fivem/exports"
import { isRecord } from "../../shared"

const core = resourceExport(CORE.resource)

/** Lang keys of the generic refusals (ai-core's locales). */
export const ERR = {
  type: "ADMIN_ERR_TYPE",
  range: "ADMIN_ERR_RANGE",
  length: "ADMIN_ERR_LENGTH",
  pattern: "ADMIN_ERR_PATTERN",
  required: "ADMIN_ERR_REQUIRED",
  lookup: "ADMIN_ERR_LOOKUP",
} as const

/** Values of a lookup list from ai-core (items, jobs, gangs, accounts), cached for 2 s; null = not known (accepted). */
class LookupCache {
  private readonly lists = new Map<
    LookupSource,
    { at: number; values: Set<string> }
  >()

  values(source: LookupSource): Set<string> | null {
    const cached = this.lists.get(source)
    if (cached && Date.now() - cached.at < 2000)
      return cached.values.size > 0 ? cached.values : null
    let list: unknown = []
    try {
      list = core.GetLookupValues(source)
    } catch {
      // ai-core restarting: the value is checked again on the next edit.
    }
    const values = new Set(
      Array.isArray(list)
        ? list.filter((v): v is string => typeof v === "string")
        : []
    )
    this.lists.set(source, { at: Date.now(), values })
    // An empty list (no inventory running yet) refuses nothing.
    return values.size > 0 ? values : null
  }
}

const lookups = new LookupCache()

export interface Refusal {
  error: string
  /** Dotted path of the value that failed, for the server console. */
  path: string
}

const isVec = (value: unknown, keys: string[]): boolean =>
  isRecord(value) &&
  keys.every((k) => typeof value[k] === "number" && Number.isFinite(value[k]))

/** Checks a value against its spec; the first problem found, or null. */
export function validate(
  spec: DataSpec,
  value: unknown,
  path: string
): Refusal | null {
  if (value === undefined || value === null)
    return spec.optional ? null : { error: ERR.required, path }
  const fail = (error: string): Refusal => ({ error, path })
  switch (spec.type) {
    case "text": {
      if (typeof value !== "string") return fail(ERR.type)
      if (value.length < (spec.min ?? 1) || value.length > (spec.max ?? 120))
        return fail(ERR.length)
      if (spec.pattern && !new RegExp(spec.pattern).test(value))
        return fail(ERR.pattern)
      if (
        spec.lookup &&
        value !== "" &&
        lookups.values(spec.lookup)?.has(value) === false
      )
        return fail(ERR.lookup)
      return null
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value))
        return fail(ERR.type)
      if (spec.integer && !Number.isInteger(value)) return fail(ERR.type)
      if (
        (spec.min !== undefined && value < spec.min) ||
        (spec.max !== undefined && value > spec.max)
      )
        return fail(ERR.range)
      return null
    }
    case "bool":
      return typeof value === "boolean" ? null : fail(ERR.type)
    case "enum":
      return spec.values.includes(value as string | number)
        ? null
        : fail(ERR.type)
    case "names": {
      if (!Array.isArray(value) || value.length > (spec.max ?? 50))
        return fail(ERR.length)
      const pattern = new RegExp(spec.pattern ?? "^[\\w.:-]+$")
      const seen = new Set<string>()
      for (const name of value) {
        if (
          typeof name !== "string" ||
          name.length > (spec.itemMax ?? 64) ||
          seen.has(name)
        )
          return fail(ERR.type)
        if (!pattern.test(name)) return fail(ERR.pattern)
        if (spec.lookup && lookups.values(spec.lookup)?.has(name) === false)
          return fail(ERR.lookup)
        seen.add(name)
      }
      return null
    }
    case "vec3":
      return isVec(value, ["x", "y", "z"]) ? null : fail(ERR.type)
    case "vec4":
      return isVec(value, ["x", "y", "z", "heading"]) ? null : fail(ERR.type)
    case "object": {
      if (!isRecord(value)) return fail(ERR.type)
      for (const key of Object.keys(value))
        if (!(key in spec.fields))
          return { error: ERR.type, path: `${path}.${key}` }
      for (const [key, field] of Object.entries(spec.fields)) {
        const refusal = validate(field, value[key], `${path}.${key}`)
        if (refusal) return refusal
      }
      return null
    }
    case "list": {
      if (!Array.isArray(value)) return fail(ERR.type)
      if (value.length < (spec.min ?? 0) || value.length > (spec.max ?? 100))
        return fail(ERR.length)
      for (let i = 0; i < value.length; i++) {
        const refusal = validate(spec.of, value[i], `${path}.${i + 1}`)
        if (refusal) return refusal
      }
      return null
    }
    default: {
      const _exhaustive: never = spec
      return _exhaustive
    }
  }
}
