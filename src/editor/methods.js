import {
  Point,
  loadSVGFromURL,
  FabricImage,
  util,
  ActiveSelection,
  Group,
  Rect,
  Circle,
  Triangle
} from 'fabric'

import { nanoid } from 'nanoid'
import { jsPDF as JsPDF } from 'jspdf'

import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_ROTATE_RATIO,
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from './constants'

import {
  calculateScaleFactor
} from './helpers'

/**
 * Методы для работы с канвасом
 * @param {Object} params
 * @param {Object} params.fabric - объект fabric
 * @param {Object} params.editorOptions - опции редактора
 *
 * @returns {Object} методы для работы с канвасом
 */
export default ({ editorOptions }) => ({
  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param {String} width
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:resolution-width-changed
   */
  setResolutionWidth(width, { preserveProportional, withoutSave, adaptCanvasToContainer } = {}) {
    if (!width) return

    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    const adjustedWidth = Number(Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH))

    const { canvasBackstoreWidth } = editorOptions

    // Если ширина канваса не задана или равна 'auto', адаптируем канвас к контейнеру
    if (!canvasBackstoreWidth || canvasBackstoreWidth === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreWidth) {
      this.setCanvasBackstoreWidth(canvasBackstoreWidth)
    } else {
      this.setCanvasBackstoreWidth(adjustedWidth)
    }

    // Обновляем размеры montageArea и clipPath
    this.montageArea.set({ width: adjustedWidth })
    this.canvas.clipPath.set({ width: adjustedWidth })

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = montageAreaHeight * factor
      this.setResolutionHeight(newHeight)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(this.montageArea)

    const currentZoom = this.canvas.getZoom()

    this.canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas?.fire('editor:resolution-width-changed', { width })
  },

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param {String} height
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:resolution-height-changed
   */
  setResolutionHeight(height, { preserveProportional, withoutSave, adaptCanvasToContainer } = {}) {
    if (!height) return

    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    const adjustedHeight = Number(Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT))

    const { canvasBackstoreHeight } = editorOptions

    if (!canvasBackstoreHeight || canvasBackstoreHeight === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreHeight) {
      this.setCanvasBackstoreHeight(canvasBackstoreHeight)
    } else {
      this.setCanvasBackstoreHeight(adjustedHeight)
    }

    // Обновляем размеры montageArea и clipPath
    this.montageArea.set({ height: adjustedHeight })
    this.canvas.clipPath.set({ height: adjustedHeight })

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = montageAreaWidth * factor

      this.setResolutionWidth(newWidth)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(this.montageArea)

    const currentZoom = this.canvas.getZoom()
    this.canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    this.centerMontageArea()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas?.fire('editor:resolution-height-changed', { height })
  },

  /**
   * Центрирует монтажную область и ClipPath точно по центру канваса
   * и устанавливает правильный viewportTransform.
   */
  centerMontageArea() {
    const canvasWidth = this.canvas.getWidth()
    const canvasHeight = this.canvas.getHeight()

    const currentZoom = this.canvas.getZoom()

    const centerCanvasPoint = new Point(canvasWidth / 2, canvasHeight / 2)

    // Устанавливаем origin монтажной области в центр канваса без зума
    this.montageArea.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    this.canvas.clipPath.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    this.canvas.renderAll()

    // Заново устанавливаем viewportTransform, чтобы монтажная область была точно по центру с учётом зума
    const vpt = this.canvas.viewportTransform
    vpt[4] = canvasWidth / 2 - centerCanvasPoint.x * currentZoom
    vpt[5] = canvasHeight / 2 - centerCanvasPoint.y * currentZoom

    this.canvas.setViewportTransform(vpt)
    this.canvas.renderAll()
  },

  /**
   * Метод для получения координат объекта с учетом текущего зума
   * @param {fabric.Object} object - объект, координаты которого нужно получить
   * @returns {Object} координаты объекта
   */
  getObjectDefaultCoords(object) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) {
      console.error('getObjectDefaultCoords. Не выбран объект')

      this.canvas.fire('editor:error', {
        message: 'Не выбран объект для получения координат'
      })

      return {}
    }

    const { width, height } = activeObject

    const currentZoom = this.canvas.getZoom()
    const left = (width - (width * currentZoom)) / 2
    const top = (height - (height * currentZoom)) / 2

    return { left, top }
  },

  setCanvasBackstoreWidth(width) {
    if (!width || typeof width !== 'number') return

    const adjustedWidth = Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)

    this.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })
  },

  setCanvasBackstoreHeight(height) {
    if (!height || typeof height !== 'number') return

    const adjustedHeight = Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    this.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })
  },

  adaptCanvasToContainer() {
    const container = this.canvas.editorContainer
    const cw = container.clientWidth
    const ch = container.clientHeight

    const width = Math.max(Math.min(cw, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)
    const height = Math.max(Math.min(ch, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    console.log('adaptCanvasToContainer newWidth', width)
    console.log('adaptCanvasToContainer newHeight', height)

    this.canvas.setDimensions({ width, height }, { backstoreOnly: true })
  },

  /**
   * Устанавливаем CSS ширину канваса для отображения
   * @param {string|number} width
   * @fires editor:display-canvas-width-changed
   */
  setCanvasCSSWidth(value) {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'width',
      value
    })
  },

  /**
   * Устанавливаем CSS высоту канваса для отображения
   * @param {string|number} height
   * @fires editor:display-canvas-height-changed
   */
  setCanvasCSSHeight(value) {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'height',
      value
    })
  },

  /**
   * Устанавливаем CSS ширину обертки канваса для отображения
   * @param {string|number} width
   * @fires editor:display-wrapper-width-changed
   */
  setCanvasWrapperWidth(value) {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'width',
      value
    })
  },

  /**
   * Устанавливаем CSS высоту обертки канваса для отображения
   * @param {string|number} height
   * @fires editor:display-wrapper-height-changed
   */
  setCanvasWrapperHeight(value) {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'height',
      value
    })
  },

  /**
   * Устанавливаем CSS ширину контейнера редактора для отображения
   * @param {string|number} width
   * @fires editor:display-container-width-changed
   */
  setEditorContainerWidth(value) {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'width',
      value
    })
  },

  /**
   * Устанавливаем CSS высоту контейнера редактора для отображения
   * @param {string|number} height
   * @fires editor:display-container-height-changed
   */
  setEditorContainerHeight(value) {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'height',
      value
    })
  },

  /**
   * Устанавливаем CSS ширину или высоту канваса для отображения
   * @param {Object} options
   * @param {String} [options.element] - элемент, для которого устанавливаем размеры:
   * canvas (upper & lower), wrapper, container
   * @param {('width'|'height')} [options.dimension]
   * @param {string|number} [options.value]
   * @fires editor:display-{element}-{dimension}-changed
   */
  setDisplayDimension({ element, dimension, value } = {}) {
    if (!value) return

    const canvasElements = []

    switch (element) {
    case 'canvas':
      canvasElements.push(this.canvas.lowerCanvasEl, this.canvas.upperCanvasEl)
      break
    case 'wrapper':
      canvasElements.push(this.canvas.wrapperEl)
      break
    case 'container':
      canvasElements.push(editorOptions.editorContainer)
      break
    default:
      canvasElements.push(this.canvas.lowerCanvasEl, this.canvas.upperCanvasEl)
    }

    const cssDimension = dimension === 'width' ? 'width' : 'height'

    // Если строка, то просто устанавливаем
    if (typeof value === 'string') {
      canvasElements.forEach((el) => { el.style[cssDimension] = value })

      return
    }

    // Если число, то добавляем px
    const numericValue = parseFloat(value)

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(numericValue)) return

    const newValuePx = `${numericValue}px`
    canvasElements.forEach((el) => { el.style[cssDimension] = newValuePx })

    this.canvas.fire(`editor:display-${element}-${cssDimension}-changed`, {
      element,
      value
    })
  },

  /**
   * Обновляет размеры и позицию overlay, выносит его на передний план
   */
  updateDisabledOverlay() {
    if (!this.disabledOverlay) return

    this.historyManager.suspendHistory()

    // получаем в экранных координатах то, что отображает монтажную зону
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // обновляем размеры и позицию overlay
    this.disabledOverlay.set({ left, top, width, height })
    this.canvas.discardActiveObject()
    this.bringToFront(this.disabledOverlay, { withoutSave: true })
    this.historyManager.resumeHistory()
  },

  /**
   * Блокирует объект (или группу объектов) на канвасе
   * @param {Object} options
   * @param {fabric.Object} [options.object] - объект, который нужно заблокировать
   * @param {Boolean} [options.withoutSave] - не сохранять состояние
   * @returns
   * @fires editor:object-locked
   */
  lockObject({ object, withoutSave } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    const lockOptions = {
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      lockSkewingX: true,
      lockSkewingY: true,
      locked: true
    }

    activeObject.set(lockOptions)

    if (['activeselection', 'group'].includes(activeObject.type)) {
      activeObject.getObjects().forEach((obj) => {
        obj.set(lockOptions)
      })
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-locked', { object: activeObject })
  },

  /**
   * Разблокирует объект (или группу объектов) на канвасе
   * @param {Object} options
   * @param {fabric.Object} [options.object] - объект, который нужно разблокировать
   * @param {Boolean} [options.withoutSave] - не сохранять состояние
   * @returns
   * @fires editor:object-unlocked
   */
  unlockObject({ object, withoutSave } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    const unlockOptions = {
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      locked: false
    }

    activeObject.set(unlockOptions)

    if (['activeselection', 'group'].includes(activeObject.type)) {
      activeObject.getObjects().forEach((obj) => {
        obj.set(unlockOptions)
      })
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-unlocked', { object: activeObject })
  },

  /**
   * Выключает редактор:
   * 1) убирает все селекты, события мыши, скейл/драг–н–дроп
   * 2) делает все объекты не‑evented и не‑selectable
   * 3) делает видимым disabledOverlay поверх всех объектов в монтажной области
   */
  disable() {
    if (this.isDisabled) return

    this.historyManager.suspendHistory()
    this.isDisabled = true

    // 1) Убираем все селекты, события мыши, скейл/драг–н–дроп
    this.canvas.discardActiveObject()
    this.canvas.selection = false
    this.canvas.skipTargetFind = true

    // 2) Делаем все объекты не‑evented и не‑selectable
    this.getObjects().forEach((obj) => {
      obj.evented = false
      obj.selectable = false
    })

    // 3) (опционально) блокируем сами canvas‑элементы в DOM
    this.canvas.upperCanvasEl.style.pointerEvents = 'none'
    this.canvas.lowerCanvasEl.style.pointerEvents = 'none'

    this.disabledOverlay.visible = true
    this.updateDisabledOverlay()

    this.canvas.fire('editor:disabled')
    this.historyManager.resumeHistory()
  },

  /**
   * Включает редактор
   */
  enable() {
    if (!this.isDisabled) return

    this.historyManager.suspendHistory()
    this.isDisabled = false

    // 1) возвращаем интерактивность
    this.canvas.selection = true
    this.canvas.skipTargetFind = false

    // 2) возвращаем селекты & ивенты
    this.getObjects().forEach((obj) => {
      obj.evented = true
      obj.selectable = true
    })

    // 3) разблокируем DOM
    this.canvas.upperCanvasEl.style.pointerEvents = ''
    this.canvas.lowerCanvasEl.style.pointerEvents = ''
    this.disabledOverlay.visible = false
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:enabled')
    this.historyManager.resumeHistory()
  },

  /**
   * Импорт изображения
   * @param {Object} options
   * @param {File|string} [options.source] - URL изображения или объект File
   * @param {String} [options.scale] - Если изображение не вписывается в допустимые размеры, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'image-cover' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'scale-montage' - Обновляет backstore-резолюцию монтажной области (масштабирует
   * экспортный размер канваса под размер изображения)
   * @param {Boolean} [options.withoutSave] - Не сохранять в историю изменений
   */
  async importImage({
    source,
    scale = `image-${editorOptions.scaleType}`,
    withoutSave = false,
    contentType = 'image/png'
  }) {
    if (!source) return

    this.historyManager.suspendHistory()

    try {
      let dataUrl
      let img

      if (source instanceof File) {
        dataUrl = URL.createObjectURL(source)
      } else if (typeof source === 'string') {
        const resp = await fetch(source, { mode: 'cors' })
        const blob = await resp.blob({ type: contentType, quality: 1 })

        dataUrl = URL.createObjectURL(blob)
      } else {
        throw new Error('ImportImage. Неверный тип источника изображения. Ожидается URL или объект File.')
      }

      // Создаем blobURL и добавляем его в массив для последующего удаления (destroy)
      this._createdBlobUrls.push(dataUrl)

      const format = this.getFormatFromContentType(contentType)

      // SVG: парсим через loadSVGFromURL и группируем в один объект
      if (format === 'svg') {
        const svgData = await loadSVGFromURL(dataUrl)
        img = util.groupSVGElements(svgData.objects, svgData.options)
      } else {
        // Создаем объект FabricImage из blobURL
        img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
      }

      img.set('id', `${img.type}-${nanoid()}`)
      img.set('format', format)

      const { width: imageWidth, height: imageHeight } = img

      // Если изображение больше максимальных размеров, то даунскейлим его
      if (imageHeight > CANVAS_MAX_HEIGHT || imageWidth > CANVAS_MAX_WIDTH) {
        const resizedBlob = await this.resizeImageToBoundaries(img._element.src, 'max')
        const resizedBlobURL = URL.createObjectURL(resizedBlob)
        this._createdBlobUrls.push(resizedBlobURL)

        // Создаем новый объект FabricImage из уменьшенного dataURL
        img = await FabricImage.fromURL(resizedBlobURL, { crossOrigin: 'anonymous' })
      }

      // Растягиваем монтажную область под изображение или наоборот
      if (scale === 'scale-montage') {
        this.scaleMontageAreaToImage({ object: img, withoutSave: true })
      } else {
        const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

        const scaleFactor = calculateScaleFactor({ montageArea: this.montageArea, imageObject: img, scaleType: scale })

        if (scale === 'image-contain' && scaleFactor < 1) {
          this.fitObject({ object: img, type: 'contain', withoutSave: true })
        } else if (
          scale === 'image-cover'
          && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight)
        ) {
          this.fitObject({ object: img, type: 'cover', withoutSave: true })
        }
      }

      // Добавляем изображение, центрируем его и перерисовываем канвас
      this.canvas.add(img)
      this.canvas.centerObject(img)
      this.canvas.setActiveObject(img)
      this.canvas.renderAll()

      this.historyManager.resumeHistory()

      if (!withoutSave) {
        this.historyManager.saveState()
      }
    } catch (error) {
      console.error('importImage. Ошибка импорта изображения: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка импорта изображения: ${error.message}`
      })

      this.historyManager.resumeHistory()
    }
  },

  /**
   * Функция для ресайза изображения до максимальных размеров,
   * если оно превышает лимит. Сохраняет пропорции.
   *
   * @param {HTMLImageElement} imageEl - HTML элемент изображения
   * @param {string} [size='max | min'] - максимальный или минимальный размер
   * @returns {Promise<string>} - возвращает Promise с новым dataURL
   */
  async resizeImageToBoundaries(dataURL, size = 'max') {
    const message = `Размер изображения больше максимального размера канваса, поэтому оно будет уменьшено до максимальных размеров: ${CANVAS_MAX_WIDTH}x${CANVAS_MAX_HEIGHT}`
    console.warn(`importImage. ${message}`)

    this.canvas.fire('editor:warning', {
      message
    })

    const newDataURL = await this.workerManager.post('resizeImage', {
      dataURL,
      maxWidth: CANVAS_MAX_WIDTH,
      maxHeight: CANVAS_MAX_HEIGHT,
      sizeType: size
    })

    return newDataURL
  },

  /**
   * Масштабирование изображения
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {String} [options.type] - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.fitAsOneObject] - Масштабировать все объекты в активной группе как один объект
   * @fires editor:image-fitted
   */
  fitObject({ object, type = editorOptions.scaleType, withoutSave, fitAsOneObject } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (['activeselection'].includes(activeObject.type) && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      this.canvas.discardActiveObject()

      selectedItems.forEach((obj) => {
        const objScale = calculateScaleFactor({ montageArea: this.montageArea, imageObject: obj, scaleType: type })

        obj.scale(objScale)
        this.canvas.centerObject(obj)
      })

      const sel = new ActiveSelection(selectedItems, {
        canvas: this.canvas
      })

      this.canvas.setActiveObject(sel)
    } else {
      const scaleFactor = calculateScaleFactor({
        montageArea: this.montageArea,
        imageObject: activeObject,
        scaleType: type
      })

      activeObject.scale(scaleFactor)
      this.canvas.centerObject(activeObject)
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:image-fitted', { type })
  },

  /**
   * Получение всех объектов внутри монтажной области редактора
   * @returns {Array} массив объектов
   */
  getObjects() {
    const canvasObjects = this.canvas.getObjects()

    return canvasObjects.filter((obj) => obj.id !== this.montageArea.id && obj.id !== this.disabledOverlay.id)
  },

  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  resetObjects() {
    this.getObjects().forEach((obj) => {
      this.resetObject(obj)
    })
  },

  /**
   * Сброс масштаба объекта до дефолтного
   * @param {fabric.Object} object
   * @param {Boolean} [fitOnlyBigImage] - растягивать только большие изображения
   * @returns
   * @fires editor:object-reset
   */
  resetObject(object, { alwaysFitObject = false, withoutSave = false } = {}) {
    const currentObject = object || this.canvas.getActiveObject()

    if (!currentObject || currentObject.locked) return

    this.historyManager.suspendHistory()

    if (currentObject.type !== 'image' && currentObject.format !== 'svg') {
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

    if (alwaysFitObject) {
      this.fitObject({ object: currentObject, withoutSave: true })
    } else {
      const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea
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
          && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight)
        )
      ) {
        this.fitObject({ object: currentObject, withoutSave: true })
      } else {
        currentObject.set({ scaleX: 1, scaleY: 1 })
      }
    }

    currentObject.set({
      flipX: false,
      flipY: false,
      angle: 0
    })

    this.canvas.centerObject(currentObject)
    this.canvas.renderAll()

    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-reset')
  },

  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.preserveAspectRatio] - Сохранять изначальные пропорции монтажной области
   * @fires editor:canvas-scaled
   */
  scaleMontageAreaToImage({ object, preserveAspectRatio, withoutSave } = {}) {
    const image = object || this.canvas.getActiveObject()

    if (!image || (image.type !== 'image' && image.format !== 'svg')) return

    const { width: imageWidth, height: imageHeight } = image

    if (imageWidth < CANVAS_MIN_WIDTH || imageHeight < CANVAS_MIN_HEIGHT) {
      const message = `Размер изображения меньше минимального размера канваса, поэтому оно будет растянуто до минимальных размеров: ${CANVAS_MIN_WIDTH}x${CANVAS_MIN_HEIGHT}`

      console.warn(`importImage. ${message}`)

      this.canvas.fire('editor:warning', {
        message
      })
    }

    let newCanvasWidth = Math.min(imageWidth, CANVAS_MAX_WIDTH)
    let newCanvasHeight = Math.min(imageHeight, CANVAS_MAX_HEIGHT)

    if (preserveAspectRatio) {
      const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

      const widthMultiplier = imageWidth / montageAreaWidth
      const heightMultiplier = imageHeight / montageAreaHeight

      const multiplier = Math.max(widthMultiplier, heightMultiplier)

      newCanvasWidth = montageAreaWidth * multiplier
      newCanvasHeight = montageAreaHeight * multiplier
    }

    this.setResolutionWidth(newCanvasWidth, { withoutSave: true })
    this.setResolutionHeight(newCanvasHeight, { withoutSave: true })

    const { montageAreaWidth, montageAreaHeight } = editorOptions

    // Если изображение больше монтажной области, то устанавливаем зум по умолчанию
    if (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight) {
      this.calculateAndApplyDefaultZoom(montageAreaWidth, montageAreaHeight)
    }

    this.resetObject(image, { withoutSave: true })
    this.canvas.centerObject(image)
    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:canvas-scaled', { width: newCanvasWidth, height: newCanvasHeight })
  },

  /**
   * Извлекает чистый формат (subtype) из contentType,
   * отбросив любую часть после «+» или «;»
   * @param {string} contentType
   * @returns {string} формат, например 'png', 'jpeg', 'svg'
   */
  getFormatFromContentType(contentType = '') {
    const match = contentType.match(/^[^/]+\/([^+;]+)/)
    return match ? match[1] : ''
  },

  /**
   * Экспортирует SVG-строку в файл
   * @param {string} svgString - строка SVG
   * @param {Object} options - опции
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @param {Boolean} options.exportAsBlob - экспортировать как blob
   * @param {string} options.fileName - имя файла
   * @returns {Promise<File> | String} - файл или base64
   * @fires editor:canvas-exported
   */
  _exportSVGStringAsFile(svgString, { exportAsBase64, exportAsBlob, fileName } = {}) {
    if (exportAsBlob) {
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      return blob
    }

    if (exportAsBase64) {
      const b64 = `data:image/svg+xml;base64,${btoa(svgString)}`
      return b64
    }

    const svgFile = new File([svgString], fileName.replace(/\.[^/.]+$/, '.svg'), {
      type: 'image/svg+xml'
    })

    return svgFile
  },

  /**
   * Экспорт изображения в файл – экспортируется содержимое монтажной области.
   * Независимо от текущего зума, экспортируется монтажная область в исходном масштабе. Можно экспортировать как base64.
   * @param {Object} options - опции
   * @param {string} options.fileName - имя файла
   * @param {string} options.contentType - тип контента
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @param {Boolean} options.exportAsBlob - экспортировать как blob
   * @returns {Promise<File> | String} - файл или base64
   * @fires editor:canvas-exported
   */
  async exportCanvasAsImageFile({
    fileName = 'image.png',
    contentType = 'image/png',
    exportAsBase64 = false,
    exportAsBlob = false
  } = {}) {
    const isPDF = contentType === 'application/pdf'
    // Если это PDF, то дальше нам нужен будет .jpg
    const adjustedContentType = isPDF ? 'image/jpg' : contentType

    const format = this.getFormatFromContentType(adjustedContentType)

    // Пересчитываем координаты монтажной области:
    this.montageArea.setCoords()

    // Получаем координаты монтажной области.
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // Создаем клон канваса
    const tmpCanvas = await this.canvas.clone(['id', 'format', 'locked'])

    // Задаём белый фон если это JPG
    if (['image/jpg', 'image/jpeg'].includes(adjustedContentType)) {
      tmpCanvas.backgroundColor = '#ffffff'
    }

    // Находим монтажную область в клонированном канвасе и скрываем её
    const tmpCanvasMontageArea = tmpCanvas.getObjects().find((obj) => obj.id === this.montageArea.id)
    tmpCanvasMontageArea.visible = false

    // Сдвигаем клонированную сцену
    tmpCanvas.viewportTransform = [1, 0, 0, 1, -left, -top]
    tmpCanvas.setDimensions({ width, height }, { backstoreOnly: true })
    tmpCanvas.renderAll()

    const allCanvasItemsAreSVG = tmpCanvas.getObjects()
      .filter((object) => object.format)
      .every((object) => object.format === 'svg')

    // Если это SVG, то обрезаем через viewportTransform и backstore
    if (format === 'svg' && allCanvasItemsAreSVG) {
      // получаем SVG строку
      const svgString = tmpCanvas.toSVG()

      // Утилизируем клон
      tmpCanvas.dispose()

      const svg = this._exportSVGStringAsFile(svgString, {
        exportAsBase64,
        exportAsBlob,
        fileName
      })

      const data = {
        image: svg,
        format: 'svg',
        contentType: 'image/svg+xml',
        fileName: fileName.replace(/\.[^/.]+$/, '.svg')
      }

      this.canvas.fire('editor:canvas-exported', data)
      return data
    }

    // Получаем blob из клонированного канваса
    const blob = await new Promise((resolve) => { tmpCanvas.getElement().toBlob(resolve) })

    // Уничтожаем клон
    tmpCanvas.dispose()

    if (exportAsBlob) {
      const data = {
        image: blob,
        format,
        contentType: adjustedContentType,
        fileName
      }

      this.canvas.fire('editor:canvas-exported', data)

      return data
    }

    // Создаём bitmap из blob, отправляем в воркер и получаем dataURL
    const bitmap = await createImageBitmap(blob)
    const dataUrl = await this.workerManager.post(
      'toDataURL',
      { format, quality: 1, bitmap },
      [bitmap]
    )

    if (isPDF) {
      const pxToMm = 0.264583 // коэффициент перевода пикселей в миллиметры (при 96 DPI)
      const pdfWidth = width * pxToMm
      const pdfHeight = height * pxToMm

      const pdf = new JsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      })

      // Добавляем изображение в PDF. Используем формат PNG для изображения
      pdf.addImage(dataUrl, 'JPG', 0, 0, pdfWidth, pdfHeight)

      if (exportAsBase64) {
        const pdfBase64 = pdf.output('datauristring')

        const data = {
          image: pdfBase64,
          format: 'pdf',
          contentType: 'application/pdf',
          fileName
        }

        this.canvas.fire('editor:canvas-exported', data)
        return data
      }

      // Получаем Blob из PDF и создаем File
      const pdfBlob = pdf.output('blob')
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

      const data = {
        image: pdfFile,
        format: 'pdf',
        contentType: 'application/pdf',
        fileName
      }

      this.canvas.fire('editor:canvas-exported', data)
      return data
    }

    if (exportAsBase64) {
      const data = {
        image: dataUrl,
        format,
        contentType: adjustedContentType,
        fileName
      }

      this.canvas.fire('editor:canvas-exported', data)
      return data
    }

    // Если запрашивали SVG, но не все элементы SVG, то меняем расширение на PNG
    const adjustedFileName = format === 'svg' && !allCanvasItemsAreSVG
      ? fileName.replace(/\.[^/.]+$/, '.png')
      : fileName

    // Преобразуем Blob в File
    const file = new File([blob], adjustedFileName, { type: adjustedContentType })

    const data = {
      image: file,
      format,
      contentType: adjustedContentType,
      fileName: adjustedFileName
    }

    this.canvas.fire('editor:canvas-exported', data)
    return data
  },

  /**
   * Экспорт выбранного объекта в виде изображения или base64
   * @param {Object} options - опции
   * @param {fabric.Object} options.object - объект для экспорта
   * @param {String} options.fileName - имя файла
   * @param {String} options.contentType - тип контента
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @param {Boolean} options.exportAsBlob - экспортировать как blob
   * @returns {String} base64
   * @fires editor:object-exported
   */
  async exportObjectAsImageFile({
    object,
    fileName = 'image.png',
    contentType = 'image/png',
    exportAsBase64 = false,
    exportAsBlob = false
  } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) {
      console.error('exportObjectAsDataURL. Не выбран объект')

      this.canvas.fire('editor:error', {
        message: 'Не выбран объект для экспорта'
      })

      return ''
    }

    const format = this.getFormatFromContentType(contentType)

    if (format === 'svg') {
      // Конвертируем fabric.Object в SVG-строку
      const svgString = activeObject.toSVG()

      const svg = this._exportSVGStringAsFile(svgString, {
        exportAsBase64,
        exportAsBlob,
        fileName
      })

      const data = {
        image: svg,
        format,
        contentType: 'image/svg+xml',
        fileName: fileName.replace(/\.[^/.]+$/, '.svg')
      }

      this.canvas.fire('editor:object-exported', data)
      return data
    }

    if (exportAsBase64) {
      const bitmap = await createImageBitmap(activeObject._element)
      const dataUrl = await this.workerManager.post(
        'toDataURL',
        {
          format,
          quality: 1,
          bitmap
        },
        [bitmap]
      )

      const data = {
        image: dataUrl,
        format,
        contentType,
        fileName
      }

      this.canvas.fire('editor:object-exported', data)
      return data
    }

    const activeObjectCanvas = activeObject.toCanvasElement()
    const activeObjectBlob = await new Promise((resolve) => { activeObjectCanvas.toBlob(resolve) })

    if (exportAsBlob) {
      const data = {
        image: activeObjectBlob,
        format,
        contentType,
        fileName
      }

      this.canvas.fire('editor:object-exported', data)
      return data
    }

    // Преобразуем Blob в File
    const file = new File([activeObjectBlob], fileName, { type: contentType })

    const data = {
      image: file,
      format,
      contentType,
      fileName
    }

    this.canvas.fire('editor:object-exported', data)
    return data
  },

  /**
   * Группировка объектов
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @param {fabric.Object[]} options.objects - массив объектов для группировки
   * @fires editor:objects-grouped
   */
  group({ withoutSave } = {}) {
    this.historyManager.suspendHistory()
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type !== 'activeselection') {
      return
    }

    // Получаем все объекты внутри активной селекции, группируем их и удаляем из канваса
    const objectsToGroup = activeObject.getObjects()

    const group = new Group(objectsToGroup)
    objectsToGroup.forEach((obj) => this.canvas.remove(obj))

    group.set('id', `${group.type}-${nanoid()}`)
    this.canvas.add(group)
    this.canvas.setActiveObject(group)
    this.canvas.renderAll()

    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:objects-grouped')
  },

  /**
   * Разгруппировка объектов
   * @param {fabric.Group} obj - группа объектов
   * @fires editor:objects-ungrouped
   */
  ungroup({ object, withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const group = object || this.canvas.getActiveObject()

    if (!group || group.type !== 'group') {
      return
    }

    const grouppedObjects = group.removeAll()
    this.canvas.remove(group)

    grouppedObjects.forEach((grouppedObj) => this.canvas.add(grouppedObj))

    const sel = new ActiveSelection(grouppedObjects, {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.renderAll()

    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:objects-ungrouped')
  },

  /**
   * Удалить выбранные объекты
   * @param {Object} options
   * @param {fabric.Object[]} options.objects - массив объектов для удаления
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-deleted
   */
  deleteSelectedObjects({ objects, withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObjects = objects || this.canvas.getActiveObjects()

    if (!activeObjects?.length) return

    activeObjects.forEach((obj) => {
      if (obj.type === 'group' && obj.format !== 'svg') {
        this.ungroup(obj)
        this.deleteSelectedObjects()

        return
      }

      this.canvas.remove(obj)
    })

    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:objects-deleted')
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
   * @fires editor:cleared
   */
  clearCanvas() {
    this.historyManager.suspendHistory()
    // Сохраняем ссылку на монтажную область
    const { montageArea } = this

    // Полностью очищаем канвас (удаляются все объекты, фоны, оверлеи и т.д.)
    this.canvas.clear()

    // Добавляем монтажную область обратно
    this.canvas.add(montageArea)

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    this.historyManager.saveState()

    this.canvas?.fire('editor:cleared')
  },

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  selectAll() {
    this.canvas.discardActiveObject()

    const sel = new ActiveSelection(this.getObjects(), {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:all-objects-selected', { selected: sel })
  },

  /**
   * Копирование объекта
   * @fires editor:object-copied
   */
  async copy() {
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    try {
      const clonedObject = await activeObject.clone()
      this.clipboard = clonedObject

      // Сохраняем объект в буфере обмена, если он доступен
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
        console.warn(
          'copy. navigator.clipboard не поддерживается в этом браузере или отсутствует соединение по HTTPS-протоколу'
        )

        this.canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      if (this.clipboard.type !== 'image') {
        await navigator.clipboard.writeText(['application/image-editor', JSON.stringify(clonedObject)])

        this.canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      const clonedObjectCanvas = clonedObject.toCanvasElement()
      const clonedObjectBlob = await new Promise((resolve) => { clonedObjectCanvas.toBlob(resolve) })

      const clipboardItem = new ClipboardItem({ [clonedObjectBlob.type]: clonedObjectBlob })
      await navigator.clipboard.write([clipboardItem])

      this.canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      console.error('copy. Ошибка записи в системный буфер обмена: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка записи в системный буфер обмена: ${error.message}`
      })
    }
  },

  /**
   * Вставка объекта
   * @fires editor:object-pasted
   */
  async paste() {
    if (!this.clipboard) return

    // clone again, so you can do multiple copies.
    const clonedObj = await this.clipboard.clone()
    this.canvas.discardActiveObject()
    clonedObj.set({
      id: `${clonedObj.type}-${nanoid()}`,
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true
    })
    if (clonedObj instanceof ActiveSelection) {
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

    this.canvas.fire('editor:object-pasted', { object: clonedObj })
  },

  /**
   * Метод рассчитывает дефолтный, максимальный, и минимальный зум таким образом,
   * чтобы монтажная область визуально занимала переданные размеры.
   * Если размеры не переданы, то используются дефолтные размеры монтажной области переданные в editorOptions.
   * @param {number} [targetWidth]  — желаемая видимая ширина (px)
   * @param {number} [targetHeight] — желаемая видимая высота (px)
   */
  calculateAndApplyDefaultZoom(
    targetWidth = editorOptions.montageAreaWidth,
    targetHeight = editorOptions.montageAreaHeight
  ) {
    const { width: montageWidth, height: montageHeight } = this.montageArea

    const scaleX = targetWidth / montageWidth
    const scaleY = targetHeight / montageHeight

    // выбираем меньший зум, чтобы монтажная область целиком помещалась
    const defaultZoom = Math.min(scaleX, scaleY)

    const { minZoom, maxZoom, maxZoomFactor } = editorOptions

    // устанавливаем допустимые пределы зума
    this.minZoom = Math.min(defaultZoom / maxZoomFactor, minZoom)
    this.maxZoom = Math.max(defaultZoom * maxZoomFactor, maxZoom)

    // запоминаем дефолтный зум
    this.defaultZoom = defaultZoom

    // применяем дефолтный зум
    this.setZoom(defaultZoom)
  },

  /**
   * Увеличение/уменьшение масштаба
   * @param {Number} scale - Шаг зума
   * @param {Object} options - Координаты зума (по умолчанию центр канваса)
   * @param {Number} options.pointX - Координата X точки зума
   * @param {Number} options.pointY - Координата Y точки зума
   * @fires editor:zoom-changed
   * Если передавать координаты курсора, то нужно быть аккуратнее, так как юзер может выйти за пределы рабочей области
   */
  zoom(scale = DEFAULT_ZOOM_RATIO, options = {}) {
    if (!scale) return

    const { minZoom, maxZoom } = this

    const currentZoom = this.canvas.getZoom()
    const pointX = options.pointX ?? this.canvas.getWidth() / 2
    const pointY = options.pointY ?? this.canvas.getHeight() / 2

    let zoom = Number((currentZoom + Number(scale)).toFixed(2))

    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    console.log('currentZoom', currentZoom)

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, zoom)

    this.canvas.fire('editor:zoom-changed', {
      currentZoom: this.canvas.getZoom(),
      zoom,
      pointX,
      pointY
    })
  },

  /**
   * Установка зума
   * @param {Number} zoom - Зум
   * @fires editor:zoom-changed
   */
  setZoom(zoom = this.defaultZoom) {
    const pointX = this.canvas.getWidth() / 2
    const pointY = this.canvas.getHeight() / 2

    let newZoom = zoom

    const { minZoom, maxZoom } = this

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, newZoom)

    this.canvas.fire('editor:zoom-changed', {
      currentZoom: this.canvas.getZoom(),
      zoom: newZoom,
      pointX,
      pointY
    })
  },

  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  resetZoom() {
    const pointX = this.canvas.getWidth() / 2
    const pointY = this.canvas.getHeight() / 2

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, this.defaultZoom)

    this.canvas.fire('editor:zoom-changed', { currentZoom: this.canvas.getZoom() })
  },

  /**
   * Установка зума и масштаба для канваса и объекта по умолчанию
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:default-scale-set
   */
  setDefaultScale({ withoutSave } = {}) {
    this.resetZoom()
    this.setResolutionWidth(editorOptions.montageAreaWidth, { withoutSave: true })
    this.setResolutionHeight(editorOptions.montageAreaHeight, { withoutSave: true })
    this.canvas.renderAll()

    this.resetObjects()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:default-scale-set')
  },

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-to-front
   */
  bringToFront(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj) => {
        this.canvas.bringObjectToFront(obj)
      })
    } else {
      this.canvas.bringObjectToFront(activeObject)
    }

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-bring-to-front')
  },

  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-forward
   */
  bringForward(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      const canvasObjects = this.canvas.getObjects()
      const selectedObjects = activeObject.getObjects()

      // Сдвигаем выделенные объекты вверх относительно ближайшего верхнего объекта, начиная с верхнего
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        const obj = selectedObjects[i]
        const currentIndex = canvasObjects.indexOf(obj)

        let nextIndex = currentIndex + 1

        // Ищем ближайший индекс сверху, не входящий в выделение
        while (
          nextIndex < canvasObjects.length
        && selectedObjects.includes(canvasObjects[nextIndex])
        ) {
          nextIndex += 1
        }

        if (nextIndex === canvasObjects.length) continue

        this.canvas.moveObjectTo(obj, nextIndex)
      }
    } else {
      this.canvas.bringObjectForward(activeObject)
    }

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-bring-forward')
  },

  /**
 * Отправить объект на задний план по оси Z
 * @param {fabric.Object} object
 * @param {Object} options
 * @param {Boolean} options.withoutSave - Не сохранять состояние
 * @fires editor:object-send-to-back
 */
  sendToBack(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      const selectedObjects = activeObject.getObjects()

      // Отправляем объекты на нижний слой, начиная с нижнего объекта выделения
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        this.canvas.sendObjectToBack(selectedObjects[i])
      }
    } else {
      this.canvas.sendObjectToBack(activeObject)
    }

    // Служебные элементы отправляем вниз
    this.canvas.sendObjectToBack(this.montageArea)
    this.canvas.sendObjectToBack(this.disabledOverlay)

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-send-to-back')
  },

  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param {fabric.Object} object
  * @param {Object} options
  * @param {Boolean} options.withoutSave - Не сохранять состояние
  */
  sendBackwards(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    // Обработка активного выделения
    if (activeObject.type === 'activeselection') {
      const canvasObjects = this.canvas.getObjects()
      const selectedObjects = activeObject.getObjects()

      // Находим минимальный индекс среди выделенных объектов
      const minSelectedIndex = Math.min(...selectedObjects.map((obj) => canvasObjects.indexOf(obj)))

      // Перемещаем выделенные объекты вниз относительно ближайшего нижнего объекта, начиная с нижнего
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        this.canvas.moveObjectTo(selectedObjects[i], minSelectedIndex - 1)
      }
    } else {
      this.canvas.sendObjectBackwards(activeObject)
    }

    // Служебные элементы отправляем вниз
    this.canvas.sendObjectToBack(this.montageArea)
    this.canvas.sendObjectToBack(this.disabledOverlay)

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-send-backwards')
  },

  /**
   * Поворот объекта на заданный угол
   * @param {number} angle
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  rotate(angle = DEFAULT_ROTATE_RATIO, { withoutSave } = {}) {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-rotated', { angle: newAngle })
  },

  /**
   * Отразить по горизонтали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  flipX({ withoutSave } = {}) {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-flipped-x')
  },

  /**
   * Отразить по вертикали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  flipY({ withoutSave } = {}) {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-flipped-y')
  },

  /**
   * Установка прозрачности объекта
   * @param {Number} opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   */
  setActiveObjectOpacity({ object, opacity = 1, withoutSave } = {}) {
    const activeObject = object || this.canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj) => {
        obj.set('opacity', opacity)
      })
    } else {
      activeObject.set('opacity', opacity)
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-opacity-changed', opacity)
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
  addRectangle({
    left,
    top,
    width = 100,
    height = 100,
    color = 'blue',
    originX = 'center',
    originY = 'center'
  } = {}) {
    const rect = new Rect({
      id: `rect-${nanoid()}`,
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
  addCircle({
    left,
    top,
    radius = 50,
    color = 'green',
    originX = 'center',
    originY = 'center'
  } = {}) {
    const circle = new Circle({
      id: `circle-${nanoid()}`,
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
  addTriangle({
    left,
    top,
    width = 100,
    height = 100,
    originX = 'center',
    originY = 'center',
    color = 'yellow'
  } = {}) {
    const triangle = new Triangle({
      id: `triangle-${nanoid()}`,
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

  // TODO: Проверить что работает
  // Пример с ClipPath
  // cropImage(imageObj, cropRect) {
  //   // cropRect — это объект { left, top, width, height },
  //   // который задаёт рамку для обрезки

  //   imageObj.clipPath = new fabric.Rect({
  //     left: cropRect.left,
  //     top: cropRect.top,
  //     width: cropRect.width,
  //     height: cropRect.height,
  //     absolutePositioned: true // Чтобы учитывались координаты именно канвы, а не локальные
  //   })

  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // Пример с «ручной» обрезкой (создаём новый fabric.Image)
  // cropImageAndReplace(imageObj, cropRect) {
  //   // 1. Создаём промежуточный <canvas> (DOM)
  //   const tempCanvas = document.createElement('canvas')
  //   const ctx = tempCanvas.getContext('2d')

  //   // Задаём размеры временного canvas
  //   tempCanvas.width = cropRect.width
  //   tempCanvas.height = cropRect.height

  //   // Копируем нужную часть
  //   // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  //   ctx.drawImage(
  //     imageObj._element,
  //     cropRect.left,
  //     cropRect.top,
  //     cropRect.width,
  //     cropRect.height,
  //     0,
  //     0,
  //     cropRect.width,
  //     cropRect.height
  //   )

  //   // 2. Получаем dataURL
  //   const dataURL = tempCanvas.toDataURL()

  //   // 3. Удаляем старый объект из canvas
  //   this.canvas.remove(imageObj)

  //   // 4. Создаём новый объект из dataURL
  //   fabric.FabricImage.fromURL(dataURL, (croppedImg) => {
  //     croppedImg.set({
  //       left: imageObj.left,
  //       top: imageObj.top
  //     })
  //     this.canvas.add(croppedImg)
  //     this.canvas.renderAll()
  //   })
  // },

  // TODO: Проверить что работает
  // addText(text) {
  //   const textObj = new fabric.FabricText(text, { left: 100, top: 100 })
  //   this.canvas.add(textObj)
  //   this.canvas.renderAll()
  // },

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
  // addSticker(url) {
  //   fabric.fabricFabricImage.fromURL(url, (img) => {
  //     img.set({
  //       left: 100,
  //       top: 100
  //       // можно что-то поднастроить...
  //     })
  //     this.canvas.add(img)
  //     this.canvas.renderAll()
  //   })
  // },

  // TODO: Проверить что работает. Возможно это должно быть внутренней фичей
  // hideControls(imageObj) {
  //   imageObj.set({
  //     hasControls: true, // разрешает уголки для маштабирования/вращения
  //     lockRotation: false // если хотим разрешить вращение, это должно быть false
  //   })
  // },

  // TODO: Проверить что работает
  // applyGradient(object) {
  //   // Допустим, линейный градиент слева направо
  //   const gradient = new fabric.fabricGradient({
  //     type: 'linear',
  //     gradientUnits: 'pixels', // или 'percentage'
  //     coords: {
  //       x1: 0,
  //       y1: 0,
  //       x2: object.width,
  //       y2: 0
  //     },
  //     colorStops: [
  //       { offset: 0, color: 'red' },
  //       { offset: 1, color: 'blue' }
  //     ]
  //   })
  //   object.set('fill', gradient)
  //   this.canvas.renderAll()

  //   // Для тени
  //   // object.setShadow({
  //   //   color: 'rgba(0,0,0,0.3)',
  //   //   blur: 5,
  //   //   offsetX: 5,
  //   //   offsetY: 5
  //   // });
  //   // this.canvas.renderAll();
  // },

  // TODO: Проверить что работает
  // applyBrightness() {
  //   const obj = this.canvas.getActiveObject()
  //   if (!obj || obj.type !== 'image') return
  //   const brightnessFilter = new fabric.fabricImage.filters.Brightness({
  //     brightness: 0.2
  //   })
  //   obj.filters[0] = brightnessFilter
  //   obj.applyFilters()
  //   this.canvas.renderAll()
  // },

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
  // applyFilters(imageObj) {
  //   const saturationFilter = new fabric.fabricImage.filters.Saturation({
  //     saturation: 0.5 // 0.5 — это пример, смотрите документацию
  //   })
  //   imageObj.filters.push(saturationFilter)
  //   imageObj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // removeFilter() {
  //   const obj = this.canvas.getActiveObject()
  //   if (!obj || obj.type !== 'image') return
  //   obj.filters = []
  //   obj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // setDrawingModeOn() {
  //   this.canvas.freeDrawingBrush = new fabric.fabricPencilBrush(this.canvas)
  //   this.canvas.isDrawingMode = true
  //   this.canvas.freeDrawingBrush.color = '#ff0000'
  //   this.canvas.freeDrawingBrush.width = 5
  // },

  // TODO: Проверить что работает
  // setDrawingModeOff() {
  //   this.canvas.isDrawingMode = false
  // }
})
