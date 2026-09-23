export function fitImage(width: number, height: number, target: {width: number; height: number}) {
  const scale = Math.min(1, target.width / width, target.height / height);
  return {width: width * scale, height: height * scale,
    x: (target.width - width * scale) / 2, y: (target.height - height * scale) / 2};
}
