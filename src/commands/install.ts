import exit from 'exit-compat';
import path from 'path';
import { storagePath } from '../constants.ts';
import loadNodeVersionInstall from '../lib/loadNodeVersionInstall.ts';

/**
 * nvu install <version>
 *
 * Download and install a specific Node version.
 */
export default function installCmd(args: string[]): void {
  if (args.length === 0) {
    console.log('Usage: nvu install <version>');
    console.log('Example: nvu install 20');
    console.log('         nvu install 20.10.0');
    console.log('         nvu install lts');
    exit(1);
    return;
  }

  const version = args[0].trim();

  // Validate version format (basic check, indexOf for Node 0.8+ compat)
  if (!version || version.indexOf('-') === 0) {
    console.log('Usage: nvu install <version>');
    exit(1);
    return;
  }

  console.log(`Installing Node ${version}...`);

  // Load node-version-install dynamically
  loadNodeVersionInstall((err, nodeVersionInstall) => {
    if (err || !nodeVersionInstall) {
      console.error('Failed to load node-version-install:', err?.message || 'Module not available');
      console.error('Make sure node-version-install is installed: npm install node-version-install');
      exit(1);
      return;
    }

    const versionsPath = path.join(storagePath, 'installed');

    nodeVersionInstall(
      version,
      {
        installPath: versionsPath,
      },
      (installErr?: Error, results?: { version: string; installPath: string }[]) => {
        if (installErr) {
          console.error(`Failed to install Node ${version}:`, installErr.message);
          exit(1);
          return;
        }

        if (results && results.length > 0) {
          const result = results[0];
          console.log(`Successfully installed Node ${result.version}`);
          console.log(`Location: ${result.installPath}`);
        } else {
          console.log(`Node ${version} installed successfully.`);
        }
        exit(0);
      }
    );
  });
}
