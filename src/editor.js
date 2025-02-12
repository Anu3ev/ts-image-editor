import * as fabric from 'fabric'

import defaults from './defaults'
import methods from './methods'
import Listeners from './listeners'

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

class ImageEditor {
  constructor(canvasId, options) {
    const adjustedOptions = { ...defaults, ...options }

    this.canvas = new fabric.Canvas(canvasId, adjustedOptions)
    this.clipboard = null

    Object.assign(
      this,
      methods({ canvas: this.canvas, fabric, options: adjustedOptions })
    )

    this.listeners = new Listeners({ editor: this, options: adjustedOptions })

    this.setDisplayWidth(adjustedOptions?.displayWidth)
    this.setDisplayHeight(adjustedOptions?.displayHeight)
  }
}

export default ImageEditor
