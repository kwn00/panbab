"use client";

import { useSyncExternalStore } from "react";

type FavoriteState = { ids: readonly string[]; error: string | null };
const key = "panbab:favorite-restaurants:v1";
const initial: FavoriteState = { ids: [], error: null };
let cached: FavoriteState = initial;
let lastValue: string | null | undefined;
const listeners = new Set<() => void>();

function reportStorageError(error: unknown) {
  console.error("[panbab:favorites]", error);
  if (!cached.error) {
    cached = {
      ...cached,
      error: "이 브라우저에 식당을 저장하지 못했어요. 브라우저의 저장 공간 설정을 확인해주세요.",
    };
  }
}

function getSnapshot(): FavoriteState {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === lastValue) return cached;
    lastValue = raw;
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
      throw new Error("Invalid saved restaurant data");
    }
    cached = { ids: [...new Set<string>(value)], error: null };
  } catch (error) {
    reportStorageError(error);
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useFavorites() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => initial);

  function toggle(id: string) {
    const current = getSnapshot();
    const ids = current.ids.includes(id)
      ? current.ids.filter((saved) => saved !== id)
      : [...current.ids, id];
    try {
      const raw = JSON.stringify(ids);
      window.localStorage.setItem(key, raw);
      lastValue = raw;
      cached = { ids, error: null };
    } catch (error) {
      reportStorageError(error);
    }
    listeners.forEach((listener) => listener());
  }

  return { ...state, toggle };
}
