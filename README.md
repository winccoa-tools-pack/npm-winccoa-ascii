# WinCC OA ASCII Manager — DPL Import & Export

A TypeScript library and CLI tool for SIMATIC WinCC Open Architecture projects that wraps the
`WCCOAascii` / `WCCOAasciiSQLite` executable to import and export **Datapoint List (DPL)** files.

This package is part of the modular [winccoa-tools-pack](https://github.com/winccoa-tools-pack)
ecosystem, delivering modern development tooling and reusable libraries for WinCC OA engineers.

## ✨ Features

- **DPL import** — load datapoints, types, aliases, and CNS views from `.dpl` files into a running
  WinCC OA project
- **DPL export** — extract datapoints from a project to `.dpl` files with granular filter control
- **Full flag support** — all major `WCCOAascii` / `WCCOAasciiSQLite` flags are exposed via
  TypeScript API and CLI
- **Standalone mode** — run without a running Data/Event manager using the `-n` flag (SQLite projects)
- **Dual CJS + ESM output** — compatible with both `require()` and `import`
- **Modern project template** — TypeScript strict mode, ESLint, Prettier, full test infrastructure

## 📦 Installation

```shell
npm install @winccoa-tools-pack/npm-winccoa-ascii
```

Or globally for CLI use:

```shell
npm install -g @winccoa-tools-pack/npm-winccoa-ascii
```

## 🖥 Usage (CLI)

The CLI binary is `winccoa-ascii`.

### Import a DPL file

```shell
winccoa-ascii import data.dpl -v 3.21 -p MyProject

# With datapoint type handling and manager number
winccoa-ascii import data.dpl -v 3.21 -p MyProject --types-yes --num 96

# Using a config file instead of a project name
winccoa-ascii import data.dpl -v 3.21 -c /path/to/project/config/config

# Wildcard import
winccoa-ascii import "*.dpl" -v 3.21 -p MyProject --types-yes

# Standalone mode (no running managers needed, SQLite projects only)
winccoa-ascii import data.dpl -v 3.21 -p MyProject --standalone
```

### Export to a DPL file

```shell
# Export all datapoints
winccoa-ascii export out.dpl -v 3.21 -p MyProject --filter D

# Export a specific datapoint type
winccoa-ascii export out.dpl -v 3.21 -p MyProject --filter-dp-type MyDPType

# Export specific datapoints
winccoa-ascii export out.dpl -v 3.21 -p MyProject \
  --filter-dp System1:Sensor1 \
  --filter-dp System1:Sensor2

# Export with timestamp and output format version
winccoa-ascii export out.dpl -v 3.21 -p MyProject \
  --filter DPA --output-version 2 --export-timestamp

# Export data modified after a date
winccoa-ascii export out.dpl -v 3.21 -p MyProject --younger 01.01.2024
```

### Shared flags

| Flag | Short | Description |
| ------ | ------- | ------------- |
| `--version <ver>` | `-v` | WinCC OA version (e.g. `3.21`) — **required** |
| `--project <name>` | `-p` | Project name (`-proj`) |
| `--config <path>` | `-c` | Path to project config file (`-config`) |
| `--num <n>` | | Manager number (`-num`) |
| `--local-time` | | Use local time instead of GMT (`-localTime`) |
| `--user <user[:pw]>` | `-u` | Authentication (`-user`) |
| `--data <host[:port]>` | | Data server address (`-data`) |
| `--event <host[:port]>` | | Event server address (`-event`) |
| `--standalone` | | Run without Data/Event connection (`-n`) |
| `--timeout <ms>` | `-t` | Process timeout in ms (default: 120000) |

### Import-only flags

| Flag | Description |
| ------ | ------------- |
| `--types-yes` | Accept type changes without prompting (`-Typesyes`) |
| `--types-no` | Reject type changes without prompting (`-Typesno`) |
| `--cns-yes` | Do not change existing CNS nodes (`-CNSyes`) |
| `--cns-no` | Do not change existing CNS nodes, suppress warnings (`-CNSno`) |
| `--commit <n>` | Send N messages before waiting for acknowledgement (`-commit`) |
| `--no-verbose` | Suppress progress output (`-noVerbose`) |
| `--inactivate-alert` | Inactivate AlertValue configs on import (`-inactivateAlert`) |
| `--always-send-common` | Always send alias/description even if unchanged (`-alwaysSendCommon`) |

### Export-only flags

| Flag | Description |
| ------ | ------------- |
| `--filter <chars>` | Filter string: subset of `T D A C O P H` (`-filter`) |
| `--filter-dp <name>` | Limit to specific DP (repeatable) (`-filterDp`) |
| `--filter-dp-type <type>` | Limit to specific DPType (repeatable) (`-filterDpType`) |
| `--filter-file <path>` | File specifying DPs/types to export (`-filterFile`) |
| `--filter-cns <view>` | Limit to CNS view/subtree (repeatable) (`-filterCNS`) |
| `--younger <date>` | Only data newer than date — `DD.[MM.[YYYY]][:HH[:MM]]` (`-younger`) |
| `--output-version <1-4>` | DPL output format version (`-outputVersion`) |
| `--lang-list <list>` | Comma-separated language list (`-langList`) |
| `--keep-system` | Keep system name in DPE references (`-system`) |
| `--export-timestamp` | Include online value timestamps (`-exportTimestamp`) |

## ⚠️ Important behaviour

- **WCCOAasciiSQLite vs WCCOAascii** — this package defaults to the SQLite variant
  (`WCCOAasciiSQLite`) used by most modern WinCC OA 3.x projects.
- **Exit codes** — `WCCOAasciiSQLite` can return `55` (item already exists) or `56` (byte-count
  warning) even on a successful import; these are informational warnings, not failures.
- **Manager number** — use distinct `-num` values for concurrent import and export operations
  to avoid conflicts.
- **Standalone mode** — `-n` bypasses the Data/Event manager and accesses the SQLite database
  directly. Not supported on RAIMA-based projects.

## 🧩 Usage (API)

### Convenience functions

```typescript
import { importDpl, exportDpl } from "@winccoa-tools-pack/npm-winccoa-ascii";

// Import a DPL file
const importResult = await importDpl({
  version: "3.21",
  projectName: "MyProject",
  inputPath: "/path/to/data.dpl",
  typesAction: "yes",
  managerNumber: 96,
});

if (!importResult.success) {
  console.error(`Import failed: ${importResult.exitCode}`);
}

// Export datapoints by type
const exportResult = await exportDpl({
  version: "3.21",
  projectName: "MyProject",
  outputPath: "/path/to/out.dpl",
  filterDpType: ["MyDPType"],
  exportTimestamp: true,
  managerNumber: 97,
});

console.log(exportResult.stdout);
```

### Full import options

```typescript
import type { DplImportOptions } from "@winccoa-tools-pack/npm-winccoa-ascii";

const options: DplImportOptions = {
  version: "3.21",
  projectName: "MyProject",       // or: configPath: "/path/to/config/config"
  inputPath: "data.dpl",          // or wildcard: "*.dpl"
  typesAction: "yes",             // 'yes' | 'no'
  cnsAction: "no",                // 'yes' | 'no'
  commitCount: 200,
  noVerbose: true,
  inactivateAlert: false,
  alwaysSendCommon: false,
  localTime: true,
  managerNumber: 96,
  standalone: false,              // true = -n, no Data/Event manager needed
  timeout: 120_000,
};
```

### Full export options

```typescript
import type { DplExportOptions } from "@winccoa-tools-pack/npm-winccoa-ascii";

const options: DplExportOptions = {
  version: "3.21",
  projectName: "MyProject",
  outputPath: "/out/export.dpl",
  filter: "DPA",                  // T/D/A/C/O/P/H
  filterDp: ["System1:Dp1"],
  filterDpType: ["MyType"],
  filterFile: "/path/to/filter.txt",
  filterCns: ["MyView"],
  younger: "01.01.2024",
  outputVersion: 2,               // 1 | 2 | 3 | 4
  langList: "de,en",
  keepSystem: true,
  exportTimestamp: true,
  localTime: false,
  managerNumber: 97,
  standalone: false,
  timeout: 120_000,
};
```

### AsciiManager class

For repeated operations, reuse the manager instance directly:

```typescript
import { AsciiManager } from "@winccoa-tools-pack/npm-winccoa-ascii";

const manager = new AsciiManager();

if (!manager.exists("3.21")) {
  throw new Error("WCCOAasciiSQLite not found for version 3.21");
}

const result = await manager.import({
  version: "3.21",
  inputPath: "data.dpl",
  projectName: "Proj",
});
```

## 🩺 Troubleshooting

| Symptom | Cause / Fix |
| --------- | ------------- |
| `WCCOAasciiSQLite not found` | Check `--version` matches your WinCC OA installation |
| Import times out | Increase `--timeout`; ensure managers are running (or use `--standalone`) |
| Exit code 55 | DP/type already exists — safe to ignore for idempotent imports |
| Exit code 56 | Byte-count mismatch warning — usually harmless |
| Export produces empty file | Check `--filter` value and manager connectivity |

## 📚 Ecosystem Integration

This package works alongside the rest of the winccoa-tools-pack suite:

- **VS Code extensions** — integrates with WinCC OA developer tooling for panel, script, and
  datapoint management
- **CI/CD pipelines** — use `winccoa-ascii import` and `winccoa-ascii export` in GitHub Actions
  or GitLab CI for automated data migration and backup workflows
- **Other libraries** — compatible with `npm-winccoa-core`, `npm-winccoa-ui-pnl-xml`,
  and `npm-winccoa-ctrl`

## 📦 Development

```bash
# Install dependencies
npm install

# Build (CJS + ESM + types)
npm run build

# Run unit tests
npm run test:unit

# Run integration tests (requires WinCC OA installation)
npm run test:integration

# Full test suite (lint + build + unit tests)
npm test

# Lint and format
npm run style-check
npm run style-fix
```

## 🏆 Recognition

Special thanks to all our [contributors](https://github.com/orgs/winccoa-tools-pack/people) who
make this project possible!

### Key Contributors

- **Richard Janisch** ([@RichardJanisch](https://github.com/RichardJanisch)) — Creator & Lead Developer

---

## 📜 License

Licensed under the **MIT License** — see the
[LICENSE](https://github.com/winccoa-tools-pack/.github/blob/main/LICENSE) file for details.

---

## ⚠️ Disclaimer

**WinCC OA** and **Siemens** are trademarks of Siemens AG.
This project is not affiliated with, endorsed by, or sponsored by Siemens AG.
This is a community-driven open source project created to enhance the development experience for
WinCC OA developers.

---

Made with ❤️ for and by the WinCC OA community
