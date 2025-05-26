import { Pattern } from 'fabric'

/**
 * Рассчитывает коэффициент масштабирования изображения.
 * @param {Canvas} canvas - объект канваса
 * @param {object} imageObject - объект изображения
 * @param {string} type - тип масштабирования ('contain' или 'cover')
 * @returns {number} коэффициент масштабирования
 */
export function calculateScaleFactor({ montageArea, imageObject, scaleType = 'contain' }) {
  if (!montageArea || !imageObject) return 1

  const canvasWidth = montageArea.width
  const canvasHeight = montageArea.height

  const { width: imageWidth, height: imageHeight } = imageObject

  if (scaleType === 'contain' || scaleType === 'image-contain') {
    return Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight)
  } if (scaleType === 'cover' || scaleType === 'image-cover') {
    return Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
  }

  return 1
}

/**
 * Рассчитывает коэффициент масштабирования канваса.
 * @param {Canvas} canvas - объект канваса
 * @param {object} imageObject - объект изображения
 * @returns {number} коэффициент масштабирования
 * @example
 */
export function calculateCanvasMultiplier({ canvas, imageObject }) {
  if (!canvas || !imageObject) return 1

  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()

  const { width: imageWidth, height: imageHeight } = imageObject

  const widthMultiplier = imageWidth / canvasWidth
  const heightMultiplier = imageHeight / canvasHeight

  return Math.max(widthMultiplier, heightMultiplier)
}

/**
 * Создает паттерн мозаики.
 * @returns {object} паттерн мозаики
 */
export function createMosaicPattern() {
  const patternSourceCanvas = document.createElement('canvas')
  patternSourceCanvas.width = 20
  patternSourceCanvas.height = 20
  const pCtx = patternSourceCanvas.getContext('2d')
  pCtx.fillStyle = '#ddd'
  pCtx.fillRect(0, 0, 40, 40)
  pCtx.fillStyle = '#ccc'
  pCtx.fillRect(0, 0, 10, 10)
  pCtx.fillRect(10, 10, 10, 10)

  return new Pattern({
    source: patternSourceCanvas,
    repeat: 'repeat'
  })
}
