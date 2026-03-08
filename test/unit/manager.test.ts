import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AsciiManager } from '../../src/manager';
import { AsciiManagerComponent } from '@winccoa-tools-pack/npm-winccoa-core/types/components/implementations/AsciiManagerComponent';

/**
 * Helper to get the args passed to the most recent start() call.
 */
function lastStartArgs(): string[] {
    const startFn = AsciiManagerComponent.prototype.start as unknown as ReturnType<typeof mock.fn>;
    return startFn.mock.calls[0]?.arguments[0] as string[];
}

describe('AsciiManager', () => {
    beforeEach(() => {
        AsciiManagerComponent.prototype.start = mock.fn(
            async () => 0,
        ) as typeof AsciiManagerComponent.prototype.start;
    });

    // ── import ───────────────────────────────────────────────────────────────

    describe('import()', () => {
        it('should call start with -in flag and return success result', async () => {
            const manager = new AsciiManager();
            const result = await manager.import({
                version: '3.21',
                inputPath: 'data.dpl',
                configPath: '/path/to/config',
            });

            assert.equal(result.success, true);
            assert.equal(result.exitCode, 0);
            assert.equal(result.inputPath, 'data.dpl');

            const args = lastStartArgs();
            assert.ok(args.includes('-in'));
            assert.equal(args[args.indexOf('-in') + 1], 'data.dpl');
            assert.ok(args.includes('-config'));
            assert.equal(args[args.indexOf('-config') + 1], '/path/to/config');
        });

        it('should use -proj when projectName is provided', async () => {
            const manager = new AsciiManager();
            await manager.import({ version: '3.21', inputPath: 'f.dpl', projectName: 'myProj' });

            const args = lastStartArgs();
            assert.ok(args.includes('-proj'));
            assert.equal(args[args.indexOf('-proj') + 1], 'myProj');
            assert.ok(!args.includes('-config'));
        });

        it('should prefer -config over -proj when both are provided', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                projectName: 'proj',
                configPath: '/cfg',
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-config'));
            assert.ok(!args.includes('-proj'));
        });

        it('should include -commit flag when commitCount is set', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                commitCount: 50,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-commit'));
            assert.equal(args[args.indexOf('-commit') + 1], '50');
        });

        it('should include -Typesyes when typesAction is "yes"', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                typesAction: 'yes',
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-Typesyes'));
            assert.ok(!args.includes('-Typesno'));
        });

        it('should include -Typesno when typesAction is "no"', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                typesAction: 'no',
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-Typesno'));
            assert.ok(!args.includes('-Typesyes'));
        });

        it('should include -CNSyes when cnsAction is "yes"', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                cnsAction: 'yes',
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-CNSyes'));
        });

        it('should include -CNSno when cnsAction is "no"', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                cnsAction: 'no',
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-CNSno'));
        });

        it('should include -noVerbose flag', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                noVerbose: true,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-noVerbose'));
        });

        it('should include -inactivateAlert flag', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                inactivateAlert: true,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-inactivateAlert'));
        });

        it('should include -alwaysSendCommon flag', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                alwaysSendCommon: true,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-alwaysSendCommon'));
        });

        it('should include shared -localTime flag', async () => {
            const manager = new AsciiManager();
            await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
                localTime: true,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-localTime'));
        });

        it('should return failure result when exitCode is non-zero', async () => {
            AsciiManagerComponent.prototype.start = mock.fn(
                async () => 2,
            ) as typeof AsciiManagerComponent.prototype.start;

            const manager = new AsciiManager();
            const result = await manager.import({
                version: '3.21',
                inputPath: 'f.dpl',
                configPath: '/cfg',
            });

            assert.equal(result.success, false);
            assert.equal(result.exitCode, 2);
        });
    });

    // ── export ───────────────────────────────────────────────────────────────

    describe('export()', () => {
        it('should call start with -out flag and return success result', async () => {
            const manager = new AsciiManager();
            const result = await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/path/to/config',
            });

            assert.equal(result.success, true);
            assert.equal(result.exitCode, 0);
            assert.equal(result.outputPath, 'out.dpl');

            const args = lastStartArgs();
            assert.ok(args.includes('-out'));
            assert.equal(args[args.indexOf('-out') + 1], 'out.dpl');
        });

        it('should include -filter flag', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                filter: 'DP',
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-filter'));
            assert.equal(args[args.indexOf('-filter') + 1], 'DP');
        });

        it('should include multiple -filterDp flags', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                filterDp: ['Dp1', 'Dp2'],
            });

            const args = lastStartArgs();
            const indices = args.reduce<number[]>(
                (acc, v, i) => (v === '-filterDp' ? [...acc, i] : acc),
                [],
            );
            assert.equal(indices.length, 2);
            assert.equal(args[indices[0] + 1], 'Dp1');
            assert.equal(args[indices[1] + 1], 'Dp2');
        });

        it('should include multiple -filterDpType flags', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                filterDpType: ['TypeA', 'TypeB'],
            });

            const args = lastStartArgs();
            const indices = args.reduce<number[]>(
                (acc, v, i) => (v === '-filterDpType' ? [...acc, i] : acc),
                [],
            );
            assert.equal(indices.length, 2);
        });

        it('should include multiple -filterCNS flags', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                filterCns: ['view1', 'view2'],
            });

            const args = lastStartArgs();
            const indices = args.reduce<number[]>(
                (acc, v, i) => (v === '-filterCNS' ? [...acc, i] : acc),
                [],
            );
            assert.equal(indices.length, 2);
        });

        it('should include -outputVersion flag', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                outputVersion: 2,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-outputVersion'));
            assert.equal(args[args.indexOf('-outputVersion') + 1], '2');
        });

        it('should include -system flag when keepSystem is true', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                keepSystem: true,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-system'));
        });

        it('should include -exportTimestamp flag', async () => {
            const manager = new AsciiManager();
            await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
                exportTimestamp: true,
            });

            const args = lastStartArgs();
            assert.ok(args.includes('-exportTimestamp'));
        });

        it('should return failure result when exitCode is non-zero', async () => {
            AsciiManagerComponent.prototype.start = mock.fn(
                async () => 1,
            ) as typeof AsciiManagerComponent.prototype.start;

            const manager = new AsciiManager();
            const result = await manager.export({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
            });

            assert.equal(result.success, false);
            assert.equal(result.exitCode, 1);
        });
    });
});
