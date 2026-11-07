const assets = new URL('./ocr/', import.meta.url);

export async function photoText(file, progress, score) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('image'); }
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const { default: tesseract } = await import('./ocr/tesseract.esm.min.js');
  const worker = await tesseract.createWorker('rus', 1, {
    workerPath: new URL('worker.min.js', assets).href,
    corePath: new URL('tesseract-core-lstm.wasm.js', assets).href,
    langPath: assets.href,
    workerBlobURL: false,
    errorHandler: () => {},
    logger: state => {
      if (state.status === 'recognizing text') progress(Math.round(state.progress * 100));
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: tesseract.PSM.AUTO });
    const original = (await worker.recognize(canvas, { rotateAuto: true })).data.text.trim();
    if (score(original) >= 4) return original;

    // Suppress the background and try again if the first pass found few time ranges.
    const raster = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < raster.data.length; i += 4) {
      const gray = Math.max(raster.data[i], raster.data[i + 1], raster.data[i + 2]);
      const value = Math.min(255, Math.max(0, (gray - 45) * 1.55));
      raster.data[i] = raster.data[i + 1] = raster.data[i + 2] = value;
    }
    ctx.putImageData(raster, 0, 0);
    await worker.setParameters({ tessedit_pageseg_mode: tesseract.PSM.SPARSE_TEXT });
    const contrasted = (await worker.recognize(canvas, { rotateAuto: true })).data.text.trim();
    return score(contrasted) > score(original) ? contrasted : original;
  } finally {
    await worker.terminate();
  }
}
