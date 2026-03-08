import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli';

/**
 * Helper – builds a fake process.argv array from the given CLI tokens.
 * Prepends 'node' and 'cli.js' to mimic real argv.
 */
function argv(...tokens: string[]): string[] {
    return ['node', 'cli.js', ...tokens];
}

// ── import subcommand ─────────────────────────────────────────────────────────

describe('CLI parseArgs – import', () => {
    describe('valid invocations', () => {
        it('should parse import with --project', () => {
            const result = parseArgs(argv('import', 'data.dpl', '-v', '3.21', '-p', 'myProject'));
            assert.ok(result);
            assert.equal(result.command, 'import');
            assert.equal(result.filePath, 'data.dpl');
            assert.equal(result.version, '3.21');
            assert.equal(result.projectName, 'myProject');
            assert.equal(result.configPath, undefined);
        });

        it('should parse import with --config', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-c', '/path/to/config'),
            );
            assert.ok(result);
            assert.equal(result.command, 'import');
            assert.equal(result.configPath, '/path/to/config');
            assert.equal(result.projectName, undefined);
        });

        it('should accept long form --version and --project', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '--version', '3.21', '--project', 'proj'),
            );
            assert.ok(result);
            assert.equal(result.version, '3.21');
            assert.equal(result.projectName, 'proj');
        });

        it('should parse wildcard input path', () => {
            const result = parseArgs(argv('import', '*.dpl', '-v', '3.21', '-p', 'proj'));
            assert.ok(result);
            assert.equal(result.filePath, '*.dpl');
        });

        it('should parse --commit flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--commit', '100'),
            );
            assert.ok(result);
            assert.equal(result.command, 'import');
            if (result.command === 'import') assert.equal(result.commitCount, 100);
        });

        it('should parse --types-yes flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--types-yes'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.typesAction, 'yes');
        });

        it('should parse --types-no flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--types-no'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.typesAction, 'no');
        });

        it('should parse --cns-yes flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--cns-yes'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.cnsAction, 'yes');
        });

        it('should parse --cns-no flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--cns-no'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.cnsAction, 'no');
        });

        it('should parse --no-verbose flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--no-verbose'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.noVerbose, true);
        });

        it('should parse --inactivate-alert flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--inactivate-alert'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.inactivateAlert, true);
        });

        it('should parse --always-send-common flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--always-send-common'),
            );
            assert.ok(result);
            if (result.command === 'import') assert.equal(result.alwaysSendCommon, true);
        });

        it('should parse shared --local-time flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--local-time'),
            );
            assert.ok(result);
            assert.equal(result.localTime, true);
        });

        it('should parse shared --user flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '-u', 'admin:secret'),
            );
            assert.ok(result);
            assert.equal(result.user, 'admin:secret');
        });

        it('should parse shared --num flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--num', '5'),
            );
            assert.ok(result);
            assert.equal(result.managerNumber, 5);
        });

        it('should parse shared --data and --event flags', () => {
            const result = parseArgs(
                argv(
                    'import',
                    'data.dpl',
                    '-v',
                    '3.21',
                    '-p',
                    'proj',
                    '--data',
                    'host:4897',
                    '--event',
                    'host:4998',
                ),
            );
            assert.ok(result);
            assert.equal(result.dataServer, 'host:4897');
            assert.equal(result.eventServer, 'host:4998');
        });

        it('should parse shared --timeout flag', () => {
            const result = parseArgs(
                argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '-t', '60000'),
            );
            assert.ok(result);
            assert.equal(result.timeout, 60000);
        });

        it('should parse all import flags together', () => {
            const result = parseArgs(
                argv(
                    'import',
                    'data.dpl',
                    '-v',
                    '3.21',
                    '-c',
                    '/cfg',
                    '--commit',
                    '50',
                    '--types-yes',
                    '--cns-no',
                    '--no-verbose',
                    '--inactivate-alert',
                    '--always-send-common',
                    '--local-time',
                    '-u',
                    'user',
                    '-t',
                    '180000',
                ),
            );
            assert.ok(result);
            assert.equal(result.command, 'import');
            assert.equal(result.configPath, '/cfg');
            if (result.command === 'import') {
                assert.equal(result.commitCount, 50);
                assert.equal(result.typesAction, 'yes');
                assert.equal(result.cnsAction, 'no');
                assert.equal(result.noVerbose, true);
                assert.equal(result.inactivateAlert, true);
                assert.equal(result.alwaysSendCommon, true);
            }
            assert.equal(result.localTime, true);
            assert.equal(result.user, 'user');
            assert.equal(result.timeout, 180000);
        });
    });

    describe('invalid invocations', () => {
        it('should return null for empty args', () => {
            assert.equal(parseArgs(argv()), null);
        });

        it('should return null for -h', () => {
            assert.equal(parseArgs(argv('-h')), null);
        });

        it('should return null for --help', () => {
            assert.equal(parseArgs(argv('--help')), null);
        });

        it('should return null for unknown command', () => {
            assert.equal(parseArgs(argv('run', 'data.dpl', '-v', '3.21', '-p', 'proj')), null);
        });

        it('should return null when file argument is missing', () => {
            assert.equal(parseArgs(argv('import', '-v', '3.21', '-p', 'proj')), null);
        });

        it('should return null when version is missing', () => {
            assert.equal(parseArgs(argv('import', 'data.dpl', '-p', 'proj')), null);
        });

        it('should return null when both project and config are missing', () => {
            assert.equal(parseArgs(argv('import', 'data.dpl', '-v', '3.21')), null);
        });

        it('should return null for invalid timeout', () => {
            assert.equal(
                parseArgs(argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '-t', 'abc')),
                null,
            );
        });

        it('should return null for negative timeout', () => {
            assert.equal(
                parseArgs(argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '-t', '-100')),
                null,
            );
        });

        it('should return null for --types-yes and --types-no together', () => {
            assert.equal(
                parseArgs(
                    argv(
                        'import',
                        'data.dpl',
                        '-v',
                        '3.21',
                        '-p',
                        'proj',
                        '--types-yes',
                        '--types-no',
                    ),
                ),
                null,
            );
        });

        it('should return null for --cns-yes and --cns-no together', () => {
            assert.equal(
                parseArgs(
                    argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--cns-yes', '--cns-no'),
                ),
                null,
            );
        });

        it('should return null for export-only flag used in import', () => {
            assert.equal(
                parseArgs(
                    argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--filter', 'DP'),
                ),
                null,
            );
        });

        it('should return null for unknown option', () => {
            assert.equal(
                parseArgs(argv('import', 'data.dpl', '-v', '3.21', '-p', 'proj', '--foo')),
                null,
            );
        });

        it('should return null for import --help', () => {
            assert.equal(parseArgs(argv('import', '--help')), null);
        });
    });
});

