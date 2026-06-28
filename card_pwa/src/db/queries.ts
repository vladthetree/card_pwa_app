/**
 * AI_CONTEXT: Compatibility re-export for the public database query API.
 */
// All query implementations now live in src/db/queries/.
// This file keeps every existing import path working unchanged.
export * from './queries/index'
