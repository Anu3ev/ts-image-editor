// TODO: Импортировать только то что нужно из fabric
import * as fabric from 'fabric'

import methods from './methods'
import Listeners from './listeners'

import {
  MIN_ZOOM,
  MAX_ZOOM
} from './constants'

import {
  createMosaicPattern
} from './helpers'

// TODO: Режим рисования
// TODO: Тулбар появляющийся под выделенным объектом и возможность передачи кнопок в тулбар
// TODO: Кастомные стили
// TODO: Добавление текста
// TODO: drag'n'drop картинки
// TODO: Сделать снэп (прилипание к краям и центру)
// TODO: Разделить внутренние методы и публичные
// TODO: Подумать как работать с переводами в редакторе
// TODO: Учитывать что в редактор может прилететь SVG и на выходе тоже нужно получить SVG

/**
 * Класс редактора изображений.
 * @class
 * @param {string} canvasId - идентификатор канваса
 * @param {object} options - опции и настройки
 *
 * @fires {object} editor:render-complete - событие, которое срабатывает после завершения рендеринга редактора
 */
class ImageEditor {
  constructor(canvasId, options = {}) {
    this.options = options

    const { defaultScale, minZoom, maxZoom, montageAreaWidth, montageAreaHeight } = options

    this.isLoading = false
    this.isDisable = false
    this.disabledOverlay = null
    this.clipboard = null

    this._createdBlobUrls = []
    this._historySuspendCount = 0
    this.history = {
      // Базовое состояние от которого будет строиться история
      baseState: null,
      // Массив диффов (каждый дифф – результат jsondiffpatch.diff(prevState, nextState))
      patches: [],
      // Текущая позиция в истории (0 означает базовое состояние)
      currentIndex: 0,
      // Максимальное количество сохранённых диффов
      maxHistoryLength: 50
    }

    this.defaultZoom = defaultScale

    this.minZoom = minZoom || MIN_ZOOM
    this.maxZoom = maxZoom || MAX_ZOOM

    this._customizeControls()

    this.canvas = new fabric.Canvas(canvasId, options)

    this.montageArea = new fabric.Rect({
      width: montageAreaWidth,
      height: montageAreaHeight,
      fill: createMosaicPattern(fabric),
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      id: 'montage-area',
      originX: 'center',
      originY: 'center',
      objectCaching: false,
      noScaleCache: true
    })

    this.init()
  }

