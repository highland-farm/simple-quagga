import type { BarcodeScannerBuilder } from './barcode-scanner-builder';
import Quagga from '@ericblade/quagga2';
import type {
  QuaggaJSConfigObject,
  QuaggaJSResultObject,
  QuaggaJSStyle,
} from '@ericblade/quagga2';

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

/** Barcode scan result. */
export interface ScanResult {
  /** String representation of scan result. */
  code: string;

  /** Promise resolving to Blob image of video frame (if configured). */
  image?: Promise<Blob>;

  /** Promise resolving to Blob image of drawing overlay (if configured). */
  overlay?: Promise<Blob>;
}

/** Deferred promise as a signal between quagga callback and scanCode. */
interface DeferredScanPromise {
  reject: (reason: Error) => void;
  resolve: (result: ScanResult) => void;
}

/** Barcode scanner with sane defaults and lightweight interface, built on quagga2. */
export class BarcodeScanner {
  // configuration options from builder helper
  private readonly autoCss: boolean;
  private readonly resultImages: boolean;
  private readonly resultImagesType?: string;
  private readonly resultImagesQuality?: number;
  private readonly codeValidator?: CodeValidatorCallback;

  // configuration options from builder helper
  private readonly drawLocatedStyle?: QuaggaJSStyle;
  private readonly drawDetectedStyle?: QuaggaJSStyle;
  private readonly drawScanlineStyle?: QuaggaJSStyle;

  /** Viewport DOM reference. */
  private ViewportElement?: HTMLElement;

  /** Quagga and video stream is started or not. */
  private isStarted = false;

  /** Auto CSS stylesheet has been added to document (prevent from adding again on restart). */
  private isAutoCssApplied = false;

  /** Used to signal back to scanCode when there is a result. */
  private scanDeferred?: DeferredScanPromise = undefined;

  /** Default config object with sane defaults. */
  // this works well in limited testing
  // can make more configurable or with alternate defaults if needed
  private readonly quaggaConfig: QuaggaJSConfigObject = {
    inputStream: {
      name: 'live',
      type: 'LiveStream', // stream live from camera device
      constraints: {
        // FIXME: media constraints needs a lot more real world testing
        width: { min: 800, ideal: 1920, max: 1920 },
        height: { min: 600, ideal: 1080, max: 1080 },
        facingMode: 'environment', // rear camera on a phone or tablet
        aspectRatio: { min: 1, max: 2 },
      },
    },
    numOfWorkers: navigator.hardwareConcurrency, // this is ignored for now as web workers are disabled
    locate: true, // locate barcodes within full frame
    frequency: 10, // cap scanning to 10hz
    decoder: {
      multiple: false, // do not decode multiple barcodes in one frame
    },
    locator: {
      halfSample: true,
      patchSize: 'medium',
    },
  };

  /** @param barcodeReaderBuilder Helper to configure barcode scanner. */
  constructor(barcodeReaderBuilder: BarcodeScannerBuilder) {
    // load domTarget and barcode reader into config object
    Object.assign(this.quaggaConfig.inputStream ?? {}, {
      target: barcodeReaderBuilder.domTarget,
    });
    Object.assign(this.quaggaConfig.decoder ?? {}, {
      readers: barcodeReaderBuilder.readerTypes,
    });

    // misc config
    this.autoCss = barcodeReaderBuilder.autoCss;
    this.resultImages = barcodeReaderBuilder.resultImages;
    this.resultImagesType = barcodeReaderBuilder.resultImagesType;
    this.resultImagesQuality = barcodeReaderBuilder.resultImagesQuality;

    // configure callbacks
    this.codeValidator = barcodeReaderBuilder.codeValidator;

    // configure UI overlay settings
    this.drawLocatedStyle = barcodeReaderBuilder.drawLocatedStyle;
    this.drawDetectedStyle = barcodeReaderBuilder.drawDetectedStyle;
    this.drawScanlineStyle = barcodeReaderBuilder.drawScanlineStyle;

    // attempt to attach viewport if available
    // can try again later during start() if async
    try {
      this.attachViewport();
      // eslint-disable-next-line no-empty
    } catch {}
  }

  /**
   * Setup scanner and start camera video stream (without locating or detecting).
   * @returns Promise that resolves after camera video stream is running.
   */
  async start(): Promise<void> {
    // resolve immediately if already started
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;

    try {
      if (!this.ViewportElement) {
        this.attachViewport();
      }

      if (!this.ViewportElement) {
        throw new Error('Cannot start with an undefined viewport target');
      }

      // insert CSS rules if requested
      if (this.autoCss && !this.isAutoCssApplied) {
        // create new stylesheet and insert into head
        const style = document.createElement('style');
        document.head.appendChild(style);
        if (!style.sheet) {
          throw new Error('Cannot create dynamic CSS stylesheet');
        }

        // this positions the drawing overlay correctly over the video and autoscales both to parent container
        const selector = `#${this.ViewportElement.id}`;
        style.sheet.insertRule(`${selector} {display: flex}`);
        style.sheet.insertRule(`${selector} canvas, video {width: 100%}`);
        style.sheet.insertRule(
          `${selector} canvas.drawingBuffer, video.drawingBuffer {margin-left: -100%}`
        );

        this.isAutoCssApplied = true;
      }

      // initialize Quagga and begin video streaming
      await Quagga.init(this.quaggaConfig);

      // set up frame processed callback; no need to hook onDetected as we can do it all in this callback
      Quagga.onProcessed(this.onQuaggaProcessed.bind(this));
    } catch (err) {
      // reset back to not started if any error
      this.isStarted = false;
      throw err;
    }
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

    // signal that scanner is stopping to any pending scanCode request
    if (this.scanDeferred) {
      this.scanDeferred.reject(new Error('Scanner received stop command'));
    }

    // stop video collection
    await Quagga.stop();
    this.isStarted = false;
  }

