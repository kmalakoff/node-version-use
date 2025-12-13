const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const { validateNodeExtraction } = require('./test-extraction-utils.cjs');

// Test Node.js extraction using tar command
async function testNodeTar() {
  console.log('Testing Node.js extraction using tar command...');

  const nodeVersion = 'v24.12.0';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platform = 'linux';
  const baseUrl = 'https://nodejs.org/dist';
  const fileName = `node-${nodeVersion}-${platform}-${arch}.tar.xz`;
  const downloadUrl = `${baseUrl}/${nodeVersion}/${fileName}`;
  const tempDir = path.join(os.tmpdir(), 'node-tar-test');
  const downloadPath = path.join(tempDir, fileName);
  const extractPath = path.join(tempDir, 'extracted');

  // Create temp directory
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`Created temp directory: ${tempDir}`);

  try {
    // Download Node.js
    console.log(`Downloading Node.js ${nodeVersion}...`);
    const curl = spawn('curl', ['-L', '-o', downloadPath, downloadUrl]);

    curl.stdout.on('data', (data) => {
      process.stdout.write('.');
    });

    await new Promise((resolve, reject) => {
      curl.on('close', (code) => {
        if (code === 0) {
          console.log('\nDownload completed successfully');
          resolve();
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });
    });

    // Extract Node.js using tar command
    console.log(`Extracting Node.js with tar to: ${extractPath}`);
    fs.mkdirSync(extractPath, { recursive: true });

    const tar = spawn('tar', ['-xf', downloadPath, '-C', extractPath]);

    await new Promise((resolve, reject) => {
      tar.on('close', (code) => {
        if (code === 0) {
          console.log('Tar extraction completed successfully');
          resolve();
        } else {
          reject(new Error(`Tar extraction failed with code ${code}`));
        }
      });
    });

    // Validate extraction
    const extractedDir = path.join(extractPath, `node-${nodeVersion}-${platform}-${arch}`);
    const isValid = validateNodeExtraction(extractedDir);

    return isValid;

  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  } finally {
    // Cleanup
    console.log('\nCleaning up...');
    try {
      if (fs.existsSync(tempDir)) {
        require('child_process').execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' });
      }
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError.message);
    }
  }
}

// Run the test if executed directly
if (require.main === module) {
  testNodeTar().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test failed with exception:', error);
    process.exit(1);
  });
}

module.exports = { testNodeTar };