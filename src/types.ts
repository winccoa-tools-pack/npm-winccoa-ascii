/**
 * Shared base options for all WCCOAascii operations.
 */
export interface AsciiBaseOptions {
    /**
     * WinCC OA version to use (e.g., '3.21').
     * Required to locate the correct WCCOAascii executable.
     */
    version: string;

    /**
     * WinCC OA project name.
     * Maps to the `-proj` flag. Either `projectName` or `configPath` must be provided.
     */
    projectName?: string;

    /**
     * Path to the WinCC OA project config file.
     * Maps to the `-config` flag. Takes precedence over `projectName` when both are set.
     */
    configPath?: string;

    /**
     * Use local time instead of GMT for timestamps.
     * Maps to the `-localTime` flag.
     * @default false
     */
    localTime?: boolean;

    /**
     * Username and optional password for WinCC OA authentication.
     * Format: `username` or `username:password`.
     * Maps to the `-user` flag.
     */
    user?: string;

    /**
     * Manager number for this ASCII manager instance.
     * Maps to the `-num` flag.
     */
    managerNumber?: number;

    /**
     * Hostname and optional port for the WCCILdata server.
     * Format: `hostname` or `hostname:port`.
     * Maps to the `-data` flag.
     */
    dataServer?: string;

    /**
     * Hostname and optional port for the WCCILevent server.
     * Format: `hostname` or `hostname:port`.
     * Maps to the `-event` flag.
     */
    eventServer?: string;

    /**
     * Timeout in milliseconds for the WCCOAascii process.
     * @default 120000
     */
    timeout?: number;

    /**
     * Run in standalone mode without connecting to Data/Event managers (`-n` flag).
     * In SQLite projects WCCOAasciiSQLite can read and write the sqlite database
     * files directly, so this allows import/export without any running managers.
     * @default false
     */
    standalone?: boolean;
}

// ── Import ────────────────────────────────────────────────────────────────────

/**
 * Options for a DPL import operation via `WCCOAascii -in`.
 */
export interface DplImportOptions extends AsciiBaseOptions {
    /**
     * Path to the DPL file or wildcard pattern to import (e.g. `*.dpl`).
     * Maps to the `-in` flag.
     */
    inputPath: string;

    /**
     * Number of messages to send before waiting for acknowledgement.
     * Maps to the `-commit` flag.
     */
    commitCount?: number;

    /**
     * How to handle datapoint type conflicts during import.
     * - `'yes'` → change types without confirmation (`-Typesyes`)
     * - `'no'`  → do not change types and don't ask (`-Typesno`)
     */
    typesAction?: 'yes' | 'no';

    /**
     * How to handle CNS view conflicts during import.
     * - `'yes'` → do not change existing CNS nodes (`-CNSyes`)
     * - `'no'`  → same, but suppress warnings (`-CNSno`)
     */
    cnsAction?: 'yes' | 'no';

    /**
     * Suppress progress output; only errors will be printed.
     * Maps to the `-noVerbose` flag.
     * @default false
     */
    noVerbose?: boolean;

    /**
     * Inactivate AlertValue configs on import.
     * Maps to the `-inactivateAlert` flag.
     * @default false
     */
    inactivateAlert?: boolean;

    /**
     * Always send alias and description even if not changed.
     * Maps to the `-alwaysSendCommon` flag.
     * @default false
     */
    alwaysSendCommon?: boolean;
}

/**
 * Result of a DPL import operation.
 */
export interface DplImportResult {
    /** Whether the import completed successfully (exit code 0). */
    success: boolean;

    /** Process exit code. */
    exitCode: number;

    /** Standard output captured from the WCCOAascii process. */
    stdout: string;

    /** Standard error output captured from the WCCOAascii process. */
    stderr: string;

    /** The input path that was imported. */
    inputPath: string;
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Output format version for ASCII export.
 *
 * - `1` – old human-readable format
 * - `2` – new format with full multilanguage support
 * - `3` – Format 3 (MASS_PARA)
 * - `4` – Format 4 (MASS_PARA)
 */
export type AsciiOutputVersion = 1 | 2 | 3 | 4;

/**
 * Options for a DPL export operation via `WCCOAascii -out`.
 */
export interface DplExportOptions extends AsciiBaseOptions {
    /**
     * Path to the output DPL file.
     * Maps to the `-out` flag.
     */
    outputPath: string;

    /**
     * Filter string controlling which data is exported.
     * A subset of the characters `TDACOPH`:
     * - T – types
     * - D – datapoints
     * - A – aliases and comments
     * - C – CNS views
     * - O – original values
     * - P – parametering (configs)
     * - H – history (modifier to P)
     *
     * Maps to the `-filter` flag.
     */
    filter?: string;

    /**
     * Limit export to these specific datapoint names.
     * May be specified multiple times; maps to repeated `-filterDp` flags.
     */
    filterDp?: string[];

    /**
     * Limit export to these specific datapoint types.
     * May be specified multiple times; maps to repeated `-filterDpType` flags.
     */
    filterDpType?: string[];

    /**
     * Path to a file that specifies which DPs and DPTypes to export.
     * Maps to the `-filterFile` flag.
     */
    filterFile?: string;

    /**
     * Limit export to these CNS views, trees, or subtrees.
     * May be specified multiple times; maps to repeated `-filterCNS` flags.
     */
    filterCns?: string[];

    /**
     * Limit output to data not older than this date/time.
     * Formats: `DD.[MM.[YYYY]][:HH[:MM]]` or `HH[:MM]`.
     * Maps to the `-younger` flag.
     */
    younger?: string;

    /**
     * Output format version.
     * Maps to the `-outputVersion` flag.
     */
    outputVersion?: AsciiOutputVersion;

    /**
     * Comma-separated list of languages to export.
     * Maps to the `-langList` flag.
     */
    langList?: string;

    /**
     * Keep the system name in referenced DPE names.
     * Maps to the `-system` flag.
     * @default false
     */
    keepSystem?: boolean;

    /**
     * Export timestamps of online values.
     * Maps to the `-exportTimestamp` flag.
     * @default false
     */
    exportTimestamp?: boolean;
}

/**
 * Result of a DPL export operation.
 */
export interface DplExportResult {
    /** Whether the export completed successfully (exit code 0). */
    success: boolean;

    /** Process exit code. */
    exitCode: number;

    /** Standard output captured from the WCCOAascii process. */
    stdout: string;

    /** Standard error output captured from the WCCOAascii process. */
    stderr: string;

    /** The output path that was written. */
    outputPath: string;
}
