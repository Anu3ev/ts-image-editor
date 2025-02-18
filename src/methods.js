import { nanoid } from 'nanoid'
import {
  MIN_ZOOM_RATIO,
  MAX_ZOOM_RATIO,
  DEFAULT_ZOOM_RATIO,
  ROTATE_RATIO,
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from './constants'

import {
  calculateScaleFactor,
  calculateCanvasMultiplier,
  centerCanvas
} from './helpers'

/**
 * Методы для работы с канвасом
 * @param {Object} params
 * @param {Object} params.fabric - объект fabric
 * @param {Object} params.options - опции редактора
 *
 * @returns {Object} методы для работы с канвасом
 */
export default ({ fabric, editorOptions }) => ({
  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param {String} width
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   */
  setResolutionWidth(width, options = {}) {
    if (!width) return

    const { preserveProportional, oldZoomValue } = options
    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    let adjustedWidth = width
    if (adjustedWidth < CANVAS_MIN_WIDTH) adjustedWidth = CANVAS_MIN_WIDTH
    if (adjustedWidth > CANVAS_MAX_WIDTH) adjustedWidth = CANVAS_MAX_WIDTH

    // Сбрасываем зум, чтобы не было проблем с пересчетом размеров
    const oldZoom = oldZoomValue ?? this.canvas.getZoom()
    this.setZoom(1)

    this.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })

    // Обновляем размеры montageArea и clipPath
    this.montageArea.set({ width: adjustedWidth })
    this.canvas.clipPath.set({ width: adjustedWidth })

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = montageAreaHeight * factor
      this.setResolutionHeight(newHeight, { oldZoomValue: oldZoom })

      return
    }

    // Центрируем montageArea и clipPath
    centerCanvas(this.canvas, this.montageArea)
    this.setZoom(oldZoom)
  },

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param {String} height
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   */
  setResolutionHeight(height, options = {}) {
    if (!height) return

    const { preserveProportional, oldZoomValue } = options
    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    let adjustedHeight = height
    if (adjustedHeight < CANVAS_MIN_HEIGHT) adjustedHeight = CANVAS_MIN_HEIGHT
    if (adjustedHeight > CANVAS_MAX_HEIGHT) adjustedHeight = CANVAS_MAX_HEIGHT

    // Сбрасываем зум, чтобы не было проблем с пересчетом размеров
    const oldZoom = oldZoomValue ?? this.canvas.getZoom()
    this.setZoom(1)

    this.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })

    // Обновляем размеры montageArea и clipPath
    this.montageArea.set({ height: adjustedHeight })
    this.canvas.clipPath.set({ height: adjustedHeight })

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = montageAreaWidth * factor

      this.setResolutionWidth(newWidth, { oldZoomValue: oldZoom })

      return
    }

    // Центрируем clipPath и монтажную область относительно новых размеров
    centerCanvas(this.canvas, this.montageArea)
    this.setZoom(oldZoom)
  },

  /**
   * Устанавливаем ширину CSS ширину канваса для отображения
   * @param {String} width
   * @fires canvas:display-width-changed
   */
  setDisplayWidth(width, options = {}) {
    if (!width) return

    const numericWidth = parseFloat(width)

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(numericWidth)) return

    const { preserveProportional } = options

    const { width: currentDisplayWidth, height: currentDisplayHeight } = this.canvas.lowerCanvasEl.style

    const stringWidth = `${numericWidth}px`

    this.canvas.lowerCanvasEl.style.width = stringWidth
    this.canvas.upperCanvasEl.style.width = stringWidth
    this.canvas.wrapperEl.style.width = stringWidth
    editorOptions.editorContainer.style.width = stringWidth

    // Если нужно сохранить пропорции, вычисляем новую высоту
    // eslint-disable-next-line no-restricted-globals
    if (preserveProportional) {
      const factor = numericWidth / parseFloat(currentDisplayWidth)
      const newHeight = parseFloat(currentDisplayHeight) * factor

      this.setDisplayHeight(newHeight)
    }

    this.canvas.fire('canvas:display-width-changed', { width })
  },

  /**
   * Устанавливаем высоту CSS высоту канваса для отображения
   * @param {String} height
   * @fires canvas:display-height-changed
   */
  setDisplayHeight(height, options = {}) {
    if (!height) return

    const numericHeight = parseFloat(height)

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(numericHeight)) return

    const { preserveProportional } = options

    const { width: currentDisplayWidth, height: currentDisplayHeight } = this.canvas.lowerCanvasEl.style

    const stringHeight = `${numericHeight}px`

    this.canvas.lowerCanvasEl.style.height = stringHeight
    this.canvas.upperCanvasEl.style.height = stringHeight
    this.canvas.wrapperEl.style.height = stringHeight
    editorOptions.editorContainer.style.height = stringHeight

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = numericHeight / parseFloat(currentDisplayHeight)
      const newHeight = parseFloat(currentDisplayWidth) * factor

      this.setDisplayWidth(newHeight)
    }

    this.canvas.fire('canvas:display-height-changed', { height })
  },

  /**
   * Импорт изображения
   * @param {Object} options
   * @param {String} [options.url] - URL изображения
   * @param {String} [options.scale] - Если размеры изображения больше размеров канваса, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вмещалась
   * 'image-cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * 'scale-canvas' - Обновляет backstore-резолюцию канваса (масштабирует
   * экспортный размер канваса под размер изображения)
   */
  async importImage({ url, scale = `image-${editorOptions.scaleType}` }) {
    if (!url || typeof url !== 'string') return

    try {
      const img = await fabric.FabricImage.fromURL(url)

      const canvasWidth = this.canvas.getWidth()
      const canvasHeight = this.canvas.getHeight()

      const { width: imageWidth, height: imageHeight } = img

      if (scale === 'scale-canvas') {
        const multiplier = calculateCanvasMultiplier({ montageArea: this.montageArea, imageObject: img })

        // Если multiplier больше 1, то изображение больше канваса по хотя бы одной оси
        if (multiplier > 1) {
          this.scaleCanvas({ object: img })
        }
      } else {
        const scaleFactor = calculateScaleFactor({ montageArea: this.montageArea, imageObject: img, scaleType: scale })

        if (scale === 'image-contain' && scaleFactor < 1) {
          this.imageFit({ object: img, type: 'contain' })
        } else if (
          scale === 'image-cover'
          && (imageWidth > canvasWidth || imageHeight > canvasHeight)
        ) {
          this.imageFit({ object: img, type: 'cover' })
        }
      }

      // Добавляем изображение, центрируем его и перерисовываем канвас
      this.canvas.add(img)
      this.canvas.setActiveObject(img)
      this.canvas.centerObject(img)
      this.canvas.renderAll()
    } catch (error) {
      console.error('importImage error: ', error)
    }
  },

  /**
   * Масштабирование изображения
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {String} [options.type] - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   */
  imageFit(options = {}) {
    const { object, type = editorOptions.scaleType } = options

    const image = object || this.canvas.getActiveObject()

    if (image?.type !== 'image') return

    const scaleFactor = calculateScaleFactor({ montageArea: this.montageArea, imageObject: image, scaleType: type })

    image.scale(scaleFactor)
    this.canvas.centerObject(image)
    this.canvas.renderAll()
  },

  /**
   * Сброс масштаба объекта до дефолтного
   * @param {fabric.Object} object
   * @returns
   */
  resetObject(object) {
    const currentObject = object || this.canvas.getActiveObject()

    if (!currentObject) return

    if (currentObject.type !== 'image') {
      currentObject.set({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })

      this.canvas.centerObject(currentObject)
      this.canvas.renderAll()
    }

    const canvasWidth = this.canvas.getWidth()
    const canvasHeight = this.canvas.getHeight()

    const { width: imageWidth, height: imageHeight } = currentObject

    const scaleFactor = calculateScaleFactor({
      montageArea: this.montageArea,
      imageObject: currentObject,
      scaleType: editorOptions.scaleType
    })

    // Делаем contain и cover только если размеры изображения больше размеров канваса, иначе просто сбрасываем
    if (
      (editorOptions.scaleType === 'contain' && scaleFactor < 1)
      || (
        editorOptions.scaleType === 'cover'
        && (imageWidth > canvasWidth || imageHeight > canvasHeight)
      )
    ) {
      this.imageFit({ object: currentObject, type: editorOptions.scaleType })
    } else {
      currentObject.set({ scaleX: 1, scaleY: 1 })
    }

    currentObject.set({
      flipX: false,
      flipY: false,
      angle: 0
    })

    this.canvas.centerObject(currentObject)
    this.canvas.renderAll()
  },

  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   */
  scaleCanvas(options = {}) {
    const { object } = options

    const image = object || this.canvas.getActiveObject()

    if (!image || image.type !== 'image') return

    const { width: imageWidth, height: imageHeight } = image

    if (
      (imageHeight < CANVAS_MIN_HEIGHT || imageHeight > CANVAS_MAX_HEIGHT)
      || (imageWidth < CANVAS_MIN_WIDTH || imageWidth > CANVAS_MAX_WIDTH)
    ) {
      console.error(`scaleCanvas. Image size is out of canvas bounds:
        min: ${CANVAS_MIN_WIDTH}x${CANVAS_MIN_HEIGHT},
        max: ${CANVAS_MAX_WIDTH}x${CANVAS_MAX_HEIGHT}`)

      return
    }

    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    const widthMultiplier = imageWidth / montageAreaWidth
    const heightMultiplier = imageHeight / montageAreaHeight

    const multiplier = Math.max(widthMultiplier, heightMultiplier)

    const newCanvasWidth = montageAreaWidth * multiplier
    const newCanvasHeight = montageAreaHeight * multiplier

    this.resetZoom()
    this.setResolutionWidth(newCanvasWidth)
    this.setResolutionHeight(newCanvasHeight)
    this.resetObject(image)

    this.canvas.centerObject(image)
    this.canvas.renderAll()
  },

  /**
 * Экспорт изображения в файл – экспортируется содержимое монтажной области.
 * Независимо от текущего зума, экспортируется монтажная область в исходном масштабе.
 * @param {string} fileName
 * @param {string} contentType
 * @returns {Promise<File>}
 */
  async exportImageFile(fileName = nanoid(), contentType = 'image/png') {
  // Сброс активного объекта и ререндер
    this.canvas.discardActiveObject()
    this.canvas.renderAll()

    // Сохраняем текущий viewportTransform (матрицу масштабирования и сдвига)
    const savedTransform = this.canvas.viewportTransform.slice()

    // Сбрасываем viewportTransform до идентичной матрицы,
    // чтобы экспортировать содержимое в координатах канваса без зума
    this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
    this.canvas.renderAll()

    // Получаем координаты монтажной области.
    // Предполагаем, что montageArea – это объект, добавленный на канвас,
    // с его собственными координатами left, top, width и height.
    const { left, top, width, height } = this.montageArea

    this.montageArea.visible = false

    // Вызываем toDataURL с указанием нужной области.
    const dataUrl = this.canvas.toDataURL({
      format: contentType.split('/')[1], // например, 'png'
      left,
      top,
      width,
      height
    })

    // Восстанавливаем сохранённый viewportTransform и заливку для монтажной области
    this.canvas.viewportTransform = savedTransform
    this.montageArea.visible = true
    this.canvas.renderAll()

    // Преобразуем dataUrl в Blob и затем в File
    const blob = await (await fetch(dataUrl)).blob()
    return new File([blob], fileName, { type: contentType })
  },

  /**
   * Группировка объектов
   */
  group() {
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type !== 'activeSelection' && activeObject.type !== 'activeselection') {
      return
    }

    const group = new fabric.Group(this.canvas.getActiveObject().removeAll())
    this.canvas.add(group)
    this.canvas.setActiveObject(group)
    this.canvas.renderAll()
  },

  /**
   * Разгруппировка объектов
   */
  ungroup(obj) {
    const group = obj || this.canvas.getActiveObject()

    if (!group || group.type !== 'group') {
      return
    }

    this.canvas.remove(group)
    const sel = new fabric.ActiveSelection(group.removeAll(), {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.renderAll()
  },

  /**
   * Удалить выбранный объект
   */
  deleteSelectedObjects() {
    const activeObjects = this.canvas.getActiveObjects()

    if (!activeObjects || !activeObjects.length) return

    activeObjects.forEach((obj) => {
      if (obj.type === 'group') {
        this.ungroup(obj)
        this.deleteSelectedObjects()

        return
      }

      this.canvas.remove(obj)
    })

    this.canvas.discardActiveObject()
    this.canvas.renderAll()
  },

  saveState() {
    if (this.isLoading) return

    const { undoStack, maxHistoryLength } = this.history

    this.history.redoStack = []
    // Получаем текущее состояние канваса и сериализуем его в строку
    let time = performance.now()

    const state = JSON.stringify(this.canvas.toDatalessJSON(['selectable', 'evented']))

    time = performance.now() - time
    console.log('Время выполнения = ', time)
    undoStack.push(state)

    // Ограничиваем длину истории
    if (undoStack.length > maxHistoryLength) {
      undoStack.shift()
    }

    console.log('Состояние сохранено. undoStack:', undoStack, undoStack.length)
  },

  // Функция загрузки состояния в канвас
  async loadState(state) {
    if (!state) return

    console.log('state', state)
    this.isLoading = true
    await this.canvas.loadFromJSON(state)
    this.canvas.renderAll()
    this.isLoading = false
    console.log('state loaded')
  },

  // Undo – отмена последнего действия
  undo() {
    const { undoStack, redoStack } = this.history

    // Если в стеке больше одного состояния (начальное состояние тоже сохраняется)

    console.log('undoStack?.length', undoStack?.length)
    if (undoStack?.length <= 1) {
      console.log('Нет предыдущих состояний для отмены.')

      return
    }

    // Сохраняем текущее состояние в redo-стеке
    const currentState = undoStack.pop()
    redoStack.push(currentState)
    console.log('undo currentState', currentState)

    // Восстанавливаем предыдущее состояние
    const previousState = undoStack[undoStack.length - 1]

    if (!previousState) {
      console.log('Нет предыдущих состояний для отмены.', previousState)

      return
    }

    this.loadState(previousState)
    console.log('Undo. undoStack:', undoStack.length, 'redoStack:', redoStack.length)
  },

  // Redo – повтор ранее отменённого действия
  async redo() {
    const { undoStack, redoStack } = this.history

    if (!redoStack?.length) {
      console.log('Нет состояний для повтора.')
      return
    }

    // Извлекаем состояние из redoStack, которое содержит картинку
    const state = redoStack.pop()
    console.log('redo call redoStack', redoStack)

    // Загружаем извлечённое состояние, и после загрузки добавляем его в undoStack
    await this.loadState(state)

    // После успешной загрузки сохраняем состояние с картинкой
    undoStack.push(state)
    console.log('Redo. undoStack:', undoStack.length, 'redoStack:', redoStack.length)
  },

  // Дебаунс для снижения частоты сохранения состояния
  debounce(fn, delay) {
    let timer = null

    return function(...args) {
      const context = this
      clearTimeout(timer)
      timer = setTimeout(() => {
        fn.apply(context, args)
      }, delay)
    }
  },

  /**
   * Очистка холста
   * TODO: Полностью удаляет всё, в том числе монтажную область
   */
  clearCanvas() {
    this.canvas.clear()
  },

  /**
   * Выделить все объекты
   * TODO: Выделяет всё, в том числе монтажную область
   */
  selectAll() {
    this.canvas.discardActiveObject()
    const sel = new fabric.ActiveSelection(this.canvas.getObjects(), {
      canvas: this.canvas
    })
    this.canvas.setActiveObject(sel)
    this.canvas.requestRenderAll()
  },

  /**
   * Копирование объекта
   */
  async copy() {
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    const clonedObject = await activeObject.clone()

    this.clipboard = clonedObject

    // Сохраняем объект в локальном буфере редактора
    if (this.clipboard.type !== 'image') {
      await navigator.clipboard.writeText(['application/image-editor', JSON.stringify(clonedObject)])

      return
    }

    // Если это изображение, то сохраним его в системном буфере
    const clonedDataUrl = this.clipboard.toDataURL()
    const blob = await (await fetch(clonedDataUrl)).blob()

    const clipboardItem = new ClipboardItem({ [blob.type]: blob })

    try {
      await navigator.clipboard.write([clipboardItem])
    } catch (error) {
      console.error('Ошибка записи в системный буфер обмена:', error)
    }
  },

  /**
   * Вставка объекта
   */
  async paste() {
    if (!this.clipboard) return

    // clone again, so you can do multiple copies.
    const clonedObj = await this.clipboard.clone()
    this.canvas.discardActiveObject()
    clonedObj.set({
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true
    })
    if (clonedObj instanceof fabric.ActiveSelection) {
      // active selection needs a reference to the canvas.
      clonedObj.canvas = this.canvas
      clonedObj.forEachObject((obj) => {
        this.canvas.add(obj)
      })
      // this should solve the unselectability
      clonedObj.setCoords()
    } else {
      this.canvas.add(clonedObj)
    }
    this.clipboard.top += 10
    this.clipboard.left += 10
    this.canvas.setActiveObject(clonedObj)
    this.canvas.requestRenderAll()
  },

  /**
   * Увеличение/уменьшение масштаба
   * @param {Number} scale - Шаг зума
   * @param {Object} options - Координаты зума (по умолчанию центр канваса)
   * @param {Number} options.pointX - Координата X точки зума
   * @param {Number} options.pointY - Координата Y точки зума
   * @fires canvas:zoom-changed
   * Если передавать координаты курсора, то нужно быть аккуратнее, так как юзер может выйти за пределы рабочей области
   */
  zoom(scale = DEFAULT_ZOOM_RATIO, options = {}) {
    if (!scale) return

    const currentZoom = this.canvas.getZoom()
    const pointX = options.pointX ?? this.canvas.getWidth() / 2
    const pointY = options.pointY ?? this.canvas.getHeight() / 2

    let zoom = currentZoom + Number(scale)

    if (zoom > MAX_ZOOM_RATIO) zoom = MAX_ZOOM_RATIO
    if (zoom < MIN_ZOOM_RATIO) zoom = MIN_ZOOM_RATIO

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, zoom)

    this.canvas.fire('canvas:zoom-changed', {
      currentZoom: this.canvas.getZoom(),
      zoom,
      pointX,
      pointY
    })
  },

  /**
   * Установка зума
   * @param {Number} zoom - Зум
   * @fires canvas:zoom-changed
   */
  setZoom(zoom = editorOptions.defaultScale) {
    const pointX = this.canvas.getWidth() / 2
    const pointY = this.canvas.getHeight() / 2

    let newZoom = zoom

    if (zoom > MAX_ZOOM_RATIO) newZoom = MAX_ZOOM_RATIO
    if (zoom < MIN_ZOOM_RATIO) newZoom = MIN_ZOOM_RATIO

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, newZoom)

    this.canvas.fire('canvas:zoom-changed', {
      currentZoom: this.canvas.getZoom(),
      zoom: newZoom,
      pointX,
      pointY
    })
  },

  /**
   * Сброс зума
   * @fires canvas:zoom-changed
   */
  resetZoom() {
    const pointX = this.canvas.getWidth() / 2
    const pointY = this.canvas.getHeight() / 2

    const { defaultScale = 1 } = editorOptions

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, defaultScale)

    this.canvas.fire('canvas:zoom-changed', { currentZoom: this.canvas.getZoom() })
  },

  /**
   * Установка зума и масштаба для канваса и объекта по умолчанию
   */
  setDefaultScale() {
    this.resetZoom()
    this.setResolutionWidth(editorOptions.width)
    this.setResolutionHeight(editorOptions.height)
    this.resetObject()
    centerCanvas(this.canvas, this.montageArea)
    this.canvas.renderAll()
  },

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   */
  bringToFront(object) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    this.canvas.bringObjectToFront(activeObject)
    this.canvas.renderAll()
  },

  /**
  * Отправить объект на задний план по оси Z
  * @param {fabric.Object} object
  * TODO: Отправляет объект под монтахную область
  */
  sendToBack(object) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    this.canvas.sendObjectToBack(activeObject)
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
  },

  // TODO: Проверить что работает
  // Пример с ClipPath
  cropImage(imageObj, cropRect) {
    // cropRect — это объект { left, top, width, height },
    // который задаёт рамку для обрезки

    imageObj.clipPath = new fabric.Rect({
      left: cropRect.left,
      top: cropRect.top,
      width: cropRect.width,
      height: cropRect.height,
      absolutePositioned: true // Чтобы учитывались координаты именно канвы, а не локальные
    })

    this.canvas.renderAll()
  },

  // TODO: Проверить что работает
  // Пример с «ручной» обрезкой (создаём новый fabric.Image)
  cropImageAndReplace(imageObj, cropRect) {
    // 1. Создаём промежуточный <canvas> (DOM)
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')

    // Задаём размеры временного canvas
    tempCanvas.width = cropRect.width
    tempCanvas.height = cropRect.height

    // Копируем нужную часть
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(
      imageObj._element,
      cropRect.left,
      cropRect.top,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    )

    // 2. Получаем dataURL
    const dataURL = tempCanvas.toDataURL()

    // 3. Удаляем старый объект из canvas
    this.canvas.remove(imageObj)

    // 4. Создаём новый объект из dataURL
    fabric.FabricImage.fromURL(dataURL, (croppedImg) => {
      croppedImg.set({
        left: imageObj.left,
        top: imageObj.top
      })
      this.canvas.add(croppedImg)
      this.canvas.renderAll()
    })
  },

  // TODO: Проверить что работает
  addText(text) {
    const textObj = new fabric.FabricText(text, { left: 100, top: 100 })
    this.canvas.add(textObj)
    this.canvas.renderAll()
  },

  // Ещё один вариант
  // addText(text) {
  //   const textObj = new fabricTextbox(textString, {
  //     left: 100,
  //     top: 200,
  //     fontSize: 30,
  //     fill: '#000',
  //     // Прочие настройки...
  //   });
  //   canvas.add(textObj);
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  addSticker(url) {
    fabric.fabricFabricImage.fromURL(url, (img) => {
      img.set({
        left: 100,
        top: 100
        // можно что-то поднастроить...
      })
      this.canvas.add(img)
      this.canvas.renderAll()
    })
  },

  // TODO: Проверить что работает. Возможно это должно быть внутренней фичей
  hideControls(imageObj) {
    imageObj.set({
      hasControls: true, // разрешает уголки для маштабирования/вращения
      lockRotation: false // если хотим разрешить вращение, это должно быть false
    })
  },

  /**
   * Поворот объекта на заданный угол
   * @param {number} angle
   */
  rotate(angle = ROTATE_RATIO) {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    this.canvas.renderAll()
  },

  /**
   * Отразить по горизонтали
   */
  flipX() {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    this.canvas.renderAll()
  },

  /**
   * Отразить по вертикали
   */
  flipY() {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    this.canvas.renderAll()
  },

  // TODO: Проверить что работает
  applyGradient(object) {
    // Допустим, линейный градиент слева направо
    const gradient = new fabric.fabricGradient({
      type: 'linear',
      gradientUnits: 'pixels', // или 'percentage'
      coords: {
        x1: 0,
        y1: 0,
        x2: object.width,
        y2: 0
      },
      colorStops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' }
      ]
    })
    object.set('fill', gradient)
    this.canvas.renderAll()

    // Для тени
    // object.setShadow({
    //   color: 'rgba(0,0,0,0.3)',
    //   blur: 5,
    //   offsetX: 5,
    //   offsetY: 5
    // });
    // this.canvas.renderAll();
  },

  // TODO: Проверить что работает
  applyBrightness() {
    const obj = this.canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    const brightnessFilter = new fabric.fabricImage.filters.Brightness({
      brightness: 0.2
    })
    obj.filters[0] = brightnessFilter
    obj.applyFilters()
    this.canvas.renderAll()
  },

  // Предположим, у нас есть imageObj, который является fabricImage
  // applyBrightness(imageObj, value) {
  //   // value: число от -1 до +1
  //   const brightnessFilter = new fabricImage.filters.Brightness({
  //     brightness: value
  //   });
  //   // Массив filters у объекта - туда можно добавить несколько фильтров
  //   imageObj.filters[0] = brightnessFilter;
  //   imageObj.applyFilters();
  //   this.canvas.renderAll();
  // }

  // TODO: Проверить что работает
  applyFilters(imageObj) {
    const saturationFilter = new fabric.fabricImage.filters.Saturation({
      saturation: 0.5 // 0.5 — это пример, смотрите документацию
    })
    imageObj.filters.push(saturationFilter)
    imageObj.applyFilters()
    this.canvas.renderAll()
  },

  // TODO: Проверить что работает
  removeFilter() {
    const obj = this.canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    obj.filters = []
    obj.applyFilters()
    this.canvas.renderAll()
  },

  // TODO: Проверить что работает
  setDrawingModeOn() {
    this.canvas.freeDrawingBrush = new fabric.fabricPencilBrush(this.canvas)
    this.canvas.isDrawingMode = true
    this.canvas.freeDrawingBrush.color = '#ff0000'
    this.canvas.freeDrawingBrush.width = 5
  },

  // TODO: Проверить что работает
  setDrawingModeOff() {
    this.canvas.isDrawingMode = false
  },

  /**
   * Добавление прямоугольника
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.width - Ширина
   * @param {Number} options.height - Высота
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addRectangle(options = {}) {
    const {
      left,
      top,
      width = 100,
      height = 100,
      color = 'blue',
      originX = 'center',
      originY = 'center'
    } = options

    const rect = new fabric.Rect({
      left,
      top,
      fill: color,
      width,
      height,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(rect)
    }

    this.canvas.add(rect)
    this.canvas.setActiveObject(rect)
    this.canvas.renderAll()
  },

  /**
   * Добавление круга
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.radius - Радиус
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addCircle(options = {}) {
    const {
      left,
      top,
      radius = 50,
      color = 'green',
      originX = 'center',
      originY = 'center'
    } = options

    const circle = new fabric.Circle({
      left,
      top,
      fill: color,
      radius,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(circle)
    }

    this.canvas.add(circle)
    this.canvas.setActiveObject(circle)
    this.canvas.renderAll()
  },

  /**
   * Добавление треугольника
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.width - Ширина
   * @param {Number} options.height - Высота
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addTriangle(options = {}) {
    const {
      left,
      top,
      width = 100,
      height = 100,
      originX = 'center',
      originY = 'center',
      color = 'yellow'
    } = options

    const triangle = new fabric.Triangle({
      left,
      top,
      fill: color,
      width,
      height,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(triangle)
    }

    this.canvas.add(triangle)
    this.canvas.setActiveObject(triangle)
    this.canvas.renderAll()
  }
})
