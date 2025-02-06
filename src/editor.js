import * as fabric from 'fabric'

import defaults from './defaults'
import methods from './methods'
import Listeners from './listeners'

// TODO: Функционал Undo/Redo
// TODO: Режим рисования
// TODO: При дабл клике по объекту возвращать его исходную (дефолтную) форму. Например, если растянули картинку, то при дабл клике она вернется к исходному размеру.

class InsalesImageEditor {
  constructor(canvasId, options) {
    const adjustedOptions = { ...defaults, ...options }

    this.canvas = new fabric.Canvas(canvasId, adjustedOptions)
    this.clipboard = null

    Object.assign(
      this,
      methods({ canvas: this.canvas, fabric })
    )

    this.listeners = new Listeners({ editor: this, options: adjustedOptions })

    this.setDisplayWidth(adjustedOptions?.displayWidth)
    this.setDisplayHeight(adjustedOptions?.displayHeight)
  }
}

export default InsalesImageEditor
