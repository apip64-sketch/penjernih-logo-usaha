declare module "imagetracerjs" {
  const tracer: {
    imagedataToSVG(imageData: ImageData, options: Record<string, number | boolean>): string;
  };
  export default tracer;
}