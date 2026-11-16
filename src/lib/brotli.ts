import { decompress } from 'brotli/decompress';
import { strFromU8 } from 'fflate';

/** Hermes has neither native Brotli nor WebAssembly, so pages are inflated with a pure-JS decoder (~30 ms per page). */
export const brotliDecode = (data: Uint8Array): Uint8Array => decompress(data);

/** Turns the bytes of a `NNN.svg.br` file into SVG text. */
export const svgFromBr = (data: Uint8Array): string => strFromU8(brotliDecode(data));
