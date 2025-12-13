const fs = require('fs');
const path = require('path');

// Validation function to check if npm extraction is complete
function validateNpmExtraction(extractPath) {
  console.log(`\n=== Validating npm extraction in ${extractPath} ===`);

  // Check for critical npm files
  const packageJsonPath = path.join(extractPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('✗ npm package.json NOT FOUND');

    // Debug: Show what's in the extractPath
    console.log('Contents of extract path:');
    if (fs.existsSync(extractPath)) {
      const files = fs.readdirSync(extractPath);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    }

    return false;
  }
  console.log('✓ npm package.json exists');

  // Check for the problematic minimatch file
  const minimatchPath = path.join(extractPath, 'node_modules', '@tufjs', 'models', 'node_modules', 'minimatch', 'dist', 'commonjs', 'index.js');
  if (!fs.existsSync(minimatchPath)) {
    console.error('✗ minimatch index.js NOT FOUND');

    // Debug: Show what's in the directories
    const tufjsDir = path.join(extractPath, 'node_modules', '@tufjs');
    if (fs.existsSync(tufjsDir)) {
      console.log('Contents of @tufjs directory:');
      const files = fs.readdirSync(tufjsDir);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    }

    const modelsDir = path.join(extractPath, 'node_modules', '@tufjs', 'models');
    if (fs.existsSync(modelsDir)) {
      console.log('Contents of @tufjs/models directory:');
      const files = fs.readdirSync(modelsDir);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    }

    const modelsNodeModules = path.join(extractPath, 'node_modules', '@tufjs', 'models', 'node_modules');
    if (fs.existsSync(modelsNodeModules)) {
      console.log('Contents of @tufjs/models/node_modules:');
      const files = fs.readdirSync(modelsNodeModules);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    } else {
      console.log('@tufjs/models/node_modules directory does not exist');

      // Check if @tufjs/models exists at all
      const modelsDirAlt = path.join(extractPath, 'node_modules', '@tufjs', 'models');
      if (fs.existsSync(modelsDirAlt)) {
        console.log('@tufjs/models exists, checking its contents:');
        const files = fs.readdirSync(modelsDirAlt);
        for (const file of files) {
          console.log(`  ${file}`);
        }
      }
    }

    return false;
  }

  console.log('✓ minimatch index.js exists');
  console.log('SUCCESS: npm extraction is complete and valid!');
  return true;
}

// Validation function to check if Node.js extraction is complete
function validateNodeExtraction(extractPath) {
  console.log(`\n=== Validating Node.js extraction in ${extractPath} ===`);

  // Check for node executable
  const nodePath = path.join(extractPath, 'bin', 'node');
  if (!fs.existsSync(nodePath)) {
    console.error('✗ node executable NOT FOUND');
    return false;
  }
  console.log('✓ node executable exists');

  // Check for npm directory
  const npmPath = path.join(extractPath, 'lib', 'node_modules', 'npm');
  if (!fs.existsSync(npmPath)) {
    console.error('✗ npm directory NOT FOUND');
    return false;
  }
  console.log('✓ npm directory exists');

  // Check for npm-cli.js
  const npmCliPath = path.join(npmPath, 'bin', 'npm-cli.js');
  if (!fs.existsSync(npmCliPath)) {
    console.error('✗ npm-cli.js NOT FOUND');
    return false;
  }
  console.log('✓ npm-cli.js exists');

  console.log('SUCCESS: Node.js extraction is complete!');
  return true;
}

module.exports = {
  validateNpmExtraction,
  validateNodeExtraction,
};
