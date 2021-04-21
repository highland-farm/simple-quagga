import { BarcodeScannerBuilder } from './barcode-scanner-builder';
import Quagga from '@ericblade/quagga2';
import { QuaggaJSConfigObject, QuaggaJSResultObject, QuaggaJSStyle } from '@ericblade/quagga2';

/** Barcode type. Additional config for specialized types not supported. */
export enum ReaderType {
    CODE_128 = 'code_128_reader',
    EAN = 'ean_reader',
    EAN_8 = 'ean_8_reader',
    CODE_39 = 'code_39_reader',
    CODE_39_VIN = 'code_39_vin_reader',
    CODEABAR = 'codabar_reader',
    UPC = 'upc_reader',
    UPC_E = 'upc_e_reader',
    CODE_I2OF5 = 'i2of5_reader',
    CODE_2OF5 = '2of5_reader',
    CODE_93 = 'code_93_reader',
    CODE_32 = 'code_32_reader',
}

/** Custom validator callback for barcodes. */
export interface CodeValidatorCallback {
    (code: string): boolean;
}

/** Barcode scanner with sane defaults and lightweight interface, built on quagga2. */
export class BarcodeScanner {
    // configuration options from builder helper
    private readonly autoCss: boolean;
    private readonly codeValidator?: CodeValidatorCallback;

    // configuration options from builder helper
    private readonly drawLocatedStyle?: QuaggaJSStyle;
    private readonly drawDetectedStyle?: QuaggaJSStyle;
    private readonly drawScanlineStyle?: QuaggaJSStyle;

    /** Quagga and video stream is started or not. */
    private isStarted: boolean = false;

    /** Code scanning (location/detection) is started or not. */
    private isScanning: boolean = false;

    /** Auto CSS stylesheet has been added to document (prevent from adding again on restart). */
    private isAutoCssApplied: boolean = false;

    /** Number of scanCode() promises outstanding (callers waiting for a code scan). */
    private numWaiting: number = 0;

    /** Unclaimed code scan result (a waiting scanCode() caller will pick it up). */
    private lastResult?: QuaggaJSResultObject;

    /** Default config object with sane defaults. */
    // this works well in limited testing
    // can make more configurable or with alternate defaults if needed
    private readonly quaggaConfig: QuaggaJSConfigObject = {
        inputStream: {
            name: 'live',
            type: 'LiveStream',                         // stream live from camera device
            constraints: {                              // FIXME: media constraints needs a lot more real world testing
                width: {min: 800},                      //        and possibly configurability or detection logic;
                height: {min: 600},                     //        this usually will select the max resolution
                facingMode: 'environment',              // rear camera on a phone or tablet
                aspectRatio: {min: 1, max: 2},
            },
        },
        numOfWorkers: navigator.hardwareConcurrency,    // this is ignored for now as web workers are disabled
        locate: true,                                   // locate barcodes within full frame
        frequency: 10,                                  // cap scanning to 10hz
        decoder: {
            multiple: false,                            // do not decode multiple barcodes in one frame
        },
        locator: {
            halfSample: true,
            patchSize: 'medium',
        },
    }

    /** @param barcodeReaderBuilder Helper to configure barcode scanner. */
    constructor(barcodeReaderBuilder: BarcodeScannerBuilder) {
        // load domTarget and barcode reader into config object
        Object.assign(this.quaggaConfig.inputStream ?? {}, {target: barcodeReaderBuilder.domTarget});
        Object.assign(this.quaggaConfig.decoder ?? {}, {readers: barcodeReaderBuilder.readerTypes});

        // misc config
        this.autoCss = barcodeReaderBuilder.autoCss;

        // configure callbacks
        this.codeValidator = barcodeReaderBuilder.codeValidator;

        // configure UI overlay settings
        this.drawLocatedStyle = barcodeReaderBuilder.drawLocatedStyle;
        this.drawDetectedStyle = barcodeReaderBuilder.drawDetectedStyle;
        this.drawScanlineStyle = barcodeReaderBuilder.drawScanlineStyle;
    }

    /**
     * Setup scanner and start camera video stream (without locating or detecting).
     * @returns Promise that resolves after camera video stream is running.
     */
    async start(): Promise<void> {
        // resolve immediately if already started
        if (this.isStarted)
            return;

        // insert CSS rules if requested
        if (this.autoCss && !this.isAutoCssApplied) {
            let domTarget = this.quaggaConfig.inputStream?.target;
            if (!domTarget) {
                throw new Error('Cannot apply auto CSS to undefined target');
            }

            // NOTE: this requires a direct supplied element to have an id
            let selector = domTarget instanceof HTMLElement ? '#' + domTarget.id : String(domTarget);

            // verify dom target is accessible
            try {
                if (!document.querySelector(selector)) {
                    throw new Error(`Cannot find element at selector: ${selector}`);
                }
            } catch (err) {
                throw new Error(`Invalid selector: ${selector}`);
            }

            // create new stylesheet and insert into head
            var style = document.createElement('style');
            document.head.appendChild(style);
            if (!style.sheet) {
                throw new Error('Cannot create dynamic CSS stylesheet');
            }

            // this positions the drawing overlay correctly over the video and autoscales both to parent container
            style.sheet.insertRule(`${selector} {display: flex}`);
            style.sheet.insertRule(`${selector} canvas, video {width: 100%}`);
            style.sheet.insertRule(`${selector} canvas.drawingBuffer, video.drawingBuffer {margin-left: -100%}`);

            this.isAutoCssApplied = true;
        }

        // initialize Quagga and begin video streaming
        await Quagga.init(this.quaggaConfig);

        // set up frame processed callback; no need to hook onDetected as we can do it all in this callback
        Quagga.onProcessed(this.onQuaggaProcessed.bind(this));

        this.isStarted = true;
        this.isScanning = false;
    }

