/**
 * WinCC OA ASCII Manager – DPL import & export
 *
 * Provides programmatic access to WCCOAascii for importing and exporting
 * datapoint lists (DPL files) in WinCC OA projects.
 */

// Types
export type {
    AsciiBaseOptions,
    DplImportOptions,
    DplImportResult,
    DplExportOptions,
    DplExportResult,
    AsciiOutputVersion,
} from './types';

// Core manager
export { AsciiManager } from './manager';

// Convenience API
export { importDpl, exportDpl } from './api';
