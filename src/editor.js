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
    this.isLoading = false
    this.skipHistory = false
    this.options = options
    this.canvas = new fabric.Canvas(canvasId, options)

    this.clipboard = null

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
    this.minZoom = MIN_ZOOM
    this.maxZoom = MAX_ZOOM

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

      console.log('this.options.initialImage?.imageUrl', url)
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

  /**
   * Метод для удаления редактора и всех слушателей.
   */
  destroy() {
    this.listeners.destroy()
    this.canvas.dispose()
  }
}

export default ImageEditor
