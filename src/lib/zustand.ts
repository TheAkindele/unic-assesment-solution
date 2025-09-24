import { useSyncExternalStore } from "react"

export type SetState<T> = (
	partial: Partial<T> | ((state: T) => Partial<T>),
	replace?: boolean
) => void
export type GetState<T> = () => T
export type StateCreator<T> = (set: SetState<T>, get: GetState<T>) => T
export type StoreSubscriber<T> = (state: T, previous: T) => void

export interface StoreApi<T> {
	getState: GetState<T>
	setState: SetState<T>
	subscribe: (listener: StoreSubscriber<T>) => () => void
}

export interface PersistStorage {
	getItem: (name: string) => string | null
	setItem: (name: string, value: string) => void
	removeItem: (name: string) => void
}

function createStoreApi<T>(initializer: StateCreator<T>): [StoreApi<T>, T] {
	let state: T
	const listeners = new Set<StoreSubscriber<T>>()

	const setState: SetState<T> = (partial, replace) => {
		const partialState =
			typeof partial === "function"
				? (partial as (state: T) => Partial<T>)(state)
				: partial
		const nextState = replace
			? (partialState as T)
			: Object.assign({}, state, partialState)
		if (Object.is(nextState, state)) return
		const previousState = state
		state = nextState
		listeners.forEach((listener) => listener(state, previousState))
	}

	const getState: GetState<T> = () => state

	const subscribe = (listener: StoreSubscriber<T>) => {
		listeners.add(listener)
		return () => listeners.delete(listener)
	}

	state = initializer(setState, getState)

	return [
		{
			getState,
			setState,
			subscribe,
		},
		state,
	]
}

export function create<T>(initializer: StateCreator<T>) {
	const [api] = createStoreApi(initializer)

	function useStore<S>(
		selector: (state: T) => S = (state) => state as unknown as S
	): S {
		const state = useSyncExternalStore(
			api.subscribe,
			api.getState,
			api.getState
		)
		return selector(state)
	}

	const storeHook = useStore as typeof useStore & StoreApi<T>
	storeHook.getState = api.getState
	storeHook.setState = api.setState
	storeHook.subscribe = api.subscribe

	return storeHook
}

export interface PersistOptions<T> {
	name: string
	storage?: PersistStorage
	version?: number
	migrate?: (persistedState: T, version: number) => T
}

function defaultStorage(): PersistStorage | undefined {
	if (typeof window === "undefined") return undefined
	const storage = window.localStorage
	return {
		getItem: storage.getItem.bind(storage),
		setItem: storage.setItem.bind(storage),
		removeItem: storage.removeItem.bind(storage),
	}
}

export function createJSONStorage(
	getStorage: () => PersistStorage | undefined
): PersistStorage {
	return {
		getItem: (name) => getStorage()?.getItem(name) ?? null,
		setItem: (name, value) => getStorage()?.setItem(name, value),
		removeItem: (name) => getStorage()?.removeItem(name),
	}
}

export function persist<T>(
	initializer: StateCreator<T>,
	options: PersistOptions<T>
): StateCreator<T> {
	return (set, get) => {
		const storage = options.storage ?? defaultStorage()
		const version = options.version ?? 0

		const setWithPersist: SetState<T> = (partial, replace) => {
			set(partial, replace)
			const currentState = get()
			if (storage) {
				storage.setItem(
					options.name,
					JSON.stringify({ state: currentState, version })
				)
			}
		}

		const state = initializer(setWithPersist, get)

		if (storage) {
			try {
				const cached = storage.getItem(options.name)
				if (cached) {
					const parsed = JSON.parse(cached) as { state: T; version: number }
					const migrated = options.migrate
						? options.migrate(parsed.state, parsed.version)
						: parsed.state
					set(Object.assign({}, state, migrated))
				}
			} catch (error) {
				console.warn("Failed to rehydrate state", error)
				storage.removeItem(options.name)
			}
		}

		return state
	}
}
