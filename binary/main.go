package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
)

// Version resolution priority:
// 1. .nvurc in current or parent directories
// 2. .nvmrc in current or parent directories
// 3. ~/.nvu/default (global default)

// getNvuHome returns the nvu home directory, respecting NVU_HOME env var
func getNvuHome() (string, error) {
	if nvuHome := os.Getenv("NVU_HOME"); nvuHome != "" {
		return nvuHome, nil
	}
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(homeDir, ".nvu"), nil
}

func main() {
	// Determine which binary we're proxying based on the executable name
	execName := filepath.Base(os.Args[0])
	// Remove .exe suffix on Windows
	execName = strings.TrimSuffix(execName, ".exe")

	// Core binaries that always exist in Node installations
	isCoreNodeBinary := execName == "node" || execName == "npm" || execName == "npx"

	// Check if we're running the nvu CLI itself - if so, use any available version
	// This prevents chicken-and-egg problems where nvu can't run because the
	// configured version isn't installed yet
	isNvuCli := isRunningNvuCli()

	var version string
	var err error

	if isNvuCli {
		// For nvu CLI, use the latest major installed version
		version, err = findLatestMajorInstalledVersion()
		if err != nil {
			fmt.Fprintf(os.Stderr, "nvu error: no Node versions installed\n")
			fmt.Fprintf(os.Stderr, "\nInstall Node manually first, or use system Node to run:\n")
			fmt.Fprintf(os.Stderr, "  /usr/bin/node $(which nvu) install 20\n")
			os.Exit(1)
		}
	} else {
		// Resolve the Node version to use
		version, err = resolveVersion()
		if err != nil {
			// No version configured - try system binary as fallback
			systemBinary := findSystemBinary(execName)
			if systemBinary != "" {
				err = execBinary(systemBinary, os.Args)
				if err != nil {
					fmt.Fprintf(os.Stderr, "nvu error: failed to exec system %s: %s\n", execName, err)
					os.Exit(1)
				}
				return // execBinary replaces the process on Unix
			}
			fmt.Fprintf(os.Stderr, "nvu error: %s\n", err)
			fmt.Fprintf(os.Stderr, "\nTo fix this, either:\n")
			fmt.Fprintf(os.Stderr, "  1. Create a .nvmrc file with a version: echo 20 > .nvmrc\n")
			fmt.Fprintf(os.Stderr, "  2. Set a global default: nvu default 20\n")
			os.Exit(1)
		}
	}

	// Find the real binary path
	binaryPath, err := findBinary(execName, version)
	if err != nil {
		// For non-core binaries (global packages), the binary might not exist
		// in the current Node version - try to find it in any installed version
		if !isCoreNodeBinary {
			binaryPath, err = findGlobalPackageBinary(execName)
		}
		if err != nil {
			if isCoreNodeBinary {
				fmt.Fprintf(os.Stderr, "nvu error: %s\n", err)
				fmt.Fprintf(os.Stderr, "\nNode %s may not be installed. Run: nvu install %s\n", version, version)
			} else {
				fmt.Fprintf(os.Stderr, "nvu error: '%s' not found\n", execName)
			}
			os.Exit(1)
		}
	}

	// Check if this is npm install/uninstall -g, and if so, handle shim creation/removal after
	if execName == "npm" {
		if isGlobalInstall() {
			runNpmAndCreateShims(binaryPath, os.Args)
			return
		}
		if isGlobalUninstall() {
			runNpmAndRemoveShims(binaryPath, os.Args)
			return
		}
	}

	// Execute the real binary, replacing this process
	err = execBinary(binaryPath, os.Args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "nvu error: failed to exec %s: %s\n", binaryPath, err)
		os.Exit(1)
	}
}

