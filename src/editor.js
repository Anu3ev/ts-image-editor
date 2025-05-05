// TODO: Импортировать только то что нужно из fabric
import * as fabric from 'fabric'

import { nanoid } from 'nanoid'
import methods from './methods'
import Listeners from './listeners'
import CustomizedControls from './customized-controls'
import ToolbarManager from './ui/toolbar-manager'

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

    this.containerId = canvasId
    this.editorId = `${canvasId}-${nanoid()}`
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

    CustomizedControls.apply()

    this.canvas = new fabric.Canvas(canvasId, options)

    // TODO: Рассмотреть возможность использования свойства excludeFromExport
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

    this.toolbar = new ToolbarManager(this)

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
    this.toolbar.destroy()
    this.canvas.dispose()
    this.worker.terminate()

    // удаляем все созданные blob-URL
    this._createdBlobUrls.forEach(URL.revokeObjectURL)
    this._createdBlobUrls = []
  }
}

export default ImageEditor
