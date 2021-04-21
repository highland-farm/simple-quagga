import { BarcodeScanner, ReaderType, CodeValidatorCallback} from './barcode-scanner'
import { QuaggaJSStyle } from '@ericblade/quagga2';

/** Helper to build a barcode scanner with various configuration options */
export class BarcodeScannerBuilder {
    private readonly _domTarget: HTMLElement | string;
    private readonly _readerTypes: Array<ReaderType> = [];
    private _autoCss: boolean = false;
    private _codeValidator?: CodeValidatorCallback;
    private _drawLocatedStyle?: QuaggaJSStyle;
    private _drawDetectedStyle?: QuaggaJSStyle;
    private _drawScanlineStyle?: QuaggaJSStyle;

    /** @param domTarget Element reference or CSS selector of div for attaching video & overlay viewport. */
    constructor(domTarget: HTMLElement | string) {
        this._domTarget = domTarget;
    }

    /**
     * Add a barcode type to be detected. If more than one matches a scan the first added will be picked.
     * @param readerType Barcode type.
     * @returns Self for chaining builder methods.
     */
    addReader(readerType: ReaderType): BarcodeScannerBuilder {
        this._readerTypes.push(readerType);
        return this;
    }

    /**
     * Configure auto CSS to insert stylesheet rules that position the drawing overlay correctly over the video and autoscale both to parent container.
     * Viewport div is required to have a CSS id.
     * @param enabled Enable auto CSS functionality.
     * @returns Self for chaining builder methods.
     */
    withAutoCss(enabled: boolean = true): BarcodeScannerBuilder {
        this._autoCss = enabled;
        return this;
    }

    /**
     * Configure custom validator for detected codes. If set, will be called to verify a code is valid before accepting a scan.
     * @param callback Callback method for code validation.
     * @returns Self for chaining methods.
     */
    withCodeValidator(callback: CodeValidatorCallback): BarcodeScannerBuilder {
        this._codeValidator = callback;
        return this;
    }

    /**
     * Configure functionality to draw boxes around potential code locations in the video frame.
     * @param enabled Enable draw located functionality.
     * @param color Color of box outline.
     * @param width Width of box outline.
     * @returns Self for chaining methods.
     */
    withDrawLocated(enabled: boolean = true, color: string = 'green', width: number = 2): BarcodeScannerBuilder {
        if (enabled) {
            this._drawLocatedStyle = { color, lineWidth: width };
        }
        return this;
    }

    /**
     * Configure functionality to draw a box around full code when detected (and validated if configured).
     * @param enabled Enable draw detected functionality.
     * @param color Color of box outline.
     * @param width Width of box outline.
     * @returns Self for chaining methods.
     */
    withDrawDetected(enabled: boolean = true, color: string = '#00F', width: number = 2): BarcodeScannerBuilder {
        if (enabled) {
            this._drawDetectedStyle = { color, lineWidth: width };
        }
        return this;
    }

    /**
     * Configure functionality to draw a 1D scanline to indicate where the detected code was read.
     * @param enabled Enable draw scan line functionality.
     * @param color Color of scan line.
     * @param width Width of scan line.
     * @returns Self for chaining methods.
     */
    withDrawScanline(enabled: boolean = true, color: string = 'red', width: number = 3): BarcodeScannerBuilder {
        if (enabled) {
            this._drawScanlineStyle = { color, lineWidth: width };
        }
        return this;
    }

    /** Build BarcodeScanner after specifying all options. */
    build() {
        // default to CODE_128 if none provided
        if (this._readerTypes.length === 0) {
            this._readerTypes.push(ReaderType.CODE_128);
        }

        return new BarcodeScanner(this);
    }

    // getters for BarcodeScanner to use when initializing

    get domTarget() {
        return this._domTarget;
    }

    get readerTypes() {
        return this._readerTypes;
    }

    get autoCss() {
        return this._autoCss;
    }

    get codeValidator() {
        return this._codeValidator;
    }

    get drawLocatedStyle() {
        return this._drawLocatedStyle;
    }

    get drawDetectedStyle() {
        return this._drawDetectedStyle;
    }

    get drawScanlineStyle() {
        return this._drawScanlineStyle;
    }
}