  _customizeControls() {
    const SQUARE_SIZE = 12
    const CIRCLE_SIZE = 32
    const VERTICAL_RECT_SIZE_X = 8
    const VERTICAL_RECT_SIZE_Y = 20
    const HORIZONTAL_RECT_SIZE_X = 20
    const HORIZONTAL_RECT_SIZE_Y = 8

    const defaultControls = fabric.controlsUtils.createObjectDefaultControls()

    // Кастомная отрисовка квадратных контролов (угловые)
    const renderSquare = (ctx, left, top, styleOverride, fabricObject) => {
      console.log('renderSquare', ctx, left, top, styleOverride, fabricObject)

      const size = SQUARE_SIZE
      const radius = 2
      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle))
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#3D8BF4'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-size / 2, -size / 2, size, size, radius)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // Кастомная отрисовка прямоугольных контролов (середина сторон)
    const renderVerticalRect = (ctx, left, top, styleOverride, fabricObject) => {
      const width = VERTICAL_RECT_SIZE_X
      const height = VERTICAL_RECT_SIZE_Y
      const radius = 100

      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle))
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#3D8BF4'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-width / 2, -height / 2, width, height, radius)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // Кастомная отрисовка прямоугольных контролов (середина сторон)
    const renderHorizontalRect = (ctx, left, top, styleOverride, fabricObject) => {
      const width = HORIZONTAL_RECT_SIZE_X
      const height = HORIZONTAL_RECT_SIZE_Y
      const radius = 100

      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle))
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#3D8BF4'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-width / 2, -height / 2, width, height, radius)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    const rotateIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE4Ljc1IDQuMzc1djMuNzVhLjYyNS42MjUgMCAwIDEtLjYyNS42MjVoLTMuNzVhLjYyNS42MjUgMCAwIDEgMC0xLjI1aDIuMTRsLTIuMDc3LTEuOTAzLS4wMi0uMDE5YTYuMjUgNi4yNSAwIDEgMC0uMTMgOC45NjcuNjI2LjYyNiAwIDAgMSAuODYuOTA5QTcuNDU2IDcuNDU2IDAgMCAxIDEwIDE3LjVoLS4xMDNhNy41IDcuNSAwIDEgMSA1LjM5Ni0xMi44MTJMMTcuNSA2LjcwM1Y0LjM3NWEuNjI1LjYyNSAwIDAgMSAxLjI1IDBaIi8+PC9zdmc+'

    var rotateImg = document.createElement('img');
    rotateImg.src = rotateIcon

    const _renderRotationControl = (ctx, left, top, styleOverride, fabricObject) => {
      const size = CIRCLE_SIZE
      const radius = size / 2

      // Рисуем круглый фон
      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle))
      ctx.fillStyle = '#2B2D33'
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, 2 * Math.PI)
      ctx.fill()
      ctx.drawImage(rotateImg, -radius / 2, -radius / 2, radius, radius)
      ctx.restore()
    }

    // const renderIcon = (ctx, left, top, _styleOverride, fabricObject) => {
    //   const size = 32;
    //   ctx.save();
    //   ctx.translate(left, top);
    //   ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    //   ctx.drawImage(rotateImg, -size / 2, -size / 2, size, size);
    //   ctx.restore();
    // }

    // const deleteBtn = new fabric.Control({
    //   x: 0.5,
    //   y: -0.5,
    //   offsetY: 16,
    //   cursorStyle: 'pointer',
    //   mouseUpHandler: rotateImg,
    //   render: renderIcon,
    //   cornerSize: 24,
    // });

    // Применяем кастомные рендеры к каждому типу контролов
    for (const key in defaultControls) {
      if (['tl', 'tr', 'bl', 'br'].includes(key)) {
        defaultControls[key].render = renderSquare
        defaultControls[key].sizeX = SQUARE_SIZE
        defaultControls[key].sizeY = SQUARE_SIZE
      } else if (key === 'mtr') {
        defaultControls[key].render = _renderRotationControl
        defaultControls[key].sizeX = CIRCLE_SIZE
        defaultControls[key].sizeY = CIRCLE_SIZE
        defaultControls[key].offsetY = -CIRCLE_SIZE
      } else if (['ml', 'mr'].includes(key)) {
        defaultControls[key].render = renderVerticalRect
        defaultControls[key].sizeX = VERTICAL_RECT_SIZE_X
        defaultControls[key].sizeY = VERTICAL_RECT_SIZE_Y
      } else {
        defaultControls[key].render = renderHorizontalRect
        defaultControls[key].sizeX = HORIZONTAL_RECT_SIZE_X
        defaultControls[key].sizeY = HORIZONTAL_RECT_SIZE_Y
      }
    }

    this.customControls = defaultControls

    const originalAdd = fabric.Canvas.prototype.add

    fabric.Canvas.prototype.add = function(...objects) {
      objects.forEach((obj) => {
        console.log('obj', obj)
        console.log('this', this)

        if (!obj.controlsCustomized) {
          obj.controls = defaultControls
          obj.controlsCustomized = true
        }
      })

      return originalAdd.call(this, ...objects)
    }
  }

  async init() {
    const {
      montageAreaWidth,
      montageAreaHeight,
      editorContainerWidth,
      editorContainerHeight,
      canvasWrapperWidth,
      canvasWrapperHeight,
      canvasCSSWidth,
      canvasCSSHeight,
      initialImage,
      initialStateJSON,
      scaleType,
      _onReadyCallback
    } = this.options

    this.canvas.add(this.montageArea)

    // Создаем область для клиппинга (без fill, чтобы не влиял на экспорт)
    const montageAreaClip = new fabric.Rect({
      width: montageAreaWidth,
      height: montageAreaHeight,
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      id: 'area-clip',
      originX: 'center',
      originY: 'center'
    })

    this.canvas.clipPath = montageAreaClip

    Object.assign(
      this,
      methods({
        fabric,
        editorOptions: this.options
      })
    )

    this.listeners = new Listeners({ editor: this, options: this.options })

    this.initEditorWorker()
    this.createDisabledOverlay()

    this.setEditorContainerWidth(editorContainerWidth)
    this.setEditorContainerHeight(editorContainerHeight)
    this.setCanvasWrapperWidth(canvasWrapperWidth)
    this.setCanvasWrapperHeight(canvasWrapperHeight)
    this.setCanvasCSSWidth(canvasCSSWidth)
    this.setCanvasCSSHeight(canvasCSSHeight)

    if (initialImage?.source) {
      const {
        source,
        scale = `image-${scaleType}`,
        withoutSave = true,
        contentType
      } = initialImage

      await this.importImage({ source, scale, withoutSave, contentType })
    } else {
      this.setDefaultScale({ withoutSave: true })
    }

    if (initialStateJSON) {
      this.loadStateFromFullState(initialStateJSON)
    }

    this.saveState()

    console.log('editor:ready')

    this.canvas.fire('editor:ready', this)

    // вызываем колбэк если он есть
    if (typeof _onReadyCallback === 'function') {
      _onReadyCallback(this)
    }
  }

  get skipHistory() {
    return this._historySuspendCount > 0
  }

  /**
   * Создаёт overlay для блокировки монтажной области
   */
  createDisabledOverlay() {
    this.suspendHistory()

    const { disabledOverlayColor } = this.options

    // получаем координаты монтажной области
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // создаём overlay‑объект
    this.disabledOverlay = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: disabledOverlayColor,
      selectable: false,
      evented: true,
      hoverCursor: 'not‑allowed',
      hasBorders: false,
      hasControls: false,
      visible: false,
      id: 'disabled-overlay'
    })

    // рисуем его поверх всех
    this.canvas.add(this.disabledOverlay)
    this.canvas.renderAll()
    this.resumeHistory()
  }

  initEditorWorker() {
    this.worker = new Worker(
      new URL('./worker.js', import.meta.url),
      { type: 'module' }
    )

    // будем хранить колбэки по requestId
    this._callbacks = new Map()

    // общий onmessage для всех
    this.worker.onmessage = ({ data }) => {
      const { requestId, success, data: payload, error } = data
      const cb = this._callbacks.get(requestId)
      if (!cb) return

      if (success) {
        cb.resolve(payload)
      } else {
        cb.reject(new Error(error))
      }

      this._callbacks.delete(requestId)
    }
  }

  /**
   * Метод для удаления редактора и всех слушателей.
   */
  destroy() {
    this.listeners.destroy()
    this.canvas.dispose()
    this.worker.terminate()

    // удаляем все созданные blob-URL
    this._createdBlobUrls.forEach(URL.revokeObjectURL)
    this._createdBlobUrls = []
  }
}

export default ImageEditor
