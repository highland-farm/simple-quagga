const { build } = require('esbuild');
const glob = require('glob');
const { promises: fs } = require('fs');
const path = require('path');
const replace = require('replace-in-file');

const runBuild = async () => {
  // cleanup output dirs
  await rmdirIfExists('./lib');
  await rmdirIfExists('./dist');

  // esm non-bundled lib to be used as a dependency
  await build({
    entryPoints: glob.sync('src/**/*'),
    sourcemap: true,
    outdir: 'lib',
    target: 'esnext',
    platform: 'browser',
    format: 'esm',
  });

  // include pre-bundled quagga lib for convenience
  await build({
    entryPoints: [require.resolve('@ericblade/quagga2')],
    outfile: 'lib/@ericblade/quagga2.js',
    bundle: false,
    target: 'esnext',
    platform: 'browser',
    format: 'cjs',
  });

  // esm bundled for browsers (as a module)
  await build({
    entryPoints: ['src/index.ts'],
    sourcemap: true,
    outfile: 'dist/simple-quagga.esm.js',
    bundle: true,
    minify: false,
    target: 'es2015',
    platform: 'browser',
    format: 'esm',
  });

  // esm bundled & minified for browsers (as a module)
  await build({
    entryPoints: ['src/index.ts'],
    sourcemap: true,
    outfile: 'dist/simple-quagga.esm.min.js',
    bundle: true,
    minify: true,
    target: 'es2015',
    platform: 'browser',
    format: 'esm',
  });

  // iife bundled for browsers (as a script w/global api)
  await build({
    entryPoints: ['src/index.ts'],
    sourcemap: true,
    outfile: 'dist/simple-quagga.iife.js',
    bundle: true,
    minify: false,
    target: 'es2015',
    platform: 'browser',
    format: 'iife',
    globalName: 'SimpleQuagga',
  });

  // iife bundled & minified for browsers (as a script w/global api)
  await build({
    entryPoints: ['src/index.ts'],
    sourcemap: true,
    outfile: 'dist/simple-quagga.iife.min.js',
    bundle: true,
    minify: true,
    target: 'es2015',
    platform: 'browser',
    format: 'iife',
    globalName: 'SimpleQuagga',
  });

  // copy examples
  await copyDir('./examples', './dist/examples');

  // use minified esm for working examples
  await replace({
    files: './dist/examples/*.html',
    from: "'../index.js'",
    to: "'../simple-quagga.esm.js'",
  });
};

const rmdirIfExists = async (dir) => {
  if (
    await fs
      .access(dir)
      .then(() => true)
      .catch(() => false)
  ) {
    await fs.rmdir(dir, { recursive: true });
  }
};

// https://stackoverflow.com/a/64255382/9238041
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  let entries = await fs.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await fs.copyFile(srcPath, destPath);
  }
}

runBuild();
