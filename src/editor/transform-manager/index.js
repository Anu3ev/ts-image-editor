import { ActiveSelection } from 'fabric'

import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_ROTATE_RATIO
} from '../constants'

import { calculateScaleFactor } from '../helpers'

export default class TransformManager {
  /**
   * @param {object} options
   * @param {object} options.editor - экземпляр редактора с доступом к canvas
   * @param {object} options.editorOptions - опции редактора
   */
  constructor({ editor, editorOptions }) {
    this.editor = editor
    this.editorOptions = editorOptions
  }

  /**
   * Метод рассчитывает дефолтный, максимальный, и минимальный зум таким образом,
   * чтобы монтажная область визуально занимала переданные размеры.
   * Если размеры не переданы, то используются дефолтные размеры монтажной области переданные в editorOptions.
   * @param {number} [targetWidth]  — желаемая видимая ширина (px)
   * @param {number} [targetHeight] — желаемая видимая высота (px)
   */
  calculateAndApplyDefaultZoom(
    targetWidth = this.editorOptions.montageAreaWidth,
    targetHeight = this.editorOptions.montageAreaHeight
  ) {
    const { width: montageWidth, height: montageHeight } = this.editor.montageArea

    const scaleX = targetWidth / montageWidth
    const scaleY = targetHeight / montageHeight

    // выбираем меньший зум, чтобы монтажная область целиком помещалась
    const defaultZoom = Math.min(scaleX, scaleY)

    const { minZoom, maxZoom, maxZoomFactor } = this.editorOptions

    // устанавливаем допустимые пределы зума
    this.minZoom = Math.min(defaultZoom / maxZoomFactor, minZoom)
    this.maxZoom = Math.max(defaultZoom * maxZoomFactor, maxZoom)

    // запоминаем дефолтный зум
    this.defaultZoom = defaultZoom

    // применяем дефолтный зум
    this.setZoom(defaultZoom)
  }

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

    const { canvas, minZoom, maxZoom } = this.editor

    const currentZoom = canvas.getZoom()
    const pointX = options.pointX ?? canvas.getWidth() / 2
    const pointY = options.pointY ?? canvas.getHeight() / 2

    let zoom = Number((currentZoom + Number(scale)).toFixed(2))

    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    console.log('currentZoom', currentZoom)

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, zoom)

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom,
      pointX,
      pointY
    })
  }

  /**
   * Установка зума
   * @param {Number} zoom - Зум
   * @fires editor:zoom-changed
   */
  setZoom(zoom = this.defaultZoom) {
    const { canvas, minZoom, maxZoom } = this.editor

    const pointX = canvas.getWidth() / 2
    const pointY = canvas.getHeight() / 2

    let newZoom = zoom

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, newZoom)

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom: newZoom,
      pointX,
      pointY
    })
  }

  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  resetZoom() {
    const { canvas, defaultZoom } = this.editor

    const pointX = canvas.getWidth() / 2
    const pointY = canvas.getHeight() / 2

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, defaultZoom)

    this.editor.canvas.fire('editor:zoom-changed', { currentZoom: canvas.getZoom() })
  }

  /**
   * Поворот объекта на заданный угол
   * @param {number} angle
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  rotate(angle = DEFAULT_ROTATE_RATIO, { withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-rotated', { angle: newAngle })
  }

  /**
   * Отразить по горизонтали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  flipX({ withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-x')
  }

  /**
   * Отразить по вертикали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  flipY({ withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-y')
  }

  /**
   * Установка прозрачности объекта
   * @param {Number} opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   */
  setActiveObjectOpacity({ object, opacity = 1, withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj) => {
        obj.set('opacity', opacity)
      })
    } else {
      activeObject.set('opacity', opacity)
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-opacity-changed', opacity)
  }

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
  fitObject({ object, type = this.editorOptions.scaleType, withoutSave, fitAsOneObject } = {}) {
    const { canvas, montageArea, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (['activeselection'].includes(activeObject.type) && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      canvas.discardActiveObject()

      selectedItems.forEach((obj) => {
        const objScale = calculateScaleFactor({ montageArea, imageObject: obj, scaleType: type })

        obj.scale(objScale)
        canvas.centerObject(obj)
      })

      const sel = new ActiveSelection(selectedItems, { canvas })

      canvas.setActiveObject(sel)
    } else {
      const scaleFactor = calculateScaleFactor({
        montageArea,
        imageObject: activeObject,
        scaleType: type
      })

      activeObject.scale(scaleFactor)
      canvas.centerObject(activeObject)
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:image-fitted', { type })
  }

  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  resetObjects() {
    this.editor.getObjects().forEach((obj) => {
      this.resetObject(obj)
    })
  }

  /**
   * Сброс масштаба объекта до дефолтного
   * @param {fabric.Object} object
   * @param {Boolean} [fitOnlyBigImage] - растягивать только большие изображения
   * @returns
   * @fires editor:object-reset
   */
  resetObject(object, { alwaysFitObject = false, withoutSave = false } = {}) {
    const { canvas, montageArea, historyManager } = this.editor

    const currentObject = object || canvas.getActiveObject()

    if (!currentObject || currentObject.locked) return

    historyManager.suspendHistory()

    if (currentObject.type !== 'image' && currentObject.format !== 'svg') {
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

    if (alwaysFitObject) {
      this.fitObject({ object: currentObject, withoutSave: true })
    } else {
      const { width: montageAreaWidth, height: montageAreaHeight } = montageArea
      const { width: imageWidth, height: imageHeight } = currentObject

      const scaleFactor = calculateScaleFactor({
        montageArea,
        imageObject: currentObject,
        scaleType: this.editorOptions.scaleType
      })

      // Делаем contain и cover только если размеры изображения больше размеров канваса, иначе просто сбрасываем
      if (
        (this.editorOptions.scaleType === 'contain' && scaleFactor < 1)
        || (
          this.editorOptions.scaleType === 'cover'
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

    canvas.centerObject(currentObject)
    canvas.renderAll()

    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-reset')
  }
}
