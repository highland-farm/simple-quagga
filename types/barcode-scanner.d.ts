import type { BarcodeScannerBuilder } from './barcode-scanner-builder';
/** Barcode type. Additional config for specialized types not supported. */
export declare enum ReaderType {
    CODE_128 = "code_128_reader",
    EAN = "ean_reader",
    EAN_8 = "ean_8_reader",
    CODE_39 = "code_39_reader",
    CODE_39_VIN = "code_39_vin_reader",
    CODEABAR = "codabar_reader",
    UPC = "upc_reader",
    UPC_E = "upc_e_reader",
    CODE_I2OF5 = "i2of5_reader",
    CODE_2OF5 = "2of5_reader",
    CODE_93 = "code_93_reader",
    CODE_32 = "code_32_reader"
}
/** Custom validator callback for barcodes. */
export interface CodeValidatorCallback {
    (code: string): boolean;
}
/** Barcode scan result. */
export interface ScanResult {
    /** String representation of scan result. */
    code: string;
    /** Promise resolving to Blob image of video frame (if configured). */
    image?: Promise<Blob>;
    /** Promise resolving to Blob image of drawing overlay (if configured). */
    overlay?: Promise<Blob>;
}
/** Barcode scanner with sane defaults and lightweight interface, built on quagga2. */
export declare class BarcodeScanner {
    private readonly autoCss;
    private readonly resultImages;
    private readonly codeValidator?;
    private readonly drawLocatedStyle?;
    private readonly drawDetectedStyle?;
    private readonly drawScanlineStyle?;
    /** Viewport DOM reference. */
    private ViewportElement?;
    /** Quagga and video stream is started or not. */
    private isStarted;
    /** Auto CSS stylesheet has been added to document (prevent from adding again on restart). */
    private isAutoCssApplied;
    /** Used to signal back to scanCode when there is a result. */
    private scanDeferred?;
    /** Default config object with sane defaults. */
    private readonly quaggaConfig;
    /** @param barcodeReaderBuilder Helper to configure barcode scanner. */
    constructor(barcodeReaderBuilder: BarcodeScannerBuilder);
    /**
     * Setup scanner and start camera video stream (without locating or detecting).
     * @returns Promise that resolves after camera video stream is running.
     */
    start(): Promise<void>;
    /**
     * Stop camera video stream (can be restarted).
     * @returns Promise that resolves after camera video stream is stopped.
     */
    stop(): Promise<void>;
    /**
     * Hide the viewport by setting style.display = none.
     */
    hide(): void;
    /**
     * Show the viewport by setting style.display = block.
     */
    show(): void;
    /**
     * Request a barcode scan. Scanner must be started (video is streaming).
     * @returns Promise that resolves with ScanResult when it is detected (and validated if configured).
     */
    scanCode(): Promise<ScanResult>;
    /** Attempt to attach to the viewport element. */
    private attachViewport;
    /** Resume barcode location & detection (video stream must be started). */
    private resume;
    /** Pause barcode location & detection (video stream must be started). */
    private pause;
    /**
     * Wrap HTMLCanvasElement.toBlob() callback with a Promise.
     * @param canvas Canvas with image to capture.
     * @returns Promise that will be resolved after Blob is created.
     */
    private getCanvasBlobPromise;
    /**
     * Quagga callback on each video frame that was processed while scanning is enabled.
     * @param result Scan result of single video frame from Quagga.
     */
    private onQuaggaProcessed;
    /** Quagga drawing overlay canvas object handle. */
    private get overlayContext();
    /** Quagga drawing overlay canvas dom handle. */
    private get overlayCanvas();
    /** Clear drawing overlay canvas. */
    private clearOverlay;
    /**
     * Draw boxes around potential code locations in the video frame.
     * @param result Scan result of single video frame from Quagga.
     */
    private drawLocated;
    /**
     * Draw a box around full code when detected (and validated if configured).
     * @param result Scan result of single video frame from Quagga.
     */
    private drawDetected;
    /**
     * Draw a 1D scanline to indicate where the detected code was read.
     * @param result Scan result of single video frame from Quagga.
     */
    private drawScanline;
}
