import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { ProjEnvProject } from '@winccoa-tools-pack/npm-winccoa-core';
import { getWinCCOAInstallationPathByVersion, getAvailableWinCCOAVersions } from '@winccoa-tools-pack/npm-winccoa-core';
import { AsciiManager } from '../../src/manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Name used to register the fixture project in pvssInst.conf */
export const INTEG_PROJECT_NAME = 'ascii-integ-test';

/** Absolute path to the committed fixture project directory */
export const FIXTURE_PROJECT_DIR = path.resolve(
    __dirname, '..', 'fixtures', 'projects', 'ascii-integ-test',
);

/** SQLite DB directory */
const SQLITE_DIR = path.join(FIXTURE_PROJECT_DIR, 'db', 'wincc_oa', 'sqlite');

/** Manager numbers reserved for integration tests (high range, no conflict) */
export const MGR_NUM_PROBE = 95;
export const MGR_NUM_IMPORT = 96;
export const MGR_NUM_EXPORT = 97;

const MANAGER_READINESS_TIMEOUT_MS = 90_000;
const MANAGER_READINESS_POLL_MS = 3_000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns the first available WinCC OA version, or undefined. */
export function getTestVersion(): string | undefined {
    try {
        const versions = getAvailableWinCCOAVersions();
        return versions.length > 0 ? versions[0] : undefined;
    } catch {
        return undefined;
    }
}

/** Check if WCCOAasciiSQLite binary exists for a given version. */
export function isAsciiAvailable(version: string): boolean {
    try {
        const manager = new AsciiManager();
        return manager.exists(version);
    } catch {
        return false;
    }
}

/**
 * Snapshot the committed `.sqlite` files so we can restore them after tests,
 * leaving the fixture project in a clean state for the next run.
 */
function snapshotDb(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ascii-integ-db-'));
    for (const f of fs.readdirSync(SQLITE_DIR)) {
        if (f.endsWith('.sqlite')) {
            fs.copyFileSync(path.join(SQLITE_DIR, f), path.join(tmpDir, f));
        }
    }
    return tmpDir;
}

