// https://github.com/yarnpkg/berry/blob/2cf0a8fe3e4d4bd7d4d344245d24a85a45d4c5c9/packages/yarnpkg-pnp/sources/loader/applyPatch.ts#L414-L435
const originalEmit = process.emit;
process.emit = (name, data) => {
  if (name === 'warning' && typeof data === 'object' && data.name === 'ExperimentalWarning' && (data.message.indexOf('--experimental-loader') >= 0 || data.message.indexOf('Custom ESM Loaders is an experimental feature') >= 0)) return false;
  // biome-ignore lint/style/noArguments: <explanation>
  return originalEmit.apply(process, arguments);
};
