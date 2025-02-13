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
    this.canvas = new fabric.Canvas(canvasId, options)

    this.montageArea = new fabric.Rect({
      width: options.width,
      height: options.height,
      fill: createMosaicPattern(fabric),
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false
    })

    this.canvas.add(this.montageArea)

    // Создаем область для клиппинга (без fill, чтобы не влиял на экспорт)
    const montageAreaClip = new fabric.Rect({
      width: options.width,
      height: options.height,
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false
    })

    this.canvas.clipPath = montageAreaClip
    this.canvas.renderAll()

    this.clipboard = null

    Object.assign(
      this,
      methods({
        canvas: this.canvas,
        montageArea: this.montageArea,
        fabric,
        options
      })
    )

    this.listeners = new Listeners({ editor: this, options })

    this.setDisplayWidth(options.displayWidth)
    this.setDisplayHeight(options.displayHeight)
    this.setDefaultScale()
  }
}

export default ImageEditor
