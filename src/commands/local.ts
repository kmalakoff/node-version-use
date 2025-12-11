import exit from 'exit';
import fs from 'fs';
import path from 'path';

/**
 * nvu local [version] [--nvurc]
 *
 * Write .nvmrc (or .nvurc) to the current directory.
 * This pins the Node version for the current project.
 */
export default function localCmd(args: string[]): void {
  const cwd = process.cwd();

  // Check for --nvurc flag (indexOf for Node 0.8+ compat)
  const useNvurc = args.indexOf('--nvurc') !== -1;
  const filteredArgs = args.filter((arg) => arg !== '--nvurc');

  const fileName = useNvurc ? '.nvurc' : '.nvmrc';
  const filePath = path.join(cwd, fileName);

  // If no version provided, display current local version
  if (filteredArgs.length === 0) {
    // Check for existing version files
    const nvurcPath = path.join(cwd, '.nvurc');
    const nvmrcPath = path.join(cwd, '.nvmrc');

    if (fs.existsSync(nvurcPath)) {
      const version = fs.readFileSync(nvurcPath, 'utf8').trim();
      console.log(`Current local version (.nvurc): ${version}`);
      exit(0);
      return;
    }
    if (fs.existsSync(nvmrcPath)) {
      const version = fs.readFileSync(nvmrcPath, 'utf8').trim();
      console.log(`Current local version (.nvmrc): ${version}`);
      exit(0);
      return;
    }

    console.log('No local version set in this directory.');
    console.log('Usage: nvu local <version>');
    console.log('       nvu local <version> --nvurc  (use .nvurc instead of .nvmrc)');
    exit(0);
    return;
  }

  const version = filteredArgs[0].trim();

  // Validate version format (basic check, indexOf for Node 0.8+ compat)
  if (!version || version.indexOf('-') === 0) {
    console.log('Usage: nvu local <version>');
    console.log('Example: nvu local 20');
    exit(1);
    return;
  }

  // Write the version file
  fs.writeFileSync(filePath, `${version}\n`, 'utf8');
  console.log(`Created ${fileName} with version: ${version}`);
  exit(0);
}
