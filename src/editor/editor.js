import { Canvas, Rect } from 'fabric'

import { nanoid } from 'nanoid'
import methods from './methods'
import Listeners from './listeners'
import WorkerManager from './worker-manager'
import CustomizedControls from './customized-controls'
import ToolbarManager from './ui/toolbar-manager'
import HistoryManager from './history-manager'
import ImageManager from './image-manager'
import CanvasManager from './canvas-manager'
import TransformManager from './transform-manager'

import {
  MIN_ZOOM,
  MAX_ZOOM
} from './constants'

import {
  createMosaicPattern
} from './helpers'

// TODO: Режим рисования
// TODO: Добавление текста
// TODO: drag'n'drop картинки
// TODO: Сделать снэп (прилипание к краям и центру)
// TODO: Разделить внутренние методы и публичные
// TODO: Подумать как работать с переводами в редакторе
// TODO: Поработать с автоматическим рассчётом высоты монтажной области
// TODO: Если айтем заблокирован, то при вызове resetObject мы не должны ничего делать
// TODO: Динамически импортировать библиотеку для конвертации в PDF

/**
 * Класс редактора изображений.
 * @class
 * @param {string} canvasId - идентификатор канваса
 * @param {object} options - опции и настройки
 *
 * @fires {object} editor:render-complete - событие, которое срабатывает после завершения рендеринга редактора
 */
export class ImageEditor {
  constructor(canvasId, options = {}) {
    this.options = options

    const { defaultScale, minZoom, maxZoom, montageAreaWidth, montageAreaHeight } = options

    this.containerId = canvasId
    this.editorId = `${canvasId}-${nanoid()}`
    this.isDisabled = false
    this.disabledOverlay = null
    this.clipboard = null

    this._createdBlobUrls = []

    this.defaultZoom = defaultScale

    this.minZoom = minZoom || MIN_ZOOM
    this.maxZoom = maxZoom || MAX_ZOOM

    CustomizedControls.apply()

    this.canvas = new Canvas(canvasId, options)

    this.historyManager = new HistoryManager(this, options.maxHistoryLength)
    this.toolbar = new ToolbarManager(this)
    this._initEditorWorker()

    // TODO: Рассмотреть возможность использования свойства excludeFromExport
    this.montageArea = new Rect({
      width: montageAreaWidth,
      height: montageAreaHeight,
      fill: createMosaicPattern(),
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

    this.transformManager = new TransformManager({
      editor: this,
      editorOptions: options
    })

    this.canvasManager = new CanvasManager({
      editor: this,
      editorOptions: options
    })

    this.imageManager = new ImageManager({
      editor: this,
      editorOptions: options
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
    const montageAreaClip = new Rect({
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
      methods({ editorOptions: this.options })
    )

    this.listeners = new Listeners({ editor: this, options: this.options })

    this._createDisabledOverlay()

    this.canvasManager.setEditorContainerWidth(editorContainerWidth)
    this.canvasManager.setEditorContainerHeight(editorContainerHeight)
    this.canvasManager.setCanvasWrapperWidth(canvasWrapperWidth)
    this.canvasManager.setCanvasWrapperHeight(canvasWrapperHeight)
    this.canvasManager.setCanvasCSSWidth(canvasCSSWidth)
    this.canvasManager.setCanvasCSSHeight(canvasCSSHeight)

    if (initialImage?.source) {
      const {
        source,
        scale = `image-${scaleType}`,
        withoutSave = true,
        contentType
      } = initialImage

      await this.imageManager.importImage({ source, scale, withoutSave, contentType })
    } else {
      this.canvasManager.setDefaultScale({ withoutSave: true })
    }

    if (initialStateJSON) {
      this.loadStateFromFullState(initialStateJSON)
    }

    this.historyManager.saveState()

    console.log('editor:ready')
    this.canvas.fire('editor:ready', this)

    // вызываем колбэк если он есть
    if (typeof _onReadyCallback === 'function') {
      _onReadyCallback(this)
    }
  }

  /**
   * Создаёт overlay для блокировки монтажной области
   */
  _createDisabledOverlay() {
    this.historyManager.suspendHistory()

    const { disabledOverlayColor } = this.options

    // получаем координаты монтажной области
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // создаём overlay‑объект
    this.disabledOverlay = new Rect({
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
    this.historyManager.resumeHistory()
  }

  _initEditorWorker() {
    this.workerManager = new WorkerManager()
    this.worker = this.workerManager.worker
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
