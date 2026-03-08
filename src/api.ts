import { AsciiManager } from './manager';
import type { DplImportOptions, DplImportResult, DplExportOptions, DplExportResult } from './types';

/**
 * Shared manager instance used by the convenience functions.
 */
const manager = new AsciiManager();

/**
 * Import a DPL file (or wildcard pattern) into a WinCC OA project.
 *
 * This is a convenience wrapper around {@link AsciiManager.import}
 * using a shared singleton instance.
 *
 * @param options - Import options (version, inputPath, project reference, etc.)
 * @returns Import result
 *
 * @example
 * ```ts
 * const result = await importDpl({
 *     version: '3.21',
 *     configPath: '/path/to/project/config/config',
 *     inputPath: '/path/to/data.dpl',
 *     typesAction: 'yes',
 * });
 * console.log(result.success); // true
 * ```
 */
export async function importDpl(options: DplImportOptions): Promise<DplImportResult> {
    return manager.import(options);
}

/**
 * Export datapoints from a WinCC OA project to a DPL file.
 *
 * This is a convenience wrapper around {@link AsciiManager.export}
 * using a shared singleton instance.
 *
 * @param options - Export options (version, outputPath, project reference, filters, etc.)
 * @returns Export result
 *
 * @example
 * ```ts
 * const result = await exportDpl({
 *     version: '3.21',
 *     configPath: '/path/to/project/config/config',
 *     outputPath: '/path/to/out.dpl',
 *     filter: 'DP',
 * });
 * console.log(result.success); // true
 * ```
 */
export async function exportDpl(options: DplExportOptions): Promise<DplExportResult> {
    return manager.export(options);
}
