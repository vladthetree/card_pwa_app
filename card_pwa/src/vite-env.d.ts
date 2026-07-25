/**
 * AI_CONTEXT: Vite/PWA TypeScript ambient declarations for build constants and import metadata.
 */
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD_VERSION__: string
declare const __APP_BUILD_STAMP__: string
declare const __APP_SW_VERSION__: string

interface ImportMetaEnv {
	readonly VITE_SYNC_ENDPOINT?: string
	readonly VITE_PROFILE_SYNC_ENDPOINT?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
