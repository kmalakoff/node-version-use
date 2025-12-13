const fs = require('fs');
const _path = require('path');
const { spawn } = require('child_process');
const { validateNpmExtraction } = require('./test-extraction-utils.cjs');

// Test npm extraction using fast-extract
async function testNpmFastExtract() {
  console.log('Testing npm extraction using fast-extract...');

  const npmVersion = '11.6.2';
  const downloadUrl = `https://registry.npmjs.org/npm/-/npm-${npmVersion}.tgz`;
  const fileName = `npm-${npmVersion}.tgz`;
  const extractPath = './npm-fast-extract-test';

  try {
    // Download npm tgz
    console.log(`Downloading npm ${npmVersion}...`);
    const curl = spawn('curl', ['-L', '-o', fileName, downloadUrl]);

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

    // Extract using fast-extract
    console.log(`Extracting npm with fast-extract to: ${extractPath}`);
    fs.mkdirSync(extractPath, { recursive: true });

    const fastExtract = require('fast-extract');
    await new Promise((resolve, reject) => {
      fastExtract(fileName, extractPath, { strip: 1 }, (err) => {
        if (err) {
          reject(new Error(`Fast-extract failed: ${err.message}`));
        } else {
          console.log('Fast-extract completed successfully');
          resolve();
        }
      });
    });

    // Validate extraction
    const isValid = validateNpmExtraction(extractPath);

    return isValid;
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  } finally {
    // Cleanup
    console.log('\nCleaning up...');
    try {
      if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
      }
      if (fs.existsSync(extractPath)) {
        require('child_process').execSync(`rm -rf ${extractPath}`, { stdio: 'inherit' });
      }
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError.message);
    }
  }
}

// Run the test if executed directly
if (require.main === module) {
  testNpmFastExtract()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed with exception:', error);
      process.exit(1);
    });
}

module.exports = { testNpmFastExtract };
