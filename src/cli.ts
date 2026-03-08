#!/usr/bin/env node

import { AsciiManager } from './manager';
import type { DplImportOptions, DplExportOptions } from './types';

/**
 * CLI exit codes.
 */
const EXIT_OK = 0;
const EXIT_USAGE = 1;
const EXIT_FAILED = 2;

// ── Usage ─────────────────────────────────────────────────────────────────────

function printUsage(): void {
    const bin = 'winccoa-ascii';
    process.stderr.write(
        [
            '',
            `Usage: ${bin} <command> [options]`,
            '',
            'Commands:',
            '  import <file>   Import a DPL file (or wildcard) into a WinCC OA project',
            '  export <file>   Export datapoints from a WinCC OA project to a DPL file',
            '',
            'Run `winccoa-ascii import --help` or `winccoa-ascii export --help` for details.',
            '',
        ].join('\n'),
    );
}

function printImportUsage(): void {
    const bin = 'winccoa-ascii';
    process.stderr.write(
        [
            '',
            `Usage: ${bin} import <file> [options]`,
            '',
            'Arguments:',
            '  <file>                      DPL file path or wildcard (e.g. *.dpl)  [required]',
            '',
            'Options (shared):',
            '  -v, --version <ver>         WinCC OA version (e.g. 3.21)  [required]',
            '  -p, --project <name>        WinCC OA project name  (-proj)',
            '  -c, --config <path>         WinCC OA project config file  (-config)',
            '      --local-time            Use local time instead of GMT',
            '  -u, --user <user[:pass]>    Username and optional password',
            '      --num <N>               Manager number',
            '      --data <host[:port]>    Data server address',
            '      --event <host[:port]>   Event server address',
            '  -t, --timeout <ms>          Process timeout in milliseconds (default: 120000)',
            '      --standalone            Run without Data/Event connection (-n, SQLite only)',
            '  -h, --help                  Show this help message',
            '',
            'Options (import):',
            '      --commit <N>            Commit count (wait for N messages before ACK)',
            '      --types-yes             Change types without confirmation  (-Typesyes)',
            '      --types-no              Do not change types  (-Typesno)',
            '      --cns-yes               Do not change existing CNS nodes  (-CNSyes)',
            '      --cns-no                Same, but suppress warnings  (-CNSno)',
            '      --no-verbose            Suppress progress output (errors only)',
            '      --inactivate-alert      Inactivate AlertValue configs on import',
            '      --always-send-common    Always send alias and description',
            '',
            'Examples:',
            `  ${bin} import data.dpl -v 3.21 -p myProject`,
            `  ${bin} import *.dpl -v 3.21 -c /path/to/config --types-yes --no-verbose`,
            '',
        ].join('\n'),
    );
}

function printExportUsage(): void {
    const bin = 'winccoa-ascii';
    process.stderr.write(
        [
            '',
            `Usage: ${bin} export <file> [options]`,
            '',
            'Arguments:',
            '  <file>                      Output DPL file path  [required]',
            '',
            'Options (shared):',
            '  -v, --version <ver>         WinCC OA version (e.g. 3.21)  [required]',
            '  -p, --project <name>        WinCC OA project name  (-proj)',
            '  -c, --config <path>         WinCC OA project config file  (-config)',
            '      --local-time            Use local time instead of GMT',
            '  -u, --user <user[:pass]>    Username and optional password',
            '      --num <N>               Manager number',
            '      --data <host[:port]>    Data server address',
            '      --event <host[:port]>   Event server address',
            '  -t, --timeout <ms>          Process timeout in milliseconds (default: 120000)',
            '      --standalone            Run without Data/Event connection (-n, SQLite only)',
            '  -h, --help                  Show this help message',
            '',
            'Options (export):',
            '      --filter <TDACOPH>      Export filter (T=types D=DPs A=aliases C=CNS O=orig P=param H=hist)',
            '      --filter-dp <dp>        Limit to DP name (repeatable)',
            '      --filter-dp-type <type> Limit to DP type (repeatable)',
            '      --filter-file <file>    Filter spec file',
            '      --filter-cns <view>     Limit to CNS view/tree (repeatable)',
            '      --younger <date>        Limit to data not older than date (DD.[MM.[YYYY]][:HH[:MM]])',
            '      --output-version <1-4>  Output format: 1=legacy 2=multilang 3=MASS_PARA 4=MASS_PARA',
            '      --lang-list <list>      Comma-separated list of languages to export',
            '      --keep-system           Keep system name in DPE references  (-system)',
            '      --export-timestamp      Export timestamps of online values',
            '',
            'Examples:',
            `  ${bin} export out.dpl -v 3.21 -p myProject --filter DP`,
            `  ${bin} export out.dpl -v 3.21 -c /path/to/config --filter-dp-type MyType`,
            '',
        ].join('\n'),
    );
}

