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

func main() {
	// Determine which binary we're shimming based on the executable name
	execName := filepath.Base(os.Args[0])
	// Remove .exe suffix on Windows
	execName = strings.TrimSuffix(execName, ".exe")

	// Check if we're running the nvu CLI itself - if so, use any available version
	// This prevents chicken-and-egg problems where nvu can't run because the
	// configured version isn't installed yet
	isNvuCli := isRunningNvuCli()

	var version string
	var err error

	if isNvuCli {
		// For nvu CLI, use any available installed version
		version, err = findAnyInstalledVersion()
		if err != nil {
			fmt.Fprintf(os.Stderr, "nvu shim error: no Node versions installed\n")
			fmt.Fprintf(os.Stderr, "\nInstall Node manually first, or use system Node to run:\n")
			fmt.Fprintf(os.Stderr, "  /usr/bin/node $(which nvu) install 20\n")
			os.Exit(1)
		}
	} else {
		// Resolve the Node version to use
		version, err = resolveVersion()
		if err != nil {
			fmt.Fprintf(os.Stderr, "nvu shim error: %s\n", err)
			fmt.Fprintf(os.Stderr, "\nTo fix this, either:\n")
			fmt.Fprintf(os.Stderr, "  1. Create a .nvmrc file with a version: echo 20 > .nvmrc\n")
			fmt.Fprintf(os.Stderr, "  2. Set a global default: nvu default 20\n")
			os.Exit(1)
		}
	}

	// Find the real binary path
	binaryPath, err := findBinary(execName, version)
	if err != nil {
		fmt.Fprintf(os.Stderr, "nvu shim error: %s\n", err)
		fmt.Fprintf(os.Stderr, "\nNode %s may not be installed. Run: nvu install %s\n", version, version)
		os.Exit(1)
	}

	// Execute the real binary, replacing this process
	err = execBinary(binaryPath, os.Args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "nvu shim error: failed to exec %s: %s\n", binaryPath, err)
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
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	defaultPath := filepath.Join(homeDir, ".nvu", "default")
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
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	versionsDir := filepath.Join(homeDir, ".nvu", "versions")

	// Resolve version to an installed version directory
	resolvedVersion, err := resolveInstalledVersion(versionsDir, version)
	if err != nil {
		return "", err
	}

	// The binary should be at ~/.nvu/versions/<version>/bin/<name>
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

// findAnyInstalledVersion returns any installed Node version
func findAnyInstalledVersion() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	versionsDir := filepath.Join(homeDir, ".nvu", "versions")
	entries, err := os.ReadDir(versionsDir)
	if err != nil {
		return "", err
	}

	// Return the first installed version we find
	for _, entry := range entries {
		if entry.IsDir() {
			// Verify it has a node binary
			nodePath := filepath.Join(versionsDir, entry.Name(), "bin", "node")
			if runtime.GOOS == "windows" {
				nodePath = filepath.Join(versionsDir, entry.Name(), "node.exe")
			}
			if _, err := os.Stat(nodePath); err == nil {
				return entry.Name(), nil
			}
		}
	}

	return "", fmt.Errorf("no installed versions found")
}
