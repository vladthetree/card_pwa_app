export const APP_NAME = 'Card_PWA'

export const STORAGE_KEYS = {
  settings: 'card-pwa-settings',
  legacySettings: 'anki-pwa-settings',
  theme: 'card-pwa-theme',
  legacyTheme: 'anki-pwa-theme',
  studySession: 'card-pwa-study-session',
  legacyStudySession: 'anki-pwa-study-session',
  algorithmMigration: 'card-pwa-algorithm-migration-version',
  legacyAlgorithmMigration: 'algorithm-migration-version',
  algorithmDiagnostics: 'card-pwa-algorithm-diagnostics',
  errorLog: 'card-pwa-error-log',
  brandingMigration: 'card-pwa-branding-migration-v1',
  homeShowHeatmap: 'card-pwa-home-heatmap',
  homeDashboardMode: 'card-pwa-home-dashboard-mode',
  homeDeckSortMode: 'card-pwa-home-deck-sort-mode',
} as const

export const DATABASE_NAMES = {
  app: 'card-pwa-db',
  legacyApp: 'anki-pwa-db',
  syncQueue: 'card-pwa-sync-queue',
  legacySyncQueue: 'anki-pwa-sync-queue',
} as const

export const SW_CHANNELS = {
  updateEvent: 'card-pwa-sw-update',
  syncTag: 'card-pwa-sync',
  periodicSyncTag: 'card-pwa-periodic-sync',
} as const

/** Fired on `window` after any review is recorded or undone so components
 *  (e.g. ReviewHeatmap) can refresh without polling. */
export const REVIEW_UPDATED_EVENT = 'card-pwa-reviews-updated' as const

export const BACKUP_METADATA = {
  app: 'card-pwa',
  legacyApp: 'anki-pwa',
  prefix: 'card-pwa-meta:',
  legacyPrefix: 'anki-pwa-meta:',
  marker: '#card-pwa:backup-v1',
  legacyMarker: '#anki-pwa:backup-v1',
} as const
