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

3. If binary changes are needed, bump `binaryVersion` in `package.json` and push a tag:
   ```bash
   git tag binary-v1.0.1 && git push origin binary-v1.0.1
   ```
   GitHub Actions automatically builds and publishes binaries for all platforms.

4. Publish to npm:
   ```bash
   npm publish
   ```

5. Push version tag:
   ```bash
   git push --follow-tags
   ```

## Development

### Testing

Binaries are downloaded from GitHub releases during `npm install`:

```bash
npm install       # Downloads binaries to ~/.nvu/bin/
npm test          # Runs all tests using downloaded binaries
npm run clean     # Clear all temp files
```

### Test Isolation

Tests use `NVU_HOME` environment variable for isolation:

- **Binaries:** `~/.nvu/bin/` (downloaded from releases)
- **Test NVU_HOME:** `.tmp/commands/` or `.tmp/binary-test/`

### Binary Development (requires Go)

For local Go binary development:

```bash
# Build for current platform
cd binary && make local

# Build all platforms
cd binary && make release

# Install to ~/.nvu/bin
cd binary && make install
```

### Binary Development Workflow

1. Make changes to `binary/main.go`
2. Build locally: `cd binary && make local`
3. Install: `cd binary && make install`
4. Run tests: `npm test`
5. When ready, bump `binaryVersion` in package.json and push tag

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
nvu engines node assets/postinstall.cjs
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