// resolveVersion determines which Node version to use
func resolveVersion() (string, error) {
	// 1. Check for .nvurc or .nvmrc in current directory and parents
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get current directory: %w", err)
	}

	version := findVersionInParents(cwd)
	if version != "" {
		return version, nil
	}

	// 2. Check global default
	nvuHome, err := getNvuHome()
	if err != nil {
		return "", fmt.Errorf("failed to get nvu home directory: %w", err)
	}

	defaultPath := filepath.Join(nvuHome, "default")
	version, err = readVersionFile(defaultPath)
	if err == nil && version != "" {
		return version, nil
	}

	return "", fmt.Errorf("no Node version configured")
}

// findVersionInParents walks up the directory tree looking for version config files
func findVersionInParents(dir string) string {
	for {
		// Check .nvurc first (nvu-specific)
		version, err := readVersionFile(filepath.Join(dir, ".nvurc"))
		if err == nil && version != "" {
			return version
		}

		// Check .nvmrc (ecosystem compatible)
		version, err = readVersionFile(filepath.Join(dir, ".nvmrc"))
		if err == nil && version != "" {
			return version
		}

		// Move to parent directory
		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached root
			break
		}
		dir = parent
	}
	return ""
}

// readVersionFile reads a version from a file, trimming whitespace
func readVersionFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	version := strings.TrimSpace(string(content))
	return version, nil
}

// findBinary locates the actual binary for the given command and version
func findBinary(name string, version string) (string, error) {
	nvuHome, err := getNvuHome()
	if err != nil {
		return "", fmt.Errorf("failed to get nvu home directory: %w", err)
	}

	versionsDir := filepath.Join(nvuHome, "installed")

	// Resolve version to an installed version directory
	resolvedVersion, err := resolveInstalledVersion(versionsDir, version)
	if err != nil {
		return "", err
	}

	// The binary should be at ~/.nvu/installed/<version>/bin/<name>
	var binaryPath string
	if runtime.GOOS == "windows" {
		// On Windows, look for .exe or .cmd
		binaryPath = filepath.Join(versionsDir, resolvedVersion, "bin", name+".exe")
		if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
			// Try without bin/ (for node.exe which might be at root)
			binaryPath = filepath.Join(versionsDir, resolvedVersion, name+".exe")
		}
		if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
			// Try .cmd for npm/npx
			binaryPath = filepath.Join(versionsDir, resolvedVersion, name+".cmd")
		}
	} else {
		binaryPath = filepath.Join(versionsDir, resolvedVersion, "bin", name)
	}

	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		return "", fmt.Errorf("binary not found: %s", binaryPath)
	}

	return binaryPath, nil
}

// resolveInstalledVersion finds the best matching installed version
func resolveInstalledVersion(versionsDir string, version string) (string, error) {
	// Normalize version - remove 'v' prefix for comparison
	normalizedVersion := strings.TrimPrefix(version, "v")

	// Try exact matches first (with and without 'v' prefix)
	exactMatches := []string{version, "v" + normalizedVersion, normalizedVersion}
	for _, v := range exactMatches {
		path := filepath.Join(versionsDir, v)
		if info, err := os.Stat(path); err == nil && info.IsDir() {
			return v, nil
		}
	}

	// If no exact match, scan for partial version match (e.g., "20" matches "v20.19.6")
	entries, err := os.ReadDir(versionsDir)
	if err != nil {
		return "", fmt.Errorf("failed to read versions directory: %w", err)
	}

	var bestMatch string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dirName := entry.Name()
		dirVersion := strings.TrimPrefix(dirName, "v")

		// Check if this version starts with our target
		if strings.HasPrefix(dirVersion, normalizedVersion+".") || dirVersion == normalizedVersion {
			// Prefer higher versions (simple string comparison works for semver)
			if bestMatch == "" || dirName > bestMatch {
				bestMatch = dirName
			}
		}
	}

	if bestMatch != "" {
		return bestMatch, nil
	}

	return "", fmt.Errorf("no installed version matching %s", version)
}

// execBinary replaces the current process with the target binary
func execBinary(binaryPath string, args []string) error {
	// On Unix, use syscall.Exec to replace the process
	// On Windows, we need to use exec.Command and wait
	if runtime.GOOS == "windows" {
		return execWindows(binaryPath, args)
	}
	return execUnix(binaryPath, args)
}