  /**
   * Hide the viewport by setting style.display = none.
   */
  hide(): void {
    if (this.ViewportElement) {
      this.ViewportElement.style.display = 'none';
    }
  }

  /**
   * Show the viewport by setting style.display = block.
   */
  show(): void {
    if (this.ViewportElement) {
      this.ViewportElement.style.display = 'block';
    }
  }

  /**
   * Request a barcode scan. Scanner must be started (video is streaming).
   * @returns Promise that resolves with ScanResult when it is detected (and validated if configured).
   */
  async scanCode(): Promise<ScanResult> {
    if (!this.isStarted) {
      throw new Error('Scanner not started');
    }

    if (this.scanDeferred) {
      throw new Error('Already scanning for code');
    }

    // resume locating & detecting
    this.resume();

    try {
      // get result via deferred promise (resolved in quagga callback)
      return await new Promise<ScanResult>(
        (resolve, reject) => (this.scanDeferred = { resolve, reject })
      );
    } finally {
      // reset so another barcode scan can be requested
      this.scanDeferred = undefined;

      // clear detection overlay after 200ms delay (enough time to display overlays to user)
      setTimeout(() => {
        if (!this.scanDeferred) {
          this.clearOverlay();
        }
      }, 200);
    }
  }

  /** Attempt to attach to the viewport element. */
  private attachViewport(): void {
    const domTarget = this.quaggaConfig.inputStream?.target;
    if (!domTarget) {
      throw new Error('Viewport target is undefined');
    }

    // NOTE: this requires a direct supplied element to have an id
    const selector =
      domTarget instanceof HTMLElement ? '#' + domTarget.id : String(domTarget);

    // verify dom target is accessible
    try {
      const elem = document.querySelector(selector);
      if (!elem || !(elem instanceof HTMLElement)) {
        throw new Error(`Cannot find element at selector: ${selector}`);
      }

      this.ViewportElement = elem;
    } catch (err) {
      throw new Error(`Invalid selector: ${selector}`);
    }
  }

  /** Resume barcode location & detection (video stream must be started). */
  private resume(): void {
    Quagga.start();
  }

  /** Pause barcode location & detection (video stream must be started). */
  private pause(): void {
    Quagga.pause();
  }

  /**
   * Wrap HTMLCanvasElement.toBlob() callback with a Promise.
   * @param canvas Canvas with image to capture.
   * @param imageType Image format passed to HTMLCanvasElement.toBlob().
   * @param imageQuality Compression quality passed to HTMLCanvasElement.toBlob().
   * @returns Promise that will be resolved after Blob is created.
   */
  private getCanvasBlobPromise(
    canvas: HTMLCanvasElement,
    imageType?: string,
    imageQuality?: number
  ): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject();
          }
        },
        imageType,
        imageQuality
      )
    );
  }

  /**
   * Quagga callback on each video frame that was processed while scanning is enabled.
   * @param result Scan result of single video frame from Quagga.
   */
  private onQuaggaProcessed(result: QuaggaJSResultObject): void {
    // return early if no scan request or no result on this frame
    if (!this.scanDeferred || !result) {
      return;
    }

    // clear detection overlay canvas
    this.clearOverlay();

    // draw located boxes if configured
    if (this.drawLocatedStyle) {
      this.drawLocated(result);
    }

    // FIXME: improve and/or make the basic quality checks for scanned codes customizable
    // the accuracy of this basic technique is not great if a custom validator cannot be used
    if (
      result.codeResult &&
      result.codeResult.code &&
      result.codeResult.startInfo.error < 0.12
    ) {
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

      const scanResult: ScanResult = {
        code: result.codeResult.code,
        image: this.resultImages
          ? this.getCanvasBlobPromise(
              Quagga.canvas.dom.image,
              this.resultImagesType,
              this.resultImagesQuality
            )
          : undefined,
        overlay: this.resultImages
          ? this.getCanvasBlobPromise(Quagga.canvas.dom.overlay, 'image/png')
          : undefined,
      };

      // set last result for waiting scanCode() to pick up and stop scanning
      this.scanDeferred.resolve(scanResult);
      this.pause();
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
    this.overlayContext.clearRect(
      0,
      0,
      parseInt(this.overlayCanvas.getAttribute('width') ?? '0'),
      parseInt(this.overlayCanvas.getAttribute('height') ?? '0')
    );
  }

  /**
   * Draw boxes around potential code locations in the video frame.
   * @param result Scan result of single video frame from Quagga.
   */
  private drawLocated(result: QuaggaJSResultObject): void {
    if (result.boxes && this.drawLocatedStyle) {
      // Draw (green) box outline around potential positives
      result.boxes.forEach((box) => {
        if (box !== result.box) {
          Quagga.ImageDebug.drawPath(
            box,
            { x: 0, y: 1 },
            this.overlayContext,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.drawLocatedStyle!
          );
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
      Quagga.ImageDebug.drawPath(
        result.box,
        { x: 0, y: 1 },
        this.overlayContext,
        this.drawDetectedStyle
      );
    }
  }

  /**
   * Draw a 1D scanline to indicate where the detected code was read.
   * @param result Scan result of single video frame from Quagga.
   */
  private drawScanline(result: QuaggaJSResultObject): void {
    if (result.codeResult && result.codeResult.code && this.drawScanlineStyle) {
      Quagga.ImageDebug.drawPath(
        result.line,
        { x: 'x', y: 'y' },
        this.overlayContext,
        this.drawScanlineStyle
      );
    }
  }
}