// ── export subcommand ─────────────────────────────────────────────────────────

describe('CLI parseArgs – export', () => {
    describe('valid invocations', () => {
        it('should parse export with --project', () => {
            const result = parseArgs(argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj'));
            assert.ok(result);
            assert.equal(result.command, 'export');
            assert.equal(result.filePath, 'out.dpl');
            assert.equal(result.version, '3.21');
            assert.equal(result.projectName, 'proj');
        });

        it('should parse export with --config', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-c', '/path/to/config'),
            );
            assert.ok(result);
            assert.equal(result.command, 'export');
            assert.equal(result.configPath, '/path/to/config');
        });

        it('should parse --filter flag', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--filter', 'DP'),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.filter, 'DP');
        });

        it('should parse --filter-dp (repeatable)', () => {
            const result = parseArgs(
                argv(
                    'export',
                    'out.dpl',
                    '-v',
                    '3.21',
                    '-p',
                    'proj',
                    '--filter-dp',
                    'System1:Dp1',
                    '--filter-dp',
                    'System1:Dp2',
                ),
            );
            assert.ok(result);
            if (result.command === 'export') {
                assert.deepEqual(result.filterDp, ['System1:Dp1', 'System1:Dp2']);
            }
        });

        it('should parse --filter-dp-type (repeatable)', () => {
            const result = parseArgs(
                argv(
                    'export',
                    'out.dpl',
                    '-v',
                    '3.21',
                    '-p',
                    'proj',
                    '--filter-dp-type',
                    'TypeA',
                    '--filter-dp-type',
                    'TypeB',
                ),
            );
            assert.ok(result);
            if (result.command === 'export') {
                assert.deepEqual(result.filterDpType, ['TypeA', 'TypeB']);
            }
        });

        it('should parse --filter-file flag', () => {
            const result = parseArgs(
                argv(
                    'export',
                    'out.dpl',
                    '-v',
                    '3.21',
                    '-p',
                    'proj',
                    '--filter-file',
                    '/path/filter.txt',
                ),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.filterFile, '/path/filter.txt');
        });

        it('should parse --filter-cns (repeatable)', () => {
            const result = parseArgs(
                argv(
                    'export',
                    'out.dpl',
                    '-v',
                    '3.21',
                    '-p',
                    'proj',
                    '--filter-cns',
                    'view1',
                    '--filter-cns',
                    'view2',
                ),
            );
            assert.ok(result);
            if (result.command === 'export') {
                assert.deepEqual(result.filterCns, ['view1', 'view2']);
            }
        });

        it('should parse --younger flag', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--younger', '01.01.2024'),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.younger, '01.01.2024');
        });

        it('should parse --output-version flag', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--output-version', '2'),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.outputVersion, 2);
        });

        it('should parse --lang-list flag', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--lang-list', 'de,en'),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.langList, 'de,en');
        });

        it('should parse --keep-system flag', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--keep-system'),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.keepSystem, true);
        });

        it('should parse --export-timestamp flag', () => {
            const result = parseArgs(
                argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--export-timestamp'),
            );
            assert.ok(result);
            if (result.command === 'export') assert.equal(result.exportTimestamp, true);
        });

        it('should parse all export flags together', () => {
            const result = parseArgs(
                argv(
                    'export',
                    'out.dpl',
                    '-v',
                    '3.21',
                    '-c',
                    '/cfg',
                    '--filter',
                    'DP',
                    '--filter-dp',
                    'Dp1',
                    '--filter-dp-type',
                    'TypeA',
                    '--filter-cns',
                    'view1',
                    '--younger',
                    '01.01.2024',
                    '--output-version',
                    '2',
                    '--lang-list',
                    'de,en',
                    '--keep-system',
                    '--export-timestamp',
                    '--local-time',
                    '-t',
                    '300000',
                ),
            );
            assert.ok(result);
            assert.equal(result.command, 'export');
            if (result.command === 'export') {
                assert.equal(result.filter, 'DP');
                assert.deepEqual(result.filterDp, ['Dp1']);
                assert.deepEqual(result.filterDpType, ['TypeA']);
                assert.deepEqual(result.filterCns, ['view1']);
                assert.equal(result.younger, '01.01.2024');
                assert.equal(result.outputVersion, 2);
                assert.equal(result.langList, 'de,en');
                assert.equal(result.keepSystem, true);
                assert.equal(result.exportTimestamp, true);
            }
            assert.equal(result.localTime, true);
            assert.equal(result.timeout, 300000);
        });
    });

    describe('invalid invocations', () => {
        it('should return null when version is missing', () => {
            assert.equal(parseArgs(argv('export', 'out.dpl', '-p', 'proj')), null);
        });

        it('should return null when project and config are both missing', () => {
            assert.equal(parseArgs(argv('export', 'out.dpl', '-v', '3.21')), null);
        });

        it('should return null for invalid output-version', () => {
            assert.equal(
                parseArgs(
                    argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--output-version', '5'),
                ),
                null,
            );
        });

        it('should return null for import-only flag used in export', () => {
            assert.equal(
                parseArgs(
                    argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--types-yes'),
                ),
                null,
            );
        });

        it('should return null for unknown option', () => {
            assert.equal(
                parseArgs(argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '--bad-flag')),
                null,
            );
        });

        it('should return null for export --help', () => {
            assert.equal(parseArgs(argv('export', '--help')), null);
        });

        it('should return null for invalid timeout', () => {
            assert.equal(
                parseArgs(
                    argv('export', 'out.dpl', '-v', '3.21', '-p', 'proj', '-t', 'not-a-number'),
                ),
                null,
            );
        });
    });
});
