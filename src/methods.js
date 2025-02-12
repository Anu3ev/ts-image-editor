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
  calculateCanvasMultiplier
} from './helpers'

export default ({ canvas, fabric, options: editorOptions }) => ({
  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param {String} width
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   */
  setResolutionWidth(width, options = {}) {
    if (!width) return

    const { preserveProportional } = options

    const currentWidth = canvas.getWidth()
    const currentHeight = canvas.getHeight()

    let adjustedWidth = width
    if (adjustedWidth < CANVAS_MIN_WIDTH) adjustedWidth = CANVAS_MIN_WIDTH
    if (adjustedWidth > CANVAS_MAX_WIDTH) adjustedWidth = CANVAS_MAX_WIDTH

    canvas.lowerCanvasEl.width = adjustedWidth

    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.width = adjustedWidth
    }

    if (canvas.wrapperEl) {
      canvas.wrapperEl.width = adjustedWidth
    }

    canvas.width = adjustedWidth

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / currentWidth
      const newHeight = currentHeight * factor

      this.setResolutionHeight(newHeight)
    }

    canvas.renderAll()
  },

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param {String} height
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   */
  setResolutionHeight(height, options = {}) {
    if (!height) return

    const { preserveProportional } = options

    const currentWidth = canvas.getWidth()
    const currentHeight = canvas.getHeight()

    let adjustedHeight = height
    if (adjustedHeight < CANVAS_MIN_HEIGHT) adjustedHeight = CANVAS_MIN_HEIGHT
    if (adjustedHeight > CANVAS_MAX_HEIGHT) adjustedHeight = CANVAS_MAX_HEIGHT

    canvas.lowerCanvasEl.height = adjustedHeight

    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.height = adjustedHeight
    }

    if (canvas.wrapperEl) {
      canvas.wrapperEl.height = adjustedHeight
    }

    canvas.height = adjustedHeight

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / currentHeight
      const newWidth = currentWidth * factor

      this.setResolutionWidth(newWidth)
    }

    canvas.renderAll()
  },

  /**
   * Устанавливаем ширину CSS ширину канваса для отображения
   * @param {String} width
   * @fires canvas:display-width-changed
   */
  setDisplayWidth(width) {
    if (!width || typeof width !== 'string') return

    canvas.lowerCanvasEl.style.width = width
    canvas.upperCanvasEl.style.width = width
    canvas.wrapperEl.style.width = width

    canvas.fire('canvas:display-width-changed', { width })
  },

  /**
   * Устанавливаем высоту CSS высоту канваса для отображения
   * @param {String} height
   * @fires canvas:display-height-changed
   */
  setDisplayHeight(height) {
    if (!height || typeof height !== 'string') return

    canvas.lowerCanvasEl.style.height = height
    canvas.upperCanvasEl.style.height = height
    canvas.wrapperEl.style.height = height

    canvas.fire('canvas:display-height-changed', { height })
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

      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()

      const { width: imageWidth, height: imageHeight } = img

      if (scale === 'scale-canvas') {
        const multiplier = calculateCanvasMultiplier({ canvas, imageObject: img })

        // Если multiplier больше 1, то изображение больше канваса по хотя бы одной оси
        if (multiplier > 1) {
          this.scaleCanvas({ object: img })
        }
      } else {
        const scaleFactor = calculateScaleFactor({ canvas, imageObject: img, scaleType: scale })

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
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.centerObject(img)
      canvas.renderAll()
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

    const image = object || canvas.getActiveObject()

    if (image?.type !== 'image') return

    const scaleFactor = calculateScaleFactor({ canvas, imageObject: image, scaleType: type })

    image.scale(scaleFactor)
    canvas.centerObject(image)
    canvas.renderAll()
  },

  /**
   * Сброс масштаба объекта до дефолтного
   * @param {fabric.Object} object
   * @returns
   */
  resetObjectSize(object) {
    const currentObject = object || canvas.getActiveObject()

    if (!currentObject) return

    if (currentObject.type !== 'image') {
      currentObject.set({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })

      canvas.centerObject(currentObject)
      canvas.renderAll()
    }

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const { width: imageWidth, height: imageHeight } = currentObject

    const scaleFactor = calculateScaleFactor({
      canvas,
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

    canvas.centerObject(currentObject)
    canvas.renderAll()
  },

  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   */
  scaleCanvas(options = {}) {
    const { object } = options

    const image = object || canvas.getActiveObject()

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

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const widthMultiplier = imageWidth / canvasWidth
    const heightMultiplier = imageHeight / canvasHeight

    const multiplier = Math.max(widthMultiplier, heightMultiplier)

    const newCanvasWidth = canvasWidth * multiplier
    const newCanvasHeight = canvasHeight * multiplier

    this.resetZoom()
    this.setResolutionWidth(newCanvasWidth)
    this.setResolutionHeight(newCanvasHeight)
    this.resetObjectSize(image)

    canvas.centerObject(image)
    canvas.renderAll()
  },

  /**
   * Экспорт изображения в файл
   * @param {string} fileName
   * @param {string} contentType
   * @returns {Promise<File>}
   */
  async exportImageFile(fileName = nanoid(), contentType = 'image/png') {
    canvas.discardActiveObject()
    canvas.renderAll()

    const canvasEl = canvas.lowerCanvasEl

    const blob = await new Promise((resolve) => {
      canvasEl.toBlob((blobObject) => {
        resolve(blobObject)
      }, contentType)
    })

    return new File([blob], fileName, { type: contentType })
  },

  /**
   * Группировка объектов
   */
  group() {
    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type !== 'activeSelection' && activeObject.type !== 'activeselection') {
      return
    }

    const group = new fabric.Group(canvas.getActiveObject().removeAll())
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.renderAll()
  },

  /**
   * Разгруппировка объектов
   */
  ungroup(obj) {
    const group = obj || canvas.getActiveObject()

    if (!group || group.type !== 'group') {
      return
    }

    canvas.remove(group)
    const sel = new fabric.ActiveSelection(group.removeAll(), {
      canvas
    })

    canvas.setActiveObject(sel)
    canvas.renderAll()
  },

  /**
   * Удалить выбранный объект
   */
  deleteSelectedObjects() {
    const activeObjects = canvas.getActiveObjects()

    if (!activeObjects || !activeObjects.length) return

    activeObjects.forEach((obj) => {
      if (obj.type === 'group') {
        this.ungroup(obj)
        this.deleteSelectedObjects()

        return
      }

      canvas.remove(obj)
    })

    canvas.discardActiveObject()
    canvas.renderAll()
  },

  /**
   * Очистка холста
   */
  clearCanvas() {
    canvas.clear()
  },

  /**
   * Выделить все объекты
   */
  selectAll() {
    canvas.discardActiveObject()
    const sel = new fabric.ActiveSelection(canvas.getObjects(), {
      canvas
    })
    canvas.setActiveObject(sel)
    canvas.requestRenderAll()
  },

  /**
   * Копирование объекта
   */
  copy() {
    const activeObject = canvas.getActiveObject()

    if (!activeObject) return

    activeObject
      .clone()
      .then((cloned) => {
        this.clipboard = cloned
      })
  },

  /**
   * Вставка объекта
   *
   * TODO: При срабатывании этого метода проверять наличие объекта в буфере обмена
   */
  async paste() {
    if (!this.clipboard) return

    // clone again, so you can do multiple copies.
    const clonedObj = await this.clipboard.clone()
    canvas.discardActiveObject()
    clonedObj.set({
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true
    })
    if (clonedObj instanceof fabric.ActiveSelection) {
      // active selection needs a reference to the canvas.
      clonedObj.canvas = canvas
      clonedObj.forEachObject((obj) => {
        canvas.add(obj)
      })
      // this should solve the unselectability
      clonedObj.setCoords()
    } else {
      canvas.add(clonedObj)
    }
    this.clipboard.top += 10
    this.clipboard.left += 10
    canvas.setActiveObject(clonedObj)
    canvas.requestRenderAll()
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

    const currentZoom = canvas.getZoom()
    const pointX = options.pointX ?? canvas.getWidth() / 2
    const pointY = options.pointY ?? canvas.getHeight() / 2

    let zoom = currentZoom + Number(scale)

    if (zoom > MAX_ZOOM_RATIO) zoom = MAX_ZOOM_RATIO
    if (zoom < MIN_ZOOM_RATIO) zoom = MIN_ZOOM_RATIO

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, zoom)

    canvas.fire('canvas:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom,
      pointX,
      pointY
    })
  },

  /**
   * Сброс зума
   * @fires canvas:zoom-changed
   */
  resetZoom() {
    const pointX = canvas.getWidth() / 2
    const pointY = canvas.getHeight() / 2

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, 1)

    canvas.fire('canvas:zoom-changed', { currentZoom: canvas.getZoom() })
  },

  /**
   * Установка зума и масштаба для канваса и объекта по умолчанию
   */
  setDefaultScale() {
    this.resetZoom()
    this.setResolutionWidth(editorOptions.width)
    this.setResolutionHeight(editorOptions.height)
    this.resetObjectSize()
    this.centerCanvas()
    canvas.renderAll()
  },

  centerCanvas() {
    const currentZoom = this.canvas.getZoom()
    this.canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, 0, 0])
    canvas.renderAll()
  },

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   */
  bringToFront(object) {
    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    canvas.bringObjectToFront(activeObject)
    canvas.renderAll()
  },

  /**
  * Отправить объект на задний план по оси Z
  * @param {fabric.Object} object
  */
  sendToBack(object) {
    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    canvas.sendObjectToBack(activeObject)
    canvas.discardActiveObject()
    canvas.renderAll()
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

    canvas.renderAll()
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
    canvas.remove(imageObj)

    // 4. Создаём новый объект из dataURL
    fabric.FabricImage.fromURL(dataURL, (croppedImg) => {
      croppedImg.set({
        left: imageObj.left,
        top: imageObj.top
      })
      canvas.add(croppedImg)
      canvas.renderAll()
    })
  },

  // TODO: Проверить что работает
  addText(text) {
    const textObj = new fabric.FabricText(text, { left: 100, top: 100 })
    canvas.add(textObj)
    canvas.renderAll()
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
      canvas.add(img)
      canvas.renderAll()
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
    const obj = canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    canvas.renderAll()
  },

  /**
   * Отразить по горизонтали
   */
  flipX() {
    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    canvas.renderAll()
  },

  /**
   * Отразить по вертикали
   */
  flipY() {
    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    canvas.renderAll()
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
    canvas.renderAll()

    // Для тени
    // object.setShadow({
    //   color: 'rgba(0,0,0,0.3)',
    //   blur: 5,
    //   offsetX: 5,
    //   offsetY: 5
    // });
    // canvas.renderAll();
  },

  // TODO: Проверить что работает
  applyBrightness() {
    const obj = canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    const brightnessFilter = new fabric.fabricImage.filters.Brightness({
      brightness: 0.2
    })
    obj.filters[0] = brightnessFilter
    obj.applyFilters()
    canvas.renderAll()
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
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  applyFilters(imageObj) {
    const saturationFilter = new fabric.fabricImage.filters.Saturation({
      saturation: 0.5 // 0.5 — это пример, смотрите документацию
    })
    imageObj.filters.push(saturationFilter)
    imageObj.applyFilters()
    canvas.renderAll()
  },

  // TODO: Проверить что работает
  removeFilter() {
    const obj = canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    obj.filters = []
    obj.applyFilters()
    canvas.renderAll()
  },

  // TODO: Проверить что работает
  setDrawingModeOn() {
    canvas.freeDrawingBrush = new fabric.fabricPencilBrush(canvas)
    canvas.isDrawingMode = true
    canvas.freeDrawingBrush.color = '#ff0000'
    canvas.freeDrawingBrush.width = 5
  },

  // TODO: Проверить что работает
  setDrawingModeOff() {
    canvas.isDrawingMode = false
  },

  // TODO: Проверить что работает
  addRectangle() {
    const rect = new fabric.fabricRect({
      left: 100,
      top: 100,
      fill: 'blue',
      width: 100,
      height: 80
    })
    canvas.add(rect)
    canvas.renderAll()
  },

  // TODO: Проверить что работает
  addCircle() {
    const circle = new fabric.fabricCircle({
      left: 200,
      top: 200,
      fill: 'green',
      radius: 50
    })
    canvas.add(circle)
    canvas.renderAll()
  },

  // TODO: Проверить что работает
  addRoundRect() {
    const roundRect = new fabric.fabricRect({
      left: 300,
      top: 100,
      fill: 'orange',
      width: 100,
      height: 100,
      rx: 20, // радиус скругления по горизонтали
      ry: 20 // радиус скругления по вертикали
    })
    canvas.add(roundRect)
    canvas.renderAll()
  }
})