// ── Argument Types ────────────────────────────────────────────────────────────

interface ParsedImportArgs {
    command: 'import';
    filePath: string;
    version: string;
    projectName?: string;
    configPath?: string;
    localTime: boolean;
    user?: string;
    managerNumber?: number;
    dataServer?: string;
    eventServer?: string;
    timeout?: number;
    standalone: boolean;
    commitCount?: number;
    typesAction?: 'yes' | 'no';
    cnsAction?: 'yes' | 'no';
    noVerbose: boolean;
    inactivateAlert: boolean;
    alwaysSendCommon: boolean;
}

interface ParsedExportArgs {
    command: 'export';
    filePath: string;
    version: string;
    projectName?: string;
    configPath?: string;
    localTime: boolean;
    user?: string;
    managerNumber?: number;
    dataServer?: string;
    eventServer?: string;
    timeout?: number;
    standalone: boolean;
    filter?: string;
    filterDp: string[];
    filterDpType: string[];
    filterFile?: string;
    filterCns: string[];
    younger?: string;
    outputVersion?: 1 | 2 | 3 | 4;
    langList?: string;
    keepSystem: boolean;
    exportTimestamp: boolean;
}

export type ParsedArgs = ParsedImportArgs | ParsedExportArgs;

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Minimal argument parser.
 * Returns the parsed CLI options or null when the input is invalid / help is requested.
 */
