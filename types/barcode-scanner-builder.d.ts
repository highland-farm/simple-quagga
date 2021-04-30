import { BarcodeScanner, ReaderType, CodeValidatorCallback } from './barcode-scanner';
import type { QuaggaJSStyle } from '@ericblade/quagga2';
/** Helper to build a barcode scanner with various configuration options */
export declare class BarcodeScannerBuilder {
    private readonly _domTarget;
    private readonly _readerTypes;
    private _autoCss;
    private _codeValidator?;
    private _drawLocatedStyle?;
    private _drawDetectedStyle?;
    private _drawScanlineStyle?;
    /** @param domTarget Element reference or CSS selector of div for attaching video & overlay viewport. */
    constructor(domTarget: HTMLElement | string);
    /**
     * Add a barcode type to be detected. If more than one matches a scan the first added will be picked.
     * @param readerType Barcode type.
     * @returns Self for chaining builder methods.
     */
    addReader(readerType: ReaderType): BarcodeScannerBuilder;
    /**
     * Configure auto CSS to insert stylesheet rules that position the drawing overlay correctly over the video and autoscale both to parent container.
     * Viewport div is required to have a CSS id.
     * @param enabled Enable auto CSS functionality.
     * @returns Self for chaining builder methods.
     */
    withAutoCss(enabled?: boolean): BarcodeScannerBuilder;
    /**
     * Configure custom validator for detected codes. If set, will be called to verify a code is valid before accepting a scan.
     * @param callback Callback method for code validation.
     * @returns Self for chaining methods.
     */
    withCodeValidator(callback: CodeValidatorCallback): BarcodeScannerBuilder;
    /**
     * Configure functionality to draw boxes around potential code locations in the video frame.
     * @param enabled Enable draw located functionality.
     * @param color Color of box outline.
     * @param width Width of box outline.
     * @returns Self for chaining methods.
     */
    withDrawLocated(enabled?: boolean, color?: string, width?: number): BarcodeScannerBuilder;
    /**
     * Configure functionality to draw a box around full code when detected (and validated if configured).
     * @param enabled Enable draw detected functionality.
     * @param color Color of box outline.
     * @param width Width of box outline.
     * @returns Self for chaining methods.
     */
    withDrawDetected(enabled?: boolean, color?: string, width?: number): BarcodeScannerBuilder;
    /**
     * Configure functionality to draw a 1D scanline to indicate where the detected code was read.
     * @param enabled Enable draw scan line functionality.
     * @param color Color of scan line.
     * @param width Width of scan line.
     * @returns Self for chaining methods.
     */
    withDrawScanline(enabled?: boolean, color?: string, width?: number): BarcodeScannerBuilder;
    /** Build BarcodeScanner after specifying all options. */
    build(): BarcodeScanner;
    get domTarget(): HTMLElement | string;
    get readerTypes(): ReaderType[];
    get autoCss(): boolean;
    get codeValidator(): CodeValidatorCallback | undefined;
    get drawLocatedStyle(): QuaggaJSStyle | undefined;
    get drawDetectedStyle(): QuaggaJSStyle | undefined;
    get drawScanlineStyle(): QuaggaJSStyle | undefined;
}
