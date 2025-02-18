import {
  // Кнопка выбора изображения
  chooseImageBtn,
  // Кнопка сохранения
  saveCanvasBtn,
  // Инпут для загрузки файла
  fileInput,
  // Очистить
  clearBtn,
  // Bring to front
  bringToFrontBtn,
  // Send to back
  sendToBackBtn,
  // Копировать-вставить
  copyBtn,
  pasteBtn,
  // Поворот объекта
  rotateRightBtn,
  rotateLeftBtn,
  // Flip
  flipXBtn,
  flipYBtn,
  // Select all
  selectAllBtn,
  // Удалить объект
  deleteSelectedBtn,
  // Сгруппировать/разгруппировать выделенные объекты
  groupBtn,
  ungroupBtn,
  // Zoom
  zoomInBtn,
  zoomOutBtn,
  resetZoomBtn,
  setDefaultScaleBtn,
  // Image fit
  imageFitContainBtn,
  imageFitCoverBtn,
  // Сброс масштаба
  resetFit,
  // Scale canvas
  scaleCanvasBtn,
  // Элемент для отображения разрешения канваса
  canvasResolutionNode,
  // Элемент для отображения размера канваса
  canvasDisplaySizeNode,
  // Элемент для отображения размера текущего объекта
  currentObjectDataNode,
  // Добавление фигур
  addRectBtn,
  addCircleBtn,
  addTriangleBtn,
  // Undo/Redo
  undoBtn,
  redoBtn
} from './elements.js'

import {
  getCanvasResolution,
  getCanvasDisplaySize,
  getCurrentObjectData,
  importImage,
  saveResult
} from './methods.js'

export default (editorInstance) => {
  // Scale canvas
  scaleCanvasBtn.addEventListener('click', () => {
    editorInstance.scaleCanvas()
  })

  // Сброс параметров объекта до дефолтных
  resetFit.addEventListener('click', () => {
    editorInstance.resetObject()
  })

  // Image fit contain
  imageFitContainBtn.addEventListener('click', () => {
    editorInstance.imageFit({ type: 'contain' })
  })

  // Image fit cover
  imageFitCoverBtn.addEventListener('click', () => {
    editorInstance.imageFit({ type: 'cover' })
  })

  // Bring to front
  bringToFrontBtn.addEventListener('click', () => {
    editorInstance.bringToFront()
  })

  // Send to back
  sendToBackBtn.addEventListener('click', () => {
    editorInstance.sendToBack()
  })

  // Сброс масштаба
  resetZoomBtn.addEventListener('click', () => {
    editorInstance.resetZoom()
  })

  // Установка дефолтного масштаба для всего
  setDefaultScaleBtn.addEventListener('click', () => {
    editorInstance.setDefaultScale()
  })

  // Увеличение масштаба
  zoomInBtn.addEventListener('click', () => {
    editorInstance.zoom(0.1)
  })

  // Уменьшение масштаба
  zoomOutBtn.addEventListener('click', () => {
    editorInstance.zoom(-0.1)
  })

  // Группировка объектов
  groupBtn.addEventListener('click', () => {
    editorInstance.group()
  })

  // Разгруппировка объектов
  ungroupBtn.addEventListener('click', () => {
    editorInstance.ungroup()
  })

  // Удалить выбранный объект
  deleteSelectedBtn.addEventListener('click', () => {
    editorInstance.deleteSelectedObjects()
  })

  // Выделить все объекты
  selectAllBtn.addEventListener('click', () => {
    editorInstance.selectAll()
  })

  // Очистка холста
  clearBtn.addEventListener('click', () => {
    editorInstance.clearCanvas()
  })

  // Копирование объекта
  copyBtn.addEventListener('click', () => {
    editorInstance.copy()
  })

  // Вставка объекта
  pasteBtn.addEventListener('click', () => {
    editorInstance.paste()
  })

  // Поворот объекта на 90 градусов
  rotateRightBtn.addEventListener('click', () => {
    editorInstance.rotate(90)
  })

  // Поворот объекта на -90 градусов
  rotateLeftBtn.addEventListener('click', () => {
    editorInstance.rotate(-90)
  })

  // Flip по горизонтали
  flipXBtn.addEventListener('click', () => {
    editorInstance.flipX()
  })

  // Flip по вертикали
  flipYBtn.addEventListener('click', () => {
    editorInstance.flipY()
  })

  chooseImageBtn.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', (e) => {
    importImage(e, editorInstance)
    fileInput.value = ''
  })

  // Сохранение результата
  saveCanvasBtn.addEventListener('click', () => {
    saveResult(editorInstance)
  })

  // Добавление прямоугольника
  addRectBtn.addEventListener('click', () => {
    editorInstance.addRectangle()
  })

  // Добавление круга
  addCircleBtn.addEventListener('click', () => {
    editorInstance.addCircle()
  })

  // Добавление треугольника
  addTriangleBtn.addEventListener('click', () => {
    editorInstance.addTriangle()
  })

  // Undo
  undoBtn.addEventListener('click', () => {
    editorInstance.undo()
  })

  // Redo
  redoBtn.addEventListener('click', () => {
    editorInstance.redo()
  })

  // Отображение разрешения канваса
  canvasResolutionNode.textContent = getCanvasResolution(editorInstance)

  // Отображение размера канваса
  canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)

  editorInstance.canvas.on('after:render', () => {
    canvasResolutionNode.textContent = getCanvasResolution(editorInstance)
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  })

  editorInstance.canvas.on('object:modified', () => {
    currentObjectDataNode.textContent = getCurrentObjectData(editorInstance)
  })

  editorInstance.canvas.on('canvas:display-width-changed', () => {
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  })

  editorInstance.canvas.on('canvas:display-height-changed', () => {
    canvasDisplaySizeNode.textContent = getCanvasDisplaySize(editorInstance)
  })

  // Canvas Zoom Node
  const canvasZoomNode = document.getElementById('canvas-zoom')
  canvasZoomNode.textContent = editorInstance.canvas.getZoom()

  editorInstance.canvas.on('canvas:zoom-changed', ({ currentZoom }) => {
    canvasZoomNode.textContent = currentZoom
  })
}
