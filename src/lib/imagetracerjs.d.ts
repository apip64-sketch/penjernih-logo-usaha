declare module "imagetracerjs" {
  const tracer: {
    imagedataToSVG(imageData: ImageData, options: Record<string, unknown>): string;
  };
  export default tracer;
}