export function parseArgs(argv: string[]): ParsedArgs | null {
    // Strip node + script path
    const args = argv.slice(2);

    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        return null;
    }

    const command = args[0];
    if (command !== 'import' && command !== 'export') {
        process.stderr.write(
            `Error: Unknown command "${command}". Expected "import" or "export".\n`,
        );
        return null;
    }

    if (!args[1] || args[1] === '-h' || args[1] === '--help') {
        return null;
    }

    const filePath = args[1];
    if (filePath.startsWith('-')) {
        process.stderr.write(`Error: Missing file argument for "${command}".\n`);
        return null;
    }

    // Shared defaults
    let version = '';
    let projectName: string | undefined;
    let configPath: string | undefined;
    let localTime = false;
    let user: string | undefined;
    let managerNumber: number | undefined;
    let dataServer: string | undefined;
    let eventServer: string | undefined;
    let timeout: number | undefined;
    let standalone = false;

    // Import-specific
    let commitCount: number | undefined;
    let typesAction: 'yes' | 'no' | undefined;
    let cnsAction: 'yes' | 'no' | undefined;
    let noVerbose = false;
    let inactivateAlert = false;
    let alwaysSendCommon = false;

    // Export-specific
    let filter: string | undefined;
    const filterDp: string[] = [];
    const filterDpType: string[] = [];
    let filterFile: string | undefined;
    const filterCns: string[] = [];
    let younger: string | undefined;
    let outputVersion: 1 | 2 | 3 | 4 | undefined;
    let langList: string | undefined;
    let keepSystem = false;
    let exportTimestamp = false;

    let i = 2;
    while (i < args.length) {
        const flag = args[i];

        if (flag === '-h' || flag === '--help') {
            return null;
        }

        switch (flag) {
            // ── Shared ──────────────────────────────────────────────────────
            case '-v':
            case '--version':
                version = args[++i] ?? '';
                break;
            case '-p':
            case '--project':
                projectName = args[++i] ?? '';
                break;
            case '-c':
            case '--config':
                configPath = args[++i] ?? '';
                break;
            case '--local-time':
                localTime = true;
                break;
            case '-u':
            case '--user':
                user = args[++i] ?? '';
                break;
            case '--num': {
                const raw = args[++i] ?? '';
                const parsed = Number(raw);
                if (!Number.isInteger(parsed) || parsed < 0) {
                    process.stderr.write(`Error: Invalid manager number "${raw}".\n`);
                    return null;
                }
                managerNumber = parsed;
                break;
            }
            case '--data':
                dataServer = args[++i] ?? '';
                break;
            case '--event':
                eventServer = args[++i] ?? '';
                break;
            case '-t':
            case '--timeout': {
                const raw = args[++i] ?? '';
                const parsed = Number(raw);
                if (isNaN(parsed) || parsed <= 0) {
                    process.stderr.write(`Error: Invalid timeout value "${raw}".\n`);
                    return null;
                }
                timeout = parsed;
                break;
            }

            // ── Import-only ──────────────────────────────────────────────────
            case '--commit': {
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                const raw = args[++i] ?? '';
                const parsed = Number(raw);
                if (!Number.isInteger(parsed) || parsed < 0) {
                    process.stderr.write(`Error: Invalid commit count "${raw}".\n`);
                    return null;
                }
                commitCount = parsed;
                break;
            }
            case '--types-yes':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                if (typesAction === 'no') {
                    process.stderr.write(
                        'Error: --types-yes and --types-no are mutually exclusive.\n',
                    );
                    return null;
                }
                typesAction = 'yes';
                break;
            case '--types-no':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                if (typesAction === 'yes') {
                    process.stderr.write(
                        'Error: --types-yes and --types-no are mutually exclusive.\n',
                    );
                    return null;
                }
                typesAction = 'no';
                break;
            case '--cns-yes':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                if (cnsAction === 'no') {
                    process.stderr.write('Error: --cns-yes and --cns-no are mutually exclusive.\n');
                    return null;
                }
                cnsAction = 'yes';
                break;
            case '--cns-no':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                if (cnsAction === 'yes') {
                    process.stderr.write('Error: --cns-yes and --cns-no are mutually exclusive.\n');
                    return null;
                }
                cnsAction = 'no';
                break;
            case '--no-verbose':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                noVerbose = true;
                break;
            case '--inactivate-alert':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                inactivateAlert = true;
                break;
            case '--always-send-common':
                if (command !== 'import') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                alwaysSendCommon = true;
                break;

            // ── Export-only ──────────────────────────────────────────────────
            case '--filter':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                filter = args[++i] ?? '';
                break;
            case '--filter-dp':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                filterDp.push(args[++i] ?? '');
                break;
            case '--filter-dp-type':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                filterDpType.push(args[++i] ?? '');
                break;
            case '--filter-file':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                filterFile = args[++i] ?? '';
                break;
            case '--filter-cns':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                filterCns.push(args[++i] ?? '');
                break;
            case '--younger':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                younger = args[++i] ?? '';
                break;
            case '--output-version': {
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                const raw = args[++i] ?? '';
                const parsed = Number(raw);
                if (![1, 2, 3, 4].includes(parsed)) {
                    process.stderr.write(
                        `Error: Invalid output version "${raw}". Expected 1, 2, 3, or 4.\n`,
                    );
                    return null;
                }
                outputVersion = parsed as 1 | 2 | 3 | 4;
                break;
            }
            case '--lang-list':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                langList = args[++i] ?? '';
                break;
            case '--keep-system':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                keepSystem = true;
                break;
            case '--export-timestamp':
                if (command !== 'export') {
                    process.stderr.write(`Error: Unknown option "${flag}" for "${command}".\n`);
                    return null;
                }
                exportTimestamp = true;
                break;
            case '--standalone':
                standalone = true;
                break;

            default:
                process.stderr.write(`Error: Unknown option "${flag}".\n`);
                return null;
        }
        i++;
    }

    // Validate shared required fields
    if (!version) {
        process.stderr.write('Error: WinCC OA version is required (-v / --version).\n');
        return null;
    }
    if (!projectName && !configPath) {
        process.stderr.write(
            'Error: A project reference is required: -p / --project <name> or -c / --config <path>.\n',
        );
        return null;
    }

    if (command === 'import') {
        return {
            command,
            filePath,
            version,
            projectName,
            configPath,
            localTime,
            user,
            managerNumber,
            dataServer,
            eventServer,
            timeout,
            standalone,
            commitCount,
            typesAction,
            cnsAction,
            noVerbose,
            inactivateAlert,
            alwaysSendCommon,
        };
    }

    return {
        command,
        filePath,
        version,
        projectName,
        configPath,
        localTime,
        user,
        managerNumber,
        dataServer,
        eventServer,
        timeout,
        standalone,
        filter,
        filterDp,
        filterDpType,
        filterFile,
        filterCns,
        younger,
        outputVersion,
        langList,
        keepSystem,
        exportTimestamp,
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Main CLI entry point.
 */
export async function main(): Promise<void> {
    const args = process.argv.slice(2);

    // Top-level help
    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        printUsage();
        process.exitCode = EXIT_USAGE;
        return;
    }

    // Sub-command help
    if (args[0] === 'import' && (!args[1] || args[1] === '-h' || args[1] === '--help')) {
        printImportUsage();
        process.exitCode = EXIT_USAGE;
        return;
    }
    if (args[0] === 'export' && (!args[1] || args[1] === '-h' || args[1] === '--help')) {
        printExportUsage();
        process.exitCode = EXIT_USAGE;
        return;
    }

    const parsed = parseArgs(process.argv);

    if (!parsed) {
        if (args[0] === 'import') {
            printImportUsage();
        } else if (args[0] === 'export') {
            printExportUsage();
        } else {
            printUsage();
        }
        process.exitCode = EXIT_USAGE;
        return;
    }

    const manager = new AsciiManager();

    try {
        if (parsed.command === 'import') {
            process.stderr.write(`Importing: ${parsed.filePath}\n`);

            const options: DplImportOptions = {
                version: parsed.version,
                inputPath: parsed.filePath,
                projectName: parsed.projectName,
                configPath: parsed.configPath,
                localTime: parsed.localTime || undefined,
                user: parsed.user,
                managerNumber: parsed.managerNumber,
                dataServer: parsed.dataServer,
                eventServer: parsed.eventServer,
                timeout: parsed.timeout,
                standalone: parsed.standalone || undefined,
                commitCount: parsed.commitCount,
                typesAction: parsed.typesAction,
                cnsAction: parsed.cnsAction,
                noVerbose: parsed.noVerbose || undefined,
                inactivateAlert: parsed.inactivateAlert || undefined,
                alwaysSendCommon: parsed.alwaysSendCommon || undefined,
            };

            const result = await manager.import(options);

            if (result.stdout) process.stdout.write(result.stdout);
            if (result.stderr) process.stderr.write(result.stderr);

            if (result.success) {
                process.stderr.write('Import completed successfully.\n');
                process.exitCode = EXIT_OK;
            } else {
                process.stderr.write(`Import failed with exit code ${result.exitCode}.\n`);
                process.exitCode = EXIT_FAILED;
            }
        } else {
            process.stderr.write(`Exporting to: ${parsed.filePath}\n`);

            const options: DplExportOptions = {
                version: parsed.version,
                outputPath: parsed.filePath,
                projectName: parsed.projectName,
                configPath: parsed.configPath,
                localTime: parsed.localTime || undefined,
                user: parsed.user,
                managerNumber: parsed.managerNumber,
                dataServer: parsed.dataServer,
                eventServer: parsed.eventServer,
                timeout: parsed.timeout,
                standalone: parsed.standalone || undefined,
                filter: parsed.filter,
                filterDp: parsed.filterDp.length > 0 ? parsed.filterDp : undefined,
                filterDpType: parsed.filterDpType.length > 0 ? parsed.filterDpType : undefined,
                filterFile: parsed.filterFile,
                filterCns: parsed.filterCns.length > 0 ? parsed.filterCns : undefined,
                younger: parsed.younger,
                outputVersion: parsed.outputVersion,
                langList: parsed.langList,
                keepSystem: parsed.keepSystem || undefined,
                exportTimestamp: parsed.exportTimestamp || undefined,
            };

            const result = await manager.export(options);

            if (result.stdout) process.stdout.write(result.stdout);
            if (result.stderr) process.stderr.write(result.stderr);

            if (result.success) {
                process.stderr.write('Export completed successfully.\n');
                process.exitCode = EXIT_OK;
            } else {
                process.stderr.write(`Export failed with exit code ${result.exitCode}.\n`);
                process.exitCode = EXIT_FAILED;
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = EXIT_FAILED;
    }
}

// Auto-run only when invoked directly (not when imported for testing)
const isDirectRun =
    process.argv[1] &&
    (process.argv[1].endsWith('cli.js') ||
        process.argv[1].endsWith('cli.ts') ||
        process.argv[1].endsWith('cli.cjs') ||
        process.argv[1].endsWith('cli.mjs'));

if (isDirectRun) {
    main();
}

// Export for testing
export { printUsage, printImportUsage, printExportUsage };
