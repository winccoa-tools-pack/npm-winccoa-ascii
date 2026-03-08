import { AsciiManagerComponent } from '@winccoa-tools-pack/npm-winccoa-core/types/components/implementations/AsciiManagerComponent';
import type {
    AsciiBaseOptions,
    DplImportOptions,
    DplImportResult,
    DplExportOptions,
    DplExportResult,
} from './types';

/**
 * Default timeout for WCCOAascii processes (2 minutes).
 * DPL imports can be slow depending on dataset size.
 */
const DEFAULT_TIMEOUT = 120_000;

/**
 * Corrected component class: the core package's `AsciiManagerComponent`
 * returns `'WCCOAsciiMgr'` from `getName()`, but the actual binaries shipped
 * with WinCC OA 3.x are named `WCCOAascii` (RAIMA) and `WCCOAasciiSQLite`
 * (SQLite). We default to the SQLite variant which is used by most modern
 * projects. Override `getExecutableName()` so that `getPath()` resolves the
 * correct file.
 */
class WCCOAasciiComponent extends AsciiManagerComponent {
    override getExecutableName(): string {
        return 'WCCOAasciiSQLite';
    }
}

/**
 * Wrapper around the WinCC OA ASCII Manager (`WCCOAascii`) for DPL import
 * and export operations.
 *
 * @example
 * ```ts
 * const manager = new AsciiManager();
 *
 * // Import a DPL file
 * const importResult = await manager.import({
 *     version: '3.21',
 *     configPath: '/path/to/project/config/config',
 *     inputPath: '/path/to/data.dpl',
 *     typesAction: 'yes',
 * });
 *
 * // Export datapoints to a DPL file
 * const exportResult = await manager.export({
 *     version: '3.21',
 *     configPath: '/path/to/project/config/config',
 *     outputPath: '/path/to/out.dpl',
 *     filter: 'DP',
 * });
 * ```
 */
export class AsciiManager {
    private ascii: WCCOAasciiComponent;

    constructor() {
        this.ascii = new WCCOAasciiComponent();
    }

    /**
     * Returns `true` when the `WCCOAasciiSQLite` executable exists for the given version.
     *
     * @param version - WinCC OA version string (e.g., '3.21')
     */
    exists(version: string): boolean {
        try {
            this.ascii.setVersion(version);
            return this.ascii.exists();
        } catch {
            return false;
        }
    }

    /**
     * Build args shared by both import and export operations.
     */
    private buildBaseArgs(options: AsciiBaseOptions): string[] {
        const args: string[] = [];

        // Project reference — config takes precedence over proj name
        if (options.configPath) {
            args.push('-config', options.configPath);
        } else if (options.projectName) {
            args.push('-proj', options.projectName);
        }

        // Enable log output to stderr so it is captured by the child process
        args.push('-log', '+stderr');

        if (options.localTime) {
            args.push('-localTime');
        }
        if (options.user) {
            args.push('-user', options.user);
        }
        if (options.managerNumber !== undefined) {
            args.push('-num', String(options.managerNumber));
        }
        if (options.dataServer) {
            args.push('-data', options.dataServer);
        }
        if (options.eventServer) {
            args.push('-event', options.eventServer);
        }
        if (options.standalone) {
            args.push('-n');
        }

        return args;
    }

    /**
     * Build the full argument list for a DPL import operation.
     */
    private buildImportArgs(options: DplImportOptions): string[] {
        const args: string[] = [];

        args.push('-in', options.inputPath);
        args.push(...this.buildBaseArgs(options));

        if (options.commitCount !== undefined) {
            args.push('-commit', String(options.commitCount));
        }
        if (options.typesAction === 'yes') {
            args.push('-Typesyes');
        } else if (options.typesAction === 'no') {
            args.push('-Typesno');
        }
        if (options.cnsAction === 'yes') {
            args.push('-CNSyes');
        } else if (options.cnsAction === 'no') {
            args.push('-CNSno');
        }
        if (options.noVerbose) {
            args.push('-noVerbose');
        }
        if (options.inactivateAlert) {
            args.push('-inactivateAlert');
        }
        if (options.alwaysSendCommon) {
            args.push('-alwaysSendCommon');
        }

        return args;
    }

    /**
     * Build the full argument list for a DPL export operation.
     */
    private buildExportArgs(options: DplExportOptions): string[] {
        const args: string[] = [];

        args.push(...this.buildBaseArgs(options));
        args.push('-out', options.outputPath);

        if (options.filter) {
            args.push('-filter', options.filter);
        }
        if (options.filterDp) {
            for (const dp of options.filterDp) {
                args.push('-filterDp', dp);
            }
        }
        if (options.filterDpType) {
            for (const dpType of options.filterDpType) {
                args.push('-filterDpType', dpType);
            }
        }
        if (options.filterFile) {
            args.push('-filterFile', options.filterFile);
        }
        if (options.filterCns) {
            for (const cns of options.filterCns) {
                args.push('-filterCNS', cns);
            }
        }
        if (options.younger) {
            args.push('-younger', options.younger);
        }
        if (options.outputVersion !== undefined) {
            args.push('-outputVersion', String(options.outputVersion));
        }
        if (options.langList) {
            args.push('-langList', options.langList);
        }
        if (options.keepSystem) {
            args.push('-system');
        }
        if (options.exportTimestamp) {
            args.push('-exportTimestamp');
        }

        return args;
    }

    /**
     * Import a DPL file (or wildcard pattern) into a WinCC OA project.
     *
     * @param options - Import options (version, inputPath, project reference, etc.)
     * @returns Import result including exit code and captured output
     *
     * @example
     * ```ts
     * const result = await manager.import({
     *     version: '3.21',
     *     configPath: '/path/to/project/config/config',
     *     inputPath: '/path/to/data.dpl',
     *     typesAction: 'yes',
     *     noVerbose: true,
     * });
     * console.log(result.success); // true
     * ```
     */
    async import(options: DplImportOptions): Promise<DplImportResult> {
        const timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.ascii.setVersion(options.version);

        const args = this.buildImportArgs(options);
        const exitCode = await this.ascii.start(args, { timeout });

        return {
            success: exitCode === 0,
            exitCode,
            stdout: this.ascii.stdOut,
            stderr: this.ascii.stdErr,
            inputPath: options.inputPath,
        };
    }

    /**
     * Export datapoints from a WinCC OA project to a DPL file.
     *
     * @param options - Export options (version, outputPath, project reference, filters, etc.)
     * @returns Export result including exit code and captured output
     *
     * @example
     * ```ts
     * const result = await manager.export({
     *     version: '3.21',
     *     configPath: '/path/to/project/config/config',
     *     outputPath: '/path/to/out.dpl',
     *     filter: 'DP',
     *     filterDpType: ['ExampleDpType'],
     * });
     * console.log(result.success); // true
     * ```
     */
    async export(options: DplExportOptions): Promise<DplExportResult> {
        const timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.ascii.setVersion(options.version);

        const args = this.buildExportArgs(options);
        const exitCode = await this.ascii.start(args, { timeout });

        return {
            success: exitCode === 0,
            exitCode,
            stdout: this.ascii.stdOut,
            stderr: this.ascii.stdErr,
            outputPath: options.outputPath,
        };
    }
}
