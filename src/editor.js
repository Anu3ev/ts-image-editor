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

    this.defaultZoom = options.defaultScale

    this.minZoom = options.minZoom || MIN_ZOOM
    this.maxZoom = options.maxZoom || MAX_ZOOM

    this.canvas = new fabric.Canvas(canvasId, options)

    this.montageArea = new fabric.Rect({
      width: options.montageAreaWidth,
      height: options.montageAreaWidth,
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

  async init() {
    this.canvas.add(this.montageArea)

    // Создаем область для клиппинга (без fill, чтобы не влиял на экспорт)
    const montageAreaClip = new fabric.Rect({
      width: this.options.montageAreaWidth,
      height: this.options.montageAreaWidth,
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

    this.setEditorContainerWidth(this.options.editorContainerWidth)
    this.setEditorContainerHeight(this.options.editorContainerHeight)
    this.setCanvasWrapperWidth(this.options.canvasWrapperWidth)
    this.setCanvasWrapperHeight(this.options.canvasWrapperHeight)
    this.setCanvasCSSWidth(this.options.canvasCSSWidth)
    this.setCanvasCSSHeight(this.options.canvasCSSHeight)

    if (this.options.initialImage?.url) {
      const {
        url,
        scaleType = 'scale-montage',
        withoutSave = true
      } = this.options.initialImage

      await this.importImage({ url, scale: scaleType, withoutSave })
    } else {
      this.setDefaultScale({ withoutSave: true })
    }

    if (this.options.initialStateJSON) {
      console.log('options.initialStateJSON', this.options.initialStateJSON)
      this.loadStateFromFullState(this.options.initialStateJSON)
    }

    this.saveState()

    this.canvas.fire('editor:ready', this)
  }

  get skipHistory() {
    return this._historySuspendCount > 0
  }

  /**
   * Создаёт overlay для блокировки монтажной области
   */
  createDisabledOverlay() {
    this.suspendHistory()

    // получаем координаты монтажной области
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // создаём overlay‑объект
    this.disabledOverlay = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: this.options.disabledOverlayColor,
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