func execUnix(binaryPath string, args []string) error {
	// Replace args[0] with the actual binary path
	args[0] = binaryPath
	return syscall.Exec(binaryPath, args, os.Environ())
}

func execWindows(binaryPath string, args []string) error {
	// On Windows, we can't use syscall.Exec, so we spawn and wait
	cmd := exec.Command(binaryPath, args[1:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	err := cmd.Run()
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			os.Exit(exitError.ExitCode())
		}
		return err
	}
	os.Exit(0)
	return nil
}

// isRunningNvuCli checks if we're being used to run the nvu CLI
func isRunningNvuCli() bool {
	if len(os.Args) < 2 {
		return false
	}

	// Check if the script being run is the nvu CLI
	script := os.Args[1]

	// Check for common nvu CLI paths
	if strings.Contains(script, "node-version-use") {
		return true
	}
	if strings.HasSuffix(script, "/nvu") || strings.HasSuffix(script, "\\nvu") {
		return true
	}
	if filepath.Base(script) == "nvu" || filepath.Base(script) == "nvu.js" {
		return true
	}

	return false
}

// findLatestMajorInstalledVersion returns the latest LTS (even major) installed Node version
// LTS versions are even major numbers: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22...
// For 0.x versions, even minors are LTS: 0.8, 0.10, 0.12
func findLatestMajorInstalledVersion() (string, error) {
	nvuHome, err := getNvuHome()
	if err != nil {
		return "", err
	}

	versionsDir := filepath.Join(nvuHome, "installed")
	entries, err := os.ReadDir(versionsDir)
	if err != nil {
		return "", err
	}

	// Find all valid installed versions
	var ltsVersions []string
	var allVersions []string
	for _, entry := range entries {
		if entry.IsDir() {
			// Verify it has a node binary
			nodePath := filepath.Join(versionsDir, entry.Name(), "bin", "node")
			if runtime.GOOS == "windows" {
				nodePath = filepath.Join(versionsDir, entry.Name(), "node.exe")
			}
			if _, err := os.Stat(nodePath); err == nil {
				allVersions = append(allVersions, entry.Name())
				if isLTSVersion(entry.Name()) {
					ltsVersions = append(ltsVersions, entry.Name())
				}
			}
		}
	}

	// Prefer LTS versions, fall back to any version
	versions := ltsVersions
	if len(versions) == 0 {
		versions = allVersions
	}
	if len(versions) == 0 {
		return "", fmt.Errorf("no installed versions found")
	}

	// Find the latest by major version
	latest := versions[0]
	for _, v := range versions[1:] {
		if getMajorVersion(v) > getMajorVersion(latest) {
			latest = v
		}
	}

	return latest, nil
}

// isLTSVersion checks if a version is an LTS release (even major, or even minor for 0.x)
func isLTSVersion(version string) bool {
	major := getMajorVersion(version)

	// For 0.x versions, check the minor version
	if major == 0 {
		minor := getMinorVersion(version)
		return minor%2 == 0 // 0.8, 0.10, 0.12 are LTS
	}

	// For 1.x+, even majors are LTS
	return major%2 == 0
}

// getMajorVersion extracts the major version number from a version string
func getMajorVersion(version string) int {
	version = strings.TrimPrefix(version, "v")
	parts := strings.Split(version, ".")
	if len(parts) > 0 {
		var major int
		fmt.Sscanf(parts[0], "%d", &major)
		return major
	}
	return 0
}

// getMinorVersion extracts the minor version number from a version string
func getMinorVersion(version string) int {
	version = strings.TrimPrefix(version, "v")
	parts := strings.Split(version, ".")
	if len(parts) > 1 {
		var minor int
		fmt.Sscanf(parts[1], "%d", &minor)
		return minor
	}
	return 0
}