    /**
     * Stop camera video stream (can be restarted).
     * @returns Promise that resolves after camera video stream is stopped.
     */
    async stop(): Promise<void> {
        // resolve immediately if already stopped
        if (!this.isStarted) {
            return;
        }

        // remove code handler callback
        Quagga.offProcessed();
        this.isStarted = false;
        this.isScanning = false;
        this.numWaiting = 0;
        this.lastResult = undefined;

        // stop video collection
        await Quagga.stop();
    }

    /**
     * Request a barcode scan. Scanner must be started (video is streaming).
     * @returns Promise that resolves with barcode value when it is detected (and validated if configured).
     */
    async scanCode() : Promise<string> {
        if (!this.isStarted) {
            throw new Error("Scanner not started");
        }

        // resume scanning
        this.numWaiting++;
        this.resume();

        // wait for next detected barcode result, checking every 100ms
        while (!this.lastResult && this.isStarted) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // video was stopped while waiting for a barcode
        if (!this.isStarted) {
            this.numWaiting--;
            throw new Error("Scanner received stop command");
        }

        // claim and reset the internal result
        let result = this.lastResult;
        this.lastResult = undefined;
        this.numWaiting--;

        // should never happen unless JS magically gets threads
        if (!result || !result.codeResult || !result.codeResult.code) {
            throw new Error("Internal scanner error");
        }

        // resolve with scanned barcode value
        return result.codeResult.code;
    }

    /** Resume barcode location & detection (video stream must be started). */
    private resume(): void {
        // only resume if started and not scanning
        if (this.isStarted && !this.isScanning) {
            Quagga.start();
            this.isScanning = true;
        }
    }

    /** Pause barcode location & detection (video stream must be started). */
    private pause(): void {
        // only pause if started and scanning
        if (this.isStarted && this.isScanning) {
            Quagga.pause();
            this.isScanning = false;
        }
    }

    /**
     * Quagga callback on each video frame that was processed while scanning is enabled.
     * @param result Scan result of single video frame from Quagga.
     */
    private onQuaggaProcessed(result: QuaggaJSResultObject): void {
        if (this.numWaiting === 0) {
            // if nobody is waiting for a result, stop detection and clear internal result
            this.pause();
            this.clearOverlay();
            this.lastResult = undefined;
            return;
        } else if (this.lastResult) {
            // waiting for someone to claim result
            // do not pause scanning, but do not replace result either.
            return;
        }

        // clear detection overlay canvas
        this.clearOverlay();

        // return early if no result on this frame
        if (!result) {
            return;
        }

        // draw located boxes if configured
        if (this.drawLocatedStyle) {
            this.drawLocated(result);
        }

        // FIXME: improve and/or make the basic quality checks for scanned codes customizable
        // the accuracy of this basic technique is not great if a custom validator cannot be used
        if (result.codeResult && result.codeResult.code && result.codeResult.startInfo.error < 0.12) {
            // abort if custom code validator returns false
            if (this.codeValidator && !this.codeValidator(result.codeResult.code)) {
                return;
            }

            // draw detected box if configured
            if (this.drawDetectedStyle) {
                this.drawDetected(result);
            }

            // draw scanline if configured
            if (this.drawScanlineStyle) {
                this.drawScanline(result);
            }

            // set last result for waiting scanCode() to pick up
            this.lastResult = result;
        }
    }

    /** Quagga drawing overlay canvas object handle. */
    private get overlayContext() {
        return Quagga.canvas.ctx.overlay;
    }

    /** Quagga drawing overlay canvas dom handle. */
    private get overlayCanvas() {
        return Quagga.canvas.dom.overlay;
    }

    /** Clear drawing overlay canvas. */
    private clearOverlay(): void {
        this.overlayContext.clearRect(0, 0, parseInt(this.overlayCanvas.getAttribute('width') ?? '0'), parseInt(this.overlayCanvas.getAttribute('height') ?? '0'));
    }

    /**
     * Draw boxes around potential code locations in the video frame.
     * @param result Scan result of single video frame from Quagga.
     */
    private drawLocated(result: QuaggaJSResultObject): void {
        if (result.boxes && this.drawLocatedStyle) {
            // Draw (green) box outline around potential positives
            result.boxes.forEach(box => {
                if (box !== result.box) {
                    Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, this.overlayContext, this.drawLocatedStyle!);
                }
            });
        }
    }

    /**
     * Draw a box around full code when detected (and validated if configured).
     * @param result Scan result of single video frame from Quagga.
     */
    private drawDetected(result: QuaggaJSResultObject): void {
        if (result.box && this.drawDetectedStyle) {
            Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, this.overlayContext, this.drawDetectedStyle!);
        }
    }

    /**
     * Draw a 1D scanline to indicate where the detected code was read.
     * @param result Scan result of single video frame from Quagga.
     */
    private drawScanline(result: QuaggaJSResultObject): void {
        if (result.codeResult && result.codeResult.code && this.drawScanlineStyle) {
            Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, this.overlayContext, this.drawScanlineStyle);
        }
    }
}