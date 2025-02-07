// Получение масштаба внутри канваса
function getCanvasResolution(editorInstance) {
  return `${editorInstance.canvas.getWidth()}x${editorInstance.canvas.getHeight()}`
}

// Получение отображемых размеров канваса
function getCanvasDisplaySize(editorInstance) {
  return `${editorInstance.canvas?.lowerCanvasEl?.style.width}/${editorInstance.canvas?.lowerCanvasEl?.style.height}`
}

// Получение данных о текущем выделенном объекте
function getCurrentObjectData(editorInstance) {
  const activeObject = editorInstance.canvas.getActiveObject()

  if (!activeObject) return ''

  const { width, height, left, top, type, scaleX, scaleY } = activeObject

  return JSON.stringify({ width, height, left, top, type, scaleX, scaleY }, null, 2)
}

// Импорт изображения в канвас
function importImage(e, editorInstance) {
  const { files } = e.target

  for (let i = 0; i < files.length; i++) {
    (function(file) {
      const reader = new FileReader()
      reader.onload = function(f) {
        editorInstance.importImage({ url: f.target.result })
      }
      reader.readAsDataURL(file)
    }(files[i]))
  }
}

// Сохранение результата
async function saveResult(editorInstance) {
  const file = await editorInstance.exportImageFile()

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.href = url
  link.download = file.name

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export {
  getCanvasResolution,
  getCanvasDisplaySize,
  getCurrentObjectData,
  importImage,
  saveResult
}
