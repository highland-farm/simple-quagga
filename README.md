# Simple Quagga Barcode Scanner

Barcode scanner with sane defaults and lightweight interface, built on quagga2. WIP on private repo for now.

To run/test in browser during development (this is temporary):

1. Make sure browserify is installed as a global npm package
1. Make sure python3 is installed (simple web server)
1. Run ```npm run build``` to run ```tsc``` (compile TypeScript) and ```browserify``` (standalone bundle) to ```dist/bundle.js``` testing output
1. Run ```npm run server``` to start python's basic built in webserver (yes there are better JS options I'm sure)
1. Navigate web browser to ```http://localhost:8000/examples/vanilla_simple.html```
1. Shock and awe that it actually sort of works

Todo:

1. Blob handling for passing back captured video frames and overlays
1. Beeeeeeeeeeep. Beep
1. Actually read the TypeScript handbook and fix na&#239;ve or uninformed design choices
1. Eslint and consistent formatting
1. Bundle: Snowpack? Rollup? Just not browserify
1. Something other than python to server for local testing
1. Consume Quagga2 without passing through dependencies to consumers of this wrapper
1. Testing, UTs, etc (you know, maybe... eventually)
1. Make repo public and push alpha version to npmjs
1. Github actions to build, test, and publish

Future:

1. Torch (flashlight) and zoom support for devices that support it
1. Better scan quality checks (code component error thresholds) without custom format validator
1. Check digit validation for code formats that support it
1. Expose more Quagga config options