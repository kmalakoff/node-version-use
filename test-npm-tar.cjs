const fs = require('fs');
const _path = require('path');
const { spawn } = require('child_process');
const { validateNpmExtraction } = require('./test-extraction-utils.cjs');

// Test npm extraction using tar command
async function testNpmTar() {
  console.log('Testing npm extraction using tar command...');

  const npmVersion = '11.6.2';
  const downloadUrl = `https://registry.npmjs.org/npm/-/npm-${npmVersion}.tgz`;
  const fileName = `npm-${npmVersion}.tgz`;
  const extractPath = './npm-tar-test';

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

    // Extract using tar command
    console.log(`Extracting npm with tar to: ${extractPath}`);
    fs.mkdirSync(extractPath, { recursive: true });

    const tar = spawn('tar', ['-xf', fileName, '-C', extractPath, '--strip-components=1']);

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
    const isValid = validateNpmExtraction(extractPath, 'linux');

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
  testNpmTar()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed with exception:', error);
      process.exit(1);
    });
}

module.exports = { testNpmTar };
