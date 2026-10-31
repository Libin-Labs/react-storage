'use client';
import { useEffect, useRef, useState } from 'react';
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function safeParseJson(text: string, maxBytes = 65536): unknown {
  if (
    !Number.isInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 1048576 ||
    new TextEncoder().encode(text).length > maxBytes
  )
    throw new RangeError('JSON byte limit exceeded.');
  const value: unknown = JSON.parse(text);
  const stack = [{ value, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const item = stack.pop()!;
    if (++count > 10000 || item.depth > 20) throw new RangeError('JSON structure limit exceeded.');
    if (item.value && typeof item.value === 'object')
      for (const [key, nested] of Object.entries(item.value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key))
          throw new TypeError('Unsafe JSON property.');
        stack.push({ value: nested, depth: item.depth + 1 });
      }
  }
  return value;
}
export interface StorageOptions<T> {
  validate: (value: unknown) => value is T;
  version?: number;
  migrate?: (value: unknown, fromVersion: number) => unknown;
  storage?: StorageAdapter;
  maxBytes?: number;
  listen?: boolean;
}
export function useStorage<T>(key: string, initial: T, options: StorageOptions<T>) {
  const { version = 1, maxBytes = 65536, storage, listen = true } = options;
  if (
    !/^[\w.:-]{1,128}$/.test(key) ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    !Number.isInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 1048576
  )
    throw new TypeError('Invalid storage key, version or byte limit.');
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<Error | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const reference = useRef(value);
  reference.current = value;
  const initialValue = useRef(initial);
  const config = useRef(options);
  config.current = options;
  const adapter = () => storage ?? window.localStorage;
  const failure = (reason: unknown) =>
    setError(reason instanceof Error ? reason : new Error(String(reason)));
  useEffect(() => {
    const read = () => {
      try {
        const text = adapter().getItem(key);
        if (text === null) {
          reference.current = initialValue.current;
          setValue(initialValue.current);
          setError(null);
          return;
        }
        const parsed = safeParseJson(text, maxBytes) as {
          version?: unknown;
          data?: unknown;
        };
        if (!parsed || typeof parsed !== 'object' || !Number.isSafeInteger(parsed.version))
          throw new TypeError('Invalid storage envelope.');
        const data =
          parsed.version === version
            ? parsed.data
            : config.current.migrate?.(parsed.data, parsed.version as number);
        if (!config.current.validate(data))
          throw new TypeError('Stored value failed schema validation.');
        reference.current = data;
        setValue(data);
        setError(null);
      } catch (reason) {
        failure(reason);
      } finally {
        setHydrated(true);
      }
    };
    read();
    if (!listen) return;
    const changed = (event: Event) => {
      if (event.type === 'storage') {
        const update = event as StorageEvent;
        if (update.key !== key && update.key !== null) return;
      } else if (
        (
          event as CustomEvent<{
            key: string;
          }>
        ).detail?.key !== key
      )
        return;
      read();
    };
    window.addEventListener('storage', changed);
    window.addEventListener('lp-storage-change', changed);
    return () => {
      window.removeEventListener('storage', changed);
      window.removeEventListener('lp-storage-change', changed);
    };
  }, [key, version, maxBytes, storage, listen]);
  const set = (next: T | ((old: T) => T)): boolean => {
    try {
      const data = typeof next === 'function' ? (next as (old: T) => T)(reference.current) : next;
      if (!config.current.validate(data)) throw new TypeError('Value failed schema validation.');
      const text = JSON.stringify({ version, data });
      safeParseJson(text, maxBytes);
      adapter().setItem(key, text);
      reference.current = data;
      setValue(data);
      setError(null);
      window.dispatchEvent(new window.CustomEvent('lp-storage-change', { detail: { key } }));
      return true;
    } catch (reason) {
      failure(reason);
      return false;
    }
  };
  const remove = () => {
    try {
      adapter().removeItem(key);
      reference.current = initialValue.current;
      setValue(initialValue.current);
      setError(null);
      window.dispatchEvent(new window.CustomEvent('lp-storage-change', { detail: { key } }));
      return true;
    } catch (reason) {
      failure(reason);
      return false;
    }
  };
  return { value, set, remove, error, hydrated };
}
export default useStorage;
