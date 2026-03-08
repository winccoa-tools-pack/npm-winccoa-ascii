import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { importDpl, exportDpl } from '../../src/api';
import { AsciiManager } from '../../src/manager';

const STUB_IMPORT_RESULT = {
    success: true,
    exitCode: 0,
    stdout: '',
    stderr: '',
    inputPath: 'data.dpl',
};

const STUB_EXPORT_RESULT = {
    success: true,
    exitCode: 0,
    stdout: '',
    stderr: '',
    outputPath: 'out.dpl',
};

describe('API convenience functions', () => {
    describe('importDpl()', () => {
        beforeEach(() => {
            AsciiManager.prototype.import = mock.fn(async () => STUB_IMPORT_RESULT) as typeof AsciiManager.prototype.import;
        });

        it('should delegate to AsciiManager.import and return the result', async () => {
            const result = await importDpl({
                version: '3.21',
                inputPath: 'data.dpl',
                configPath: '/cfg',
            });

            assert.deepEqual(result, STUB_IMPORT_RESULT);
        });

        it('should use a shared instance across multiple calls', async () => {
            await importDpl({ version: '3.21', inputPath: 'a.dpl', configPath: '/cfg' });
            await importDpl({ version: '3.21', inputPath: 'b.dpl', configPath: '/cfg' });

            // Both calls go through AsciiManager.prototype.import, called twice total
            const callCount = (AsciiManager.prototype.import as ReturnType<typeof mock.fn>).mock
                .calls.length;
            assert.equal(callCount, 2);
        });
    });

    describe('exportDpl()', () => {
        beforeEach(() => {
            AsciiManager.prototype.export = mock.fn(async () => STUB_EXPORT_RESULT) as typeof AsciiManager.prototype.export;
        });

        it('should delegate to AsciiManager.export and return the result', async () => {
            const result = await exportDpl({
                version: '3.21',
                outputPath: 'out.dpl',
                configPath: '/cfg',
            });

            assert.deepEqual(result, STUB_EXPORT_RESULT);
        });
    });
});
