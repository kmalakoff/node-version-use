# Changelog

## [2.6.2] - 2026-11-18

### Fixed

- `nvu setup` writes `~/.nvu/bin/nvu.json` under a temporary name and renames it into place, so an interrupted setup no longer leaves a partly written marker.
- The shims staged during setup get unique temporary names, so two setups running at once no longer write to the same staging file.
- A staging file left in `~/.nvu/bin` by an interrupted setup is no longer overwritten with a copy of the `nvu` binary when the shims are refreshed.
- `nvu setup` no longer fails when the running Node's architecture differs from the one npm installed under (for example a 32-bit Node 0.8 to 0.12 on 64-bit Windows): it uses the binary package for the machine's architecture when the running Node's has none, and the error names both packages when neither is installed.

### Changed

- `temp-suffix` and `cpu-arch` are dependencies.
