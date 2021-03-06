# Simple Quagga Barcode Scanner

Barcode scanner with sane defaults and lightweight interface, built on quagga2. Interfaces are not complete or final, but it is functional. Since quagga2 comes bundled it is included as a devDependency only.

Look in `examples` to see how to use in browser as an iife script or esm module. Can also be used as a dependency when bundling for a lib or app. Uses snowpack for development and esbuild for transpiling/bundling/minifying.

Package folders:

- `/types` : TypeScript definitions
- `/dist` : ESM & IIFE browser bundles
- `/lib` : ESM module unbundled

NPM scripts:

- `npm start` to start snowpack dev server & launch examples in browser w/HMR for development
- `npm run build` to transpile to ./lib, check/write TS type declarations to ./types, & bundle esm/iife w/working examples folder to ./dist
- `npm run lint` to check linting rules; also run as part of build (but not git hooks for now)
- `npm run pretty:check` to check Prettier rules; not run automatically for now
- `npm run pretty` to apply Prettier rules; not run automatically for now

![115135950-49331d80-9fd1-11eb-988b-5705bad3dc14](https://user-images.githubusercontent.com/72341/117096800-ee166000-ad1e-11eb-94ff-b2cd4dec9204.png)

Working on:

1. Actually read the TypeScript handbook and fix na&#239;ve or uninformed design choices

Backlog:

1. Torch (flashlight) and zoom support for devices that support it
1. Beeeeeeeeeeep. Beep
1. Better scan quality checks (code component error thresholds) without custom format validator
1. Decide if builder/options pattern is a good idea for init
1. Testing, UTs, etc (you know, maybe... eventually)
1. Intelligent selection of resolution and other options via MediaDevices.getSupportedConstraints()
1. Camera device selection via MediaDevices.enumerateDevices()
1. Check digit validation for code formats that support it
1. Expose more Quagga config options
1. Github actions to build, test, and publish
1. QR codes (via quagg2-reader-qr or other)
1. Possibly look into fixing Web Workers upstream

Done:

1. ~~Eslint and consistent formatting~~
1. ~~Bundle: Snowpack? Rollup? Just not browserify~~
1. ~~Something other than python to server for local testing~~
1. ~~Consume Quagga2 without passing through dependencies to consumers of this wrapper~~
1. ~~Consider moving TS type declarations to a separate folder~~
1. ~~Blob handling for passing back captured video frames and overlays~~
1. ~~Make repo public and push alpha version to npmjs~~
