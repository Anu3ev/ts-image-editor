/**
   * Рассчитывает коэффициент масштабирования изображения.
   * @param {Canvas} canvas - объект канваса
   * @param {object} imageObject - объект изображения
   * @param {string} type - тип масштабирования ('contain' или 'cover')
   * @returns {number} коэффициент масштабирования
   */
export function calculateScaleFactor({ canvas, imageObject, scaleType = 'contain' }) {
  if (!canvas || !imageObject) return 1

  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()

  const { width: imageWidth, height: imageHeight } = imageObject

  if (scaleType === 'contain' || scaleType === 'image-contain') {
    return Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight)
  } if (scaleType === 'cover' || scaleType === 'image-cover') {
    return Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
  }

  return 1
}

export function calculateCanvasMultiplier({ canvas, imageObject }) {
  if (!canvas || !imageObject) return 1

  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()

  const { width: imageWidth, height: imageHeight } = imageObject

  const widthMultiplier = imageWidth / canvasWidth
  const heightMultiplier = imageHeight / canvasHeight

  return Math.max(widthMultiplier, heightMultiplier)
}
