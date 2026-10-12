import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      const parsed = JSON.parse(raw) as T
      // Shallow merge with defaults to fill in fields missing in old saved state (migration)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
          initial && typeof initial === 'object' && !Array.isArray(initial)) {
        return { ...initial, ...parsed } as T
      }
      return parsed
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  const update = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof v === 'function' ? (v as (p: T) => T)(prev) : v))
  }, [])

  return [value, update] as const 
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
