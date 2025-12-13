const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const { validateNodeExtraction } = require('./test-extraction-utils.cjs');

// Test Node.js extraction using fast-extract
async function testNodeFastExtract() {
  console.log('Testing Node.js extraction using fast-extract...');

  const nodeVersion = 'v24.12.0';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platform = 'linux';
  const baseUrl = 'https://nodejs.org/dist';
  const fileName = `node-${nodeVersion}-${platform}-${arch}.tar.xz`;
  const downloadUrl = `${baseUrl}/${nodeVersion}/${fileName}`;
  const tempDir = path.join(os.tmpdir(), 'node-fast-extract-test');
  const downloadPath = path.join(tempDir, fileName);
  const extractPath = path.join(tempDir, 'extracted');

  // Create temp directory
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`Created temp directory: ${tempDir}`);

  try {
    // Download Node.js
    console.log(`Downloading Node.js ${nodeVersion}...`);
    const curl = spawn('curl', ['-L', '-o', downloadPath, downloadUrl]);

    curl.stdout.on('data', (_data) => {
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

    // Install fast-extract if needed
    console.log('Ensuring fast-extract is installed...');
    const npmInstall = spawn('npm', ['install', 'fast-extract'], { stdio: 'inherit' });

    await new Promise((resolve, reject) => {
      npmInstall.on('close', (code) => {
        if (code === 0) {
          console.log('fast-extract ready');
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });

    // Extract Node.js using fast-extract
    console.log(`Extracting Node.js with fast-extract to: ${extractPath}`);
    fs.mkdirSync(extractPath, { recursive: true });

    const fastExtract = require('fast-extract');
    await new Promise((resolve, reject) => {
      fastExtract(downloadPath, extractPath, {}, (err) => {
        if (err) {
          reject(new Error(`Fast-extract failed: ${err.message}`));
        } else {
          console.log('Fast-extract completed successfully');
          resolve();
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
  testNodeFastExtract()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed with exception:', error);
      process.exit(1);
    });
}

module.exports = { testNodeFastExtract };
