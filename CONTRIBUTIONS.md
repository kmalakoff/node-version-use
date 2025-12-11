# Contributions

Internal documentation for maintainers.

## Publishing

The npm package version and Go binary version are tracked separately in `package.json`:
- `version`: npm package version
- `binaryVersion`: Go binary version

### Release Process

1. Ensure all tests pass:
   ```bash
   npm test
   ```

2. Bump npm package version:
   ```bash
   npm version patch  # or minor, major
   ```

3. If binary changes are needed, bump `binaryVersion` in `package.json` and build binaries:
   ```bash
   node scripts/build-binaries.ts
   ```

4. Create GitHub release with tag `binary-vX.Y.Z` and upload archives from `binary/build/`:
   - `nvu-binary-darwin-arm64.tar.gz`
   - `nvu-binary-darwin-x64.tar.gz`
   - `nvu-binary-linux-x64.tar.gz`
   - `nvu-binary-linux-arm64.tar.gz`
   - `nvu-binary-win32-x64.zip`
   - `nvu-binary-win32-arm64.zip`

5. Publish to npm:
   ```bash
   npm publish
   ```

6. Push tags:
   ```bash
   git push --follow-tags
   ```

## Development

### Testing

Tests automatically build binaries to `.tmp/binary/bin/` on first run (requires Go):

```bash
npm test          # Builds test binaries if needed, then runs all tests
npm run clean     # Clear all temp files including test binaries
```

If Go is not available, binary integration tests are skipped gracefully.

### Test Isolation

Tests use complete isolation from your global `~/.nvu/` directory:

- **Test binaries:** `.tmp/binary/bin/` (locally-built, never touches ~/.nvu/)
- **Test NVU_HOME:** `.tmp/commands/` or `.tmp/binary-test/`
- **Production binaries:** `~/.nvu/bin/` (only via `make install` in binary/)

### Manual Binary Building

```bash
# Build test binaries only (for isolated testing)
npm run build:binary:test

# Build release binaries for all platforms
node scripts/build-binaries.ts

# Install to global ~/.nvu/bin (production use)
cd binary && make install
```

### Binary Development Workflow

1. Make changes to `binary/main.go`
2. Run `npm run clean:binary` to clear cached test binaries
3. Run `npm test` - binaries rebuild automatically
4. Integration tests in `test/unit/binary.test.ts` verify behavior

## Pre-Release Smoke Test Checklist

Run through this checklist before every release:

### 1. TypeScript Compilation
```bash
npm run prepublishOnly
```
- [ ] Compiles without errors
- [ ] Creates `dist/` directory

### 2. Unit Tests (Current Node)
```bash
npm test
```
- [ ] All tests pass (53+ tests)
- [ ] No timeouts or hangs

### 3. Cross-Version Tests (CRITICAL)
```bash
nvu engines tsds test:node --no-timeouts
```
- [ ] Tests pass on Node 0.8
- [ ] Tests pass on Node 0.10
- [ ] Tests pass on Node 0.12
- [ ] Tests pass on Node 4+
- [ ] No `startsWith`/`includes` errors (use `indexOf` instead)

### 4. Postinstall Compatibility
```bash
nvu 0.8 node scripts/postinstall.cjs
nvu 0.10 node scripts/postinstall.cjs
nvu 0.12 node scripts/postinstall.cjs
```
- [ ] Runs without syntax errors
- [ ] Gracefully handles 404 (binaries not published)
- [ ] Shows helpful instructions

### 5. Binary Build
```bash
make -C binary clean && make -C binary all
ls -la binary/build/
```
- [ ] All 6 platform binaries created:
  - `nvu-binary-darwin-arm64`
  - `nvu-binary-darwin-x64`
  - `nvu-binary-linux-x64`
  - `nvu-binary-linux-arm64`
  - `nvu-binary-win32-x64.exe`
  - `nvu-binary-win32-arm64.exe`

### 6. Binary Functionality
```bash
# Create test environment
mkdir -p .tmp/smoke-test/installed/v20.0.0/bin
echo '#!/bin/sh
echo "v20.0.0"' > .tmp/smoke-test/installed/v20.0.0/bin/node
chmod +x .tmp/smoke-test/installed/v20.0.0/bin/node
echo "20" > .tmp/smoke-test/.nvmrc
cp binary/build/nvu-binary-darwin-arm64 .tmp/smoke-test/node  # use your platform

# Test binary
cd .tmp/smoke-test && NVU_HOME=$(pwd) ./node --version
# Should output: v20.0.0
```
- [ ] Binary reads .nvmrc
- [ ] Binary finds installed version
- [ ] Binary proxies to correct node

### 7. CLI Commands
```bash
# Test help
nvu --help
nvu --version

# Test commands
nvu 22 node --version
nvu default 20
nvu local 18
nvu list
nvu which
```
- [ ] Help displays correctly
- [ ] Version matches package.json
- [ ] Commands work as expected

### 8. No "shim" References
```bash
grep -r "shim" --include="*.ts" --include="*.js" --include="*.cjs" --include="*.go" --include="*.md" . | grep -v node_modules | grep -v "os-shim"
```
- [ ] No stray "shim" references (except `os-shim` npm package)

### Common Issues to Watch For

1. **Node 0.8+ compatibility**: Never use `startsWith`, `includes`, `endsWith`, `padStart`, `padEnd` on strings/arrays. Use `indexOf` instead.

2. **Missing dependencies**: Run `npm run prepublishOnly` to catch missing deps.

3. **Binary naming**: Binaries in `~/.nvu/bin/` are named `node`, `npm`, `npx` (not `nvu-binary`).

4. **Version fields**: `version` is npm package version, `binaryVersion` is Go binary version. Update both as needed.
