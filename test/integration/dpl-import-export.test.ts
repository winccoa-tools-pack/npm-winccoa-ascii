import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import { importDpl, exportDpl } from '../../src/api.js';
import {
    setupIntegProject,
    MGR_NUM_IMPORT,
    MGR_NUM_EXPORT,
    type IntegProjectHandle,
} from '../helpers/ascii-integ-project.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Fixture DPL with AsciiIntegTest DPType + 2 DPs */
const FIXTURE_DPL = path.resolve(__dirname, '..', 'fixtures', 'dpl', 'integ-test-type.dpl');

describe('AsciiManager – DPL import/export integration', { concurrency: false }, () => {
    let handle: IntegProjectHandle | undefined;
    let skipReason: string | undefined;

    before(async () => {
        const result = await setupIntegProject();
        handle = result.handle;
        skipReason = result.skipReason;
    });

    after(async () => {
        await handle?.cleanup();
        handle = undefined;
    });

    // ── Export tests ────────────────────────────────────────────────────────

    it('exports system DPs without error', async (t) => {
        if (!handle) { t.skip(skipReason ?? 'fixture project not available'); return; }

        const outPath = path.join(handle.projectDir, 'log', 'export-system.dpl');
        const result = await exportDpl({
            version: handle.version,
            projectName: handle.projectName,
            outputPath: outPath,
            filter: 'D',
            managerNumber: MGR_NUM_EXPORT,
        });

        assert.equal(result.exitCode, 0, `export failed:\n${result.stderr}`);
        assert.ok(fs.existsSync(outPath), 'output DPL file was not created');
        const content = fs.readFileSync(outPath, 'utf-8');
        assert.match(content, /DpName\s+TypeName/, 'DPL header missing');
    });

    // ── Import tests ────────────────────────────────────────────────────────

    it('imports DPL fixture and creates AsciiIntegTest DPType', async (t) => {
        if (!handle) { t.skip(skipReason ?? 'fixture project not available'); return; }

        const result = await importDpl({
            version: handle.version,
            projectName: handle.projectName,
            inputPath: FIXTURE_DPL,
            typesAction: 'yes',
            managerNumber: MGR_NUM_IMPORT,
        });

        // WCCOAasciiSQLite may return exit code 55 or 56 (warning codes) – treat as success
        assert.ok(
            result.exitCode === 0 || result.exitCode === 55 || result.exitCode === 56,
            `import failed (exit ${result.exitCode}):\n${result.stderr}`,
        );
    });

    it('exports by DPType and finds all imported DPs', async (t) => {
        if (!handle) { t.skip(skipReason ?? 'fixture project not available'); return; }

        const outPath = path.join(handle.projectDir, 'log', 'export-integ-type.dpl');
        const result = await exportDpl({
            version: handle.version,
            projectName: handle.projectName,
            outputPath: outPath,
            filterDpType: ['AsciiIntegTest'],
            managerNumber: MGR_NUM_EXPORT,
        });

        assert.equal(result.exitCode, 0, `export failed:\n${result.stderr}`);
        assert.ok(fs.existsSync(outPath), 'output DPL file was not created');

        const content = fs.readFileSync(outPath, 'utf-8');
        assert.match(content, /AsciiIntegTest/, 'DPType name missing from export');
        assert.match(content, /IntegTestDp1/, 'IntegTestDp1 missing from export');
        assert.match(content, /IntegTestDp2/, 'IntegTestDp2 missing from export');
    });

    it('import is idempotent on second run', async (t) => {
        if (!handle) { t.skip(skipReason ?? 'fixture project not available'); return; }

        const result = await importDpl({
            version: handle.version,
            projectName: handle.projectName,
            inputPath: FIXTURE_DPL,
            typesAction: 'yes',
            managerNumber: MGR_NUM_IMPORT,
        });

        assert.ok(
            result.exitCode === 0 || result.exitCode === 55 || result.exitCode === 56,
            `second import failed (exit ${result.exitCode}):\n${result.stderr}`,
        );
    });

    // ── CLI end-to-end tests ────────────────────────────────────────────────

    it('CLI end-to-end: export via spawned process', (t) => {
        if (!handle) { t.skip(skipReason ?? 'fixture project not available'); return; }

        const repoRoot = path.resolve(__dirname, '..', '..');
        const cliPath = path.join(repoRoot, 'dist', 'cjs', 'cli.js');
        if (!fs.existsSync(cliPath)) { t.skip('dist not built – run npm run build first'); return; }

        const outPath = path.join(handle.projectDir, 'log', 'export-cli-e2e.dpl');
        const result = spawnSync(
            process.execPath,
            [
                cliPath, 'export', outPath,
                '-v', handle.version,
                '-p', handle.projectName,
                '--num', String(MGR_NUM_EXPORT),
                '--filter', 'D',
            ],
            { encoding: 'utf-8', timeout: 30_000 },
        );

        assert.equal(
            result.status, 0,
            `CLI export failed (exit ${result.status}):\n${result.stderr}`,
        );
        assert.ok(fs.existsSync(outPath), 'CLI output file not created');
    });

    it('CLI end-to-end: import via spawned process', (t) => {
        if (!handle) { t.skip(skipReason ?? 'fixture project not available'); return; }

        const repoRoot = path.resolve(__dirname, '..', '..');
        const cliPath = path.join(repoRoot, 'dist', 'cjs', 'cli.js');
        if (!fs.existsSync(cliPath)) { t.skip('dist not built – run npm run build first'); return; }

        const result = spawnSync(
            process.execPath,
            [
                cliPath, 'import', FIXTURE_DPL,
                '-v', handle.version,
                '-p', handle.projectName,
                '--num', String(MGR_NUM_IMPORT),
                '--types-yes',
            ],
            { encoding: 'utf-8', timeout: 30_000 },
        );

        // exit 0 = clean import; exit 2 = CLI wraps ASCII warning code 55 or 56 as failure
        const succeeded =
            result.status === 0 ||
            (result.status === 2 && /exit code (55|56)/.test(result.stderr ?? ''));

        assert.ok(
            succeeded,
            `CLI import failed (exit ${result.status}):\n${result.stderr}`,
        );
    });
});
