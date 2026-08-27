declare module "heic-decode" {
  type HeicDecodedImage = {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  };

  export default function decode(input: { buffer: Buffer | Uint8Array }): Promise<HeicDecodedImage>;
}
