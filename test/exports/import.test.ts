import assert from 'assert';
import nodeVersionUse from 'node-version-use';

describe('exports .ts', () => {
  it('default', () => {
    assert.equal(typeof nodeVersionUse, 'function');
  });
});
