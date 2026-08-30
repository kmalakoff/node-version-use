const assert = require('assert');
const nodeVersionUse = require('node-version-use');

describe('exports .cjs', () => {
  it('default', () => {
    assert.equal(typeof nodeVersionUse, 'function');
  });
});