// isGlobalInstall checks if the current npm command is a global install
func isGlobalInstall() bool {
	hasGlobal := false
	hasInstall := false
	for _, arg := range os.Args[1:] {
		if arg == "-g" || arg == "--global" {
			hasGlobal = true
		}
		if arg == "install" || arg == "i" || arg == "add" {
			hasInstall = true
		}
	}
	return hasGlobal && hasInstall
}

// isGlobalUninstall checks if the current npm command is a global uninstall
func isGlobalUninstall() bool {
	hasGlobal := false
	hasUninstall := false
	for _, arg := range os.Args[1:] {
		if arg == "-g" || arg == "--global" {
			hasGlobal = true
		}
		if arg == "uninstall" || arg == "remove" || arg == "rm" || arg == "r" || arg == "un" || arg == "unlink" {
			hasUninstall = true
		}
	}
	return hasGlobal && hasUninstall
}

// findGlobalPackageBinary looks for a binary in the default Node version's bin directory
func findGlobalPackageBinary(name string) (string, error) {
	nvuHome, err := getNvuHome()
	if err != nil {
		return "", err
	}

	// Read default version
	defaultPath := filepath.Join(nvuHome, "default")
	defaultVersion, err := readVersionFile(defaultPath)
	if err != nil || defaultVersion == "" {
		return "", fmt.Errorf("no default version set")
	}

	versionsDir := filepath.Join(nvuHome, "installed")
	resolvedVersion, err := resolveInstalledVersion(versionsDir, defaultVersion)
	if err != nil {
		return "", err
	}

	// Look for the binary
	var binaryPath string
	if runtime.GOOS == "windows" {
		binaryPath = filepath.Join(versionsDir, resolvedVersion, "bin", name+".exe")
		if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
			binaryPath = filepath.Join(versionsDir, resolvedVersion, name+".cmd")
		}
	} else {
		binaryPath = filepath.Join(versionsDir, resolvedVersion, "bin", name)
	}

	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		return "", fmt.Errorf("binary not found: %s", name)
	}

	return binaryPath, nil
}

// runNpmAndCreateShims runs npm and then creates shims for any new global binaries
func runNpmAndCreateShims(npmPath string, args []string) {
	nvuHome, err := getNvuHome()
	if err != nil {
		fmt.Fprintf(os.Stderr, "nvu error: %s\n", err)
		os.Exit(1)
	}

	// Get list of binaries before npm install
	binDir := filepath.Join(nvuHome, "bin")
	defaultPath := filepath.Join(nvuHome, "default")
	defaultVersion, _ := readVersionFile(defaultPath)

	var nodeBinDir string
	if defaultVersion != "" {
		versionsDir := filepath.Join(nvuHome, "installed")
		if resolved, err := resolveInstalledVersion(versionsDir, defaultVersion); err == nil {
			nodeBinDir = filepath.Join(versionsDir, resolved, "bin")
		}
	}

	binariesBefore := make(map[string]bool)
	if nodeBinDir != "" {
		if entries, err := os.ReadDir(nodeBinDir); err == nil {
			for _, e := range entries {
				binariesBefore[e.Name()] = true
			}
		}
	}

	// Run npm
	cmd := exec.Command(npmPath, args[1:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	err = cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			fmt.Fprintf(os.Stderr, "nvu error: failed to run npm: %s\n", err)
			os.Exit(1)
		}
	}

	// If npm failed, don't create shims
	if exitCode != 0 {
		os.Exit(exitCode)
	}

	// Get list of binaries after npm install
	if nodeBinDir == "" {
		os.Exit(0)
	}

	entries, err := os.ReadDir(nodeBinDir)
	if err != nil {
		os.Exit(0)
	}

	// Find new binaries and create shims
	shimSource := filepath.Join(binDir, "node") // Use node shim as template
	if runtime.GOOS == "windows" {
		shimSource = filepath.Join(binDir, "node.exe")
	}

	for _, e := range entries {
		name := e.Name()
		// Skip our routing shims (node/npm/npx) - don't overwrite them
		if name == "node" || name == "npm" || name == "npx" {
			continue
		}

		// Create shim by copying the node shim
		shimDest := filepath.Join(binDir, name)
		if runtime.GOOS == "windows" {
			shimDest = filepath.Join(binDir, name+".exe")
		}

		// Skip if shim already exists
		if _, err := os.Stat(shimDest); err == nil {
			continue
		}

		// Copy the shim binary
		if err := copyFile(shimSource, shimDest); err != nil {
			continue
		}

		// Make executable on Unix
		if runtime.GOOS != "windows" {
			os.Chmod(shimDest, 0755)
		}

	}

	os.Exit(0)
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0755)
}

