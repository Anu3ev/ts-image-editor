export default class LayerManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({
    editor
  }) {
    this.editor = editor
  }

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-to-front
   */
  bringToFront(object, { withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj) => {
        canvas.bringObjectToFront(obj)
      })
    } else {
      canvas.bringObjectToFront(activeObject)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-bring-to-front')
  }

  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-forward
   */
  bringForward(object, { withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      LayerManager._moveSelectionForward(canvas, activeObject)
    } else {
      canvas.bringObjectForward(activeObject)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-bring-forward')
  }

  /**
 * Отправить объект на задний план по оси Z
 * @param {fabric.Object} object
 * @param {Object} options
 * @param {Boolean} options.withoutSave - Не сохранять состояние
 * @fires editor:object-send-to-back
 */
  sendToBack(object, { withoutSave } = {}) {
    const {
      canvas,
      montageArea,
      historyManager,
      interactionBlocker: { overlayMask }
    } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      const selectedObjects = activeObject.getObjects()

      // Отправляем объекты на нижний слой, начиная с нижнего объекта выделения
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        canvas.sendObjectToBack(selectedObjects[i])
      }
    } else {
      canvas.sendObjectToBack(activeObject)
    }

    // Служебные элементы отправляем вниз
    canvas.sendObjectToBack(montageArea)
    canvas.sendObjectToBack(overlayMask)

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-send-to-back')
  }

  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param {fabric.Object} object
  * @param {Object} options
  * @param {Boolean} options.withoutSave - Не сохранять состояние
  */
  sendBackwards(object, { withoutSave } = {}) {
    const {
      canvas,
      montageArea,
      historyManager,
      interactionBlocker: { overlayMask }
    } = this.editor

    historyManager.suspendHistory()

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    // Обработка активного выделения
    if (activeObject.type === 'activeselection') {
      LayerManager._moveSelectionBackwards(canvas, activeObject)
    } else {
      canvas.sendObjectBackwards(activeObject)
    }

    // Служебные элементы отправляем вниз
    canvas.sendObjectToBack(montageArea)
    canvas.sendObjectToBack(overlayMask)

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-send-backwards')
  }

  /**
   * Сдвигает выделенные объекты на один уровень вверх относительно ближайшего верхнего объекта
   * @param {fabric.Canvas} canvas - экземпляр холста
   * @param {fabric.ActiveSelection} activeSelection - активное выделение
   * @returns {void}
   * @private
   */
  static _moveSelectionForward(canvas, activeSelection) {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
      const obj = selectedObjects[i]
      const currentIndex = canvasObjects.indexOf(obj)
      let nextIndex = currentIndex + 1

      // Ищем ближайший индекс сверху, не входящий в выделение
      while (
        nextIndex < canvasObjects.length
      && selectedObjects.includes(canvasObjects[nextIndex])
      ) {
        nextIndex += 1
      }

      if (nextIndex < canvasObjects.length) {
        canvas.moveObjectTo(obj, nextIndex)
      }
    }
  }

  /**
   * Сдвигает выделенные объекты на один уровень вниз относительно ближайшего нижнего объекта
   * @param {fabric.Canvas} canvas - экземпляр холста
   * @param {fabric.ActiveSelection} activeSelection - активное выделение
   * @returns {void}
   * @private
   */
  static _moveSelectionBackwards(canvas, activeSelection) {
    const canvasObjects = canvas.getObjects()
    const selectedObjects = activeSelection.getObjects()

    // Находим минимальный индекс среди выделенных объектов
    const minSelectedIndex = Math.min(...selectedObjects.map((obj) => canvasObjects.indexOf(obj)))

    // Перемещаем выделенные объекты вниз относительно ближайшего нижнего объекта, начиная с нижнего
    for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
      canvas.moveObjectTo(selectedObjects[i], minSelectedIndex - 1)
    }
  }
}
