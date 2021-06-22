
const fs = require('fs');
const path = require('path');

const { toMatchImageSnapshot } = require('jest-image-snapshot');
test('throws invalid number', async () => {
  // eslint-disable-next-line no-undef
  expect(1).toEqual(1);
  expect.extend({ toMatchImageSnapshot });
  
    const imageAtTestPath = path.resolve(__dirname, './stubs', 'image.png');
    // imageAtTest is a PNG encoded image buffer which is what `toMatchImageSnapshot() expects
    const imageAtTest = fs.readFileSync(imageAtTestPath);
  
    expect(imageAtTest).toMatchImageSnapshot();

});
