import * as fabric from 'fabric'

import methods from './methods'
import Listeners from './listeners'

import {
  createMosaicPattern
} from './helpers'

// TODO: Режим рисования
// TODO: Тулбар появляющийся под выделенным объектом и возможность передачи кнопок в тулбар
// TODO: Кастомные стили
// TODO: Добавление текста
// TODO: drag'n'drop картинки

/**
 * Класс редактора изображений.
 * @class
 * @param {string} canvasId - идентификатор канваса
 * @param {object} options - опции и настройки
 *
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
      patches: [], // Массив диффов (каждый дифф – результат jsondiffpatch.diff(prevState, nextState))
      currentIndex: 0, // Текущая позиция в истории (0 означает базовое состояние)
      maxHistoryLength: 50 // Максимальное количество сохранённых диффов
    }

    this.montageArea = new fabric.Rect({
      width: options.backstoreWidth,
      height: options.backstoreHeight,
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
      width: this.options.backstoreWidth,
      height: this.options.backstoreHeight,
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
    this.setCanvasDisplayWidth(this.options.canvasDisplayWidth)
    this.setCanvasDisplayHeight(this.options.canvasDisplayHeight)
    this.setDefaultScale({ withoutSave: true })

    if (this.options.initialImage?.url) {
      const {
        url,
        scaleType = 'scale-canvas',
        withoutSave = true
      } = this.options.initialImage

      console.log('this.options.initialImage?.imageUrl', url)
      await this.importImage({ url, scale: scaleType, withoutSave })
    }

    if (this.options.initialStateJSON) {
      console.log('options.initialStateJSON', this.options.initialStateJSON)
      this.loadStateFromFullState(this.options.initialStateJSON)
    }

    this.saveState()
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
