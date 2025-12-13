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
      files.forEach(file => console.log(`  ${file}`));
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
      files.forEach(file => console.log(`  ${file}`));
    }

    const modelsDir = path.join(extractPath, 'node_modules', '@tufjs', 'models');
    if (fs.existsSync(modelsDir)) {
      console.log('Contents of @tufjs/models directory:');
      const files = fs.readdirSync(modelsDir);
      files.forEach(file => console.log(`  ${file}`));
    }

    const modelsNodeModules = path.join(extractPath, 'node_modules', '@tufjs', 'models', 'node_modules');
    if (fs.existsSync(modelsNodeModules)) {
      console.log('Contents of @tufjs/models/node_modules:');
      const files = fs.readdirSync(modelsNodeModules);
      files.forEach(file => console.log(`  ${file}`));
    } else {
      console.log('@tufjs/models/node_modules directory does not exist');

      // Check if @tufjs/models exists at all
      const modelsDirAlt = path.join(extractPath, 'node_modules', '@tufjs', 'models');
      if (fs.existsSync(modelsDirAlt)) {
        console.log('@tufjs/models exists, checking its contents:');
        const files = fs.readdirSync(modelsDirAlt);
        files.forEach(file => console.log(`  ${file}`));
      }
    }

    return false;
  }

  console.log('✓ minimatch index.js exists');
  console.log('SUCCESS: npm extraction is complete and valid!');
  return true;
}

module.exports = {
  validateNpmExtraction
};