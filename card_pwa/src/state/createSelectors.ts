/**
 * AI_CONTEXT:
 * Role: Selector helper so components subscribe to narrow UI-state fragments
 * instead of the full app store.
 */
import { useAppStore, type AppStore } from './appStore'

type SelectorMap = Record<string, (store: AppStore) => unknown>

export function createSelectors<TSelectors extends SelectorMap>(selectors: TSelectors) {
  return Object.fromEntries(
    Object.entries(selectors).map(([key, selector]) => [
      key,
      () => useAppStore(selector),
    ]),
  ) as {
    [Key in keyof TSelectors]: () => ReturnType<TSelectors[Key]>
  }
}

