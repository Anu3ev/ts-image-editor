import * as fabric from 'fabric'

import methods from './methods'
import Listeners from './listeners'

import {
  createMosaicPattern
} from './helpers'

// TODO: Функционал Undo/Redo
// TODO: Режим рисования
// TODO: При дабл клике по объекту возвращать его исходную (дефолтную) форму. Например, если растянули картинку, то при дабл клике она вернется к исходному размеру.
// TODO: Тулбар появляющийся под выделенным объектом и возможность передачи кнопок в тулбар
// TODO: Кастомные стили
// TODO: Добавление объектов (квадраты, круги, стрелки, тексты)
// TODO: Слушатели на шорткаты
// TODO: drag'n'drop картинки
// TODO: Если делаем скейлинг канваса, то объекты разъезжаются
// TODO: Починить остающиеся элементы контроля после массово удаления объектов
// TODO: Монтажная область (как в Figma)

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
      width: options.width,
      height: options.height,
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

    this.canvas.add(this.montageArea)

    // Создаем область для клиппинга (без fill, чтобы не влиял на экспорт)
    const montageAreaClip = new fabric.Rect({
      width: options.width,
      height: options.height,
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      id: 'area-clip',
      originX: 'center',
      originY: 'center'
    })

    this.canvas.clipPath = montageAreaClip

    this.canvas.renderAll()

    Object.assign(
      this,
      methods({
        fabric,
        editorOptions: options
      })
    )

    this.listeners = new Listeners({ editor: this, options })

    this.setDisplayWidth(options.displayWidth)
    this.setDisplayHeight(options.displayHeight)
    this.setDefaultScale()
    this.saveState()
  }
}

export default ImageEditor