// runNpmAndRemoveShims runs npm uninstall and then removes shims for removed binaries
func runNpmAndRemoveShims(npmPath string, args []string) {
	nvuHome, err := getNvuHome()
	if err != nil {
		fmt.Fprintf(os.Stderr, "nvu error: %s\n", err)
		os.Exit(1)
	}

	// Get list of binaries before npm uninstall
	binDir := filepath.Join(nvuHome, "bin")
	defaultPath := filepath.Join(nvuHome, "default")
	defaultVersion, _ := readVersionFile(defaultPath)

	var nodeBinDir string
	if defaultVersion != "" {
		versionsDir := filepath.Join(nvuHome, "installed")
		if resolved, err := resolveInstalledVersion(versionsDir, defaultVersion); err == nil {
			nodeBinDir = filepath.Join(versionsDir, resolved, "bin")
		}
	}

	binariesBefore := make(map[string]bool)
	if nodeBinDir != "" {
		if entries, err := os.ReadDir(nodeBinDir); err == nil {
			for _, e := range entries {
				binariesBefore[e.Name()] = true
			}
		}
	}

	// Run npm
	cmd := exec.Command(npmPath, args[1:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	err = cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			fmt.Fprintf(os.Stderr, "nvu error: failed to run npm: %s\n", err)
			os.Exit(1)
		}
	}

	// If npm failed, don't remove shims
	if exitCode != 0 {
		os.Exit(exitCode)
	}

	// Get list of binaries after npm uninstall
	if nodeBinDir == "" {
		os.Exit(0)
	}

	binariesAfter := make(map[string]bool)
	if entries, err := os.ReadDir(nodeBinDir); err == nil {
		for _, e := range entries {
			binariesAfter[e.Name()] = true
		}
	}

	// Find removed binaries and delete their shims
	for name := range binariesBefore {
		if binariesAfter[name] {
			continue // Still exists
		}
		if name == "node" || name == "npm" || name == "npx" || name == "corepack" {
			continue // Core binaries
		}

		// Remove the shim
		shimPath := filepath.Join(binDir, name)
		if runtime.GOOS == "windows" {
			shimPath = filepath.Join(binDir, name+".exe")
		}

		if err := os.Remove(shimPath); err == nil {
		}
	}

	os.Exit(0)
}

// findSystemBinary looks for a system-installed binary (not the nvu binary)
func findSystemBinary(name string) string {
	// Get our own executable path to avoid finding ourselves
	selfPath, _ := os.Executable()
	selfDir := filepath.Dir(selfPath)

	// Common system binary locations
	candidates := []string{
		"/usr/local/bin/" + name,
		"/usr/bin/" + name,
		"/opt/homebrew/bin/" + name,
	}

	// Also check PATH, but skip our own directory
	if pathEnv := os.Getenv("PATH"); pathEnv != "" {
		for _, dir := range strings.Split(pathEnv, string(os.PathListSeparator)) {
			// Skip our own directory
			if dir == selfDir {
				continue
			}
			candidate := filepath.Join(dir, name)
			if runtime.GOOS == "windows" {
				candidate = filepath.Join(dir, name+".exe")
			}
			// Check if it exists and is not a symlink to us
			if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
				// Make sure it's not our binary
				realPath, _ := filepath.EvalSymlinks(candidate)
				if realPath != selfPath && !strings.Contains(realPath, ".nvu/bin") {
					return candidate
				}
			}
		}
	}

	// Check explicit candidates
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
	}

	return ""
}