/** Restore sqlite files from snapshot and remove the tmp directory. */
function restoreDb(tmpDir: string): void {
    // Remove WAL/SHM files that may have been left by managers
    for (const f of fs.readdirSync(SQLITE_DIR)) {
        if (f.endsWith('.sqlite-shm') || f.endsWith('.sqlite-wal')) {
            try { fs.unlinkSync(path.join(SQLITE_DIR, f)); } catch { /* ignore */ }
        }
    }
    for (const f of fs.readdirSync(tmpDir)) {
        fs.copyFileSync(path.join(tmpDir, f), path.join(SQLITE_DIR, f));
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Substitute `<WinCC_OA_PATH>`, `<PROJECT_PATH>`, and `<WinCC_OA_VERSION>`
 * tokens in `config/config` with the real runtime values.
 */
function patchConfig(version: string): boolean {
    const installPath = getWinCCOAInstallationPathByVersion(version);
    if (!installPath) return false;

    const configFile = path.join(FIXTURE_PROJECT_DIR, 'config', 'config');
    let content = fs.readFileSync(configFile, 'utf-8');

    // Idempotent: already patched
    if (!content.includes('<WinCC_OA_PATH>')) return true;

    content = content.replace('<WinCC_OA_PATH>', installPath.replace(/\\/g, '/'));
    content = content.replace('<PROJECT_PATH>', FIXTURE_PROJECT_DIR.replace(/\\/g, '/'));
    content = content.replace('<WinCC_OA_VERSION>', version);
    fs.writeFileSync(configFile, content, 'utf-8');
    return true;
}

/** Inverse of patchConfig – restore tokens so the file stays clean in git. */
function unpatchConfig(version: string): void {
    const installPath = getWinCCOAInstallationPathByVersion(version);
    if (!installPath) return;

    const configFile = path.join(FIXTURE_PROJECT_DIR, 'config', 'config');
    let content = fs.readFileSync(configFile, 'utf-8');

    // Idempotent: already has tokens
    if (content.includes('<WinCC_OA_PATH>')) return;

    content = content.replace(installPath.replace(/\\/g, '/'), '<WinCC_OA_PATH>');
    content = content.replace(FIXTURE_PROJECT_DIR.replace(/\\/g, '/'), '<PROJECT_PATH>');
    content = content.replace(version, '<WinCC_OA_VERSION>');
    fs.writeFileSync(configFile, content, 'utf-8');
}

/**
 * Spawn `WCCILpmon -proj <name>` in detached mode (without `-noAutostart`), so
 * pmon reads `progs` and auto-starts all `(always)` managers (Data + Event).
 * Returns the pmon PID (used for cleanup).
 */
async function spawnPmon(version: string): Promise<number | undefined> {
    const installPath = getWinCCOAInstallationPathByVersion(version);
    if (!installPath) return undefined;

    const bin = path.join(installPath, 'bin', 'WCCILpmon');
    const child = spawn(bin, ['-proj', INTEG_PROJECT_NAME], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
    return child.pid;
}

/**
 * Poll until WCCOAasciiSQLite can successfully export a single system DP.
 * This proves the Data Manager is up and accepting connections.
 */
async function waitForManagers(
    version: string,
    timeoutMs = MANAGER_READINESS_TIMEOUT_MS,
): Promise<boolean> {
    const manager = new AsciiManager();
    const probeOut = path.join(os.tmpdir(), `ascii-integ-probe-${Date.now()}.dpl`);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const result = await manager.export({
                version,
                projectName: INTEG_PROJECT_NAME,
                outputPath: probeOut,
                filter: 'D',
                filterDp: ['_System'],
                managerNumber: MGR_NUM_PROBE,
                timeout: 10_000,
            });
            if (result.success) {
                try { fs.unlinkSync(probeOut); } catch { /* ignore */ }
                return true;
            }
        } catch { /* retry */ }
        await sleep(MANAGER_READINESS_POLL_MS);
    }
    return false;
}

export interface IntegProjectHandle {
    version: string;
    projectName: string;
    projectDir: string;
    /** Absolute path to `config/config` — can be passed as `configPath` to CLI tests. */
    configPath: string;
    cleanup: () => Promise<void>;
}

/**
 * Returned by {@link setupIntegProject}.
 * Check `skipReason` first — if set, call `t.skip(result.skipReason)` in each `it()`.
 */
export interface SetupResult {
    handle?: IntegProjectHandle;
    /** Populated when environment is unsuitable and tests should be skipped. */
    skipReason?: string;
}

/**
 * Set up the `ascii-integ-test` fixture project for integration testing.
 *
 * Steps:
 * 1. Patch `config/config` with real install + project paths
 * 2. Register the project in pvssInst.conf (required for WCCOAasciiSQLite to find it)
 * 3. Spawn pmon **without** `-noAutostart` so it auto-starts Data + Event managers
 * 4. Poll until the Data Manager accepts connections (probe export)
 * 5. Snapshot the SQLite DB (restored on cleanup for idempotent test runs)
 *
 * **Does NOT accept a TestContext** — `before()` in node:test's `describe` provides a
 * `SuiteContext` which lacks `skip()`. Instead, use the returned `skipReason`:
 *
 * ```ts
 * before(async () => { result = await setupIntegProject(); });
 * it('…', (t) => { if (result.skipReason) { t.skip(result.skipReason); return; } … });
 * ```
 */
export async function setupIntegProject(): Promise<SetupResult> {
    const version = getTestVersion();
    if (!version) {
        return { skipReason: 'No WinCC OA installation found – skipping integration tests' };
    }
    if (!isAsciiAvailable(version)) {
        return { skipReason: `WCCOAasciiSQLite not found for version ${version} – skipping` };
    }

    // Patch config FIRST before any WinCC OA core API touches the project
    if (!patchConfig(version)) {
        return { skipReason: `WinCC OA ${version} install path could not be resolved` };
    }

    const project = new ProjEnvProject();
    project.setRunnable(true);
    project.setDir(FIXTURE_PROJECT_DIR);
    project.setName(INTEG_PROJECT_NAME);
    project.setVersion(version);

    try {
        // Remove any stale registration left by a previous failed run
        if (project.isRegistered()) {
            await project.unregisterProj();
        }
        const regResult = await project.registerProj();
        if (regResult !== 0) throw new Error(`registerProj returned ${regResult}`);
    } catch (err) {
        unpatchConfig(version);
        return { skipReason: `Could not register fixture project: ${err}` };
    }

    // Snapshot DB AFTER registration (registration may write lock files)
    const dbSnapshot = snapshotDb();

    // Spawn pmon normally (no -noAutostart) so Data + Event managers auto-start
    await spawnPmon(version);

    // Poll until the Data Manager is accepting connections
    const ready = await waitForManagers(version);
    if (!ready) {
        await project.stopPmon(15);
        await project.unregisterProj();
        unpatchConfig(version);
        restoreDb(dbSnapshot);
        return { skipReason: 'Data/Event managers did not become ready within 90 s' };
    }

    const configPath = path.join(FIXTURE_PROJECT_DIR, 'config', 'config');

    const cleanup = async (): Promise<void> => {
        try { await project.stopPmon(20); } catch { /* ignore */ }
        try { await project.unregisterProj(); } catch { /* ignore */ }
        unpatchConfig(version);
        restoreDb(dbSnapshot);
    };

    return {
        handle: {
            version,
            projectName: INTEG_PROJECT_NAME,
            projectDir: FIXTURE_PROJECT_DIR,
            configPath,
            cleanup,
        },
    };
}
