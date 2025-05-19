import {
  ActiveSelection,
  Group,
  Rect,
  Circle,
  Triangle
} from 'fabric'

import { nanoid } from 'nanoid'

import {
  calculateScaleFactor
} from './helpers'

/**
 * Методы для работы с канвасом
 * @param {Object} params
 * @param {Object} params.fabric - объект fabric
 * @param {Object} params.editorOptions - опции редактора
 *
 * @returns {Object} методы для работы с канвасом
 */
export default ({ editorOptions }) => ({
  /**
   * Обновляет размеры и позицию overlay, выносит его на передний план
   */
  updateDisabledOverlay() {
    if (!this.disabledOverlay) return

    this.historyManager.suspendHistory()

    // получаем в экранных координатах то, что отображает монтажную зону
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // обновляем размеры и позицию overlay
    this.disabledOverlay.set({ left, top, width, height })
    this.canvas.discardActiveObject()
    this.bringToFront(this.disabledOverlay, { withoutSave: true })
    this.historyManager.resumeHistory()
  },

  /**
   * Блокирует объект (или группу объектов) на канвасе
   * @param {Object} options
   * @param {fabric.Object} [options.object] - объект, который нужно заблокировать
   * @param {Boolean} [options.withoutSave] - не сохранять состояние
   * @returns
   * @fires editor:object-locked
   */
  lockObject({ object, withoutSave } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    const lockOptions = {
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      lockSkewingX: true,
      lockSkewingY: true,
      locked: true
    }

    activeObject.set(lockOptions)

    if (['activeselection', 'group'].includes(activeObject.type)) {
      activeObject.getObjects().forEach((obj) => {
        obj.set(lockOptions)
      })
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-locked', { object: activeObject })
  },

  /**
   * Разблокирует объект (или группу объектов) на канвасе
   * @param {Object} options
   * @param {fabric.Object} [options.object] - объект, который нужно разблокировать
   * @param {Boolean} [options.withoutSave] - не сохранять состояние
   * @returns
   * @fires editor:object-unlocked
   */
  unlockObject({ object, withoutSave } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    const unlockOptions = {
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockSkewingX: false,
      lockSkewingY: false,
      locked: false
    }

    activeObject.set(unlockOptions)

    if (['activeselection', 'group'].includes(activeObject.type)) {
      activeObject.getObjects().forEach((obj) => {
        obj.set(unlockOptions)
      })
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-unlocked', { object: activeObject })
  },

  /**
   * Выключает редактор:
   * 1) убирает все селекты, события мыши, скейл/драг–н–дроп
   * 2) делает все объекты не‑evented и не‑selectable
   * 3) делает видимым disabledOverlay поверх всех объектов в монтажной области
   */
  disable() {
    if (this.isDisabled) return

    this.historyManager.suspendHistory()
    this.isDisabled = true

    // 1) Убираем все селекты, события мыши, скейл/драг–н–дроп
    this.canvas.discardActiveObject()
    this.canvas.selection = false
    this.canvas.skipTargetFind = true

    // 2) Делаем все объекты не‑evented и не‑selectable
    this.getObjects().forEach((obj) => {
      obj.evented = false
      obj.selectable = false
    })

    // 3) (опционально) блокируем сами canvas‑элементы в DOM
    this.canvas.upperCanvasEl.style.pointerEvents = 'none'
    this.canvas.lowerCanvasEl.style.pointerEvents = 'none'

    this.disabledOverlay.visible = true
    this.updateDisabledOverlay()

    this.canvas.fire('editor:disabled')
    this.historyManager.resumeHistory()
  },

  /**
   * Включает редактор
   */
  enable() {
    if (!this.isDisabled) return

    this.historyManager.suspendHistory()
    this.isDisabled = false

    // 1) возвращаем интерактивность
    this.canvas.selection = true
    this.canvas.skipTargetFind = false

    // 2) возвращаем селекты & ивенты
    this.getObjects().forEach((obj) => {
      obj.evented = true
      obj.selectable = true
    })

    // 3) разблокируем DOM
    this.canvas.upperCanvasEl.style.pointerEvents = ''
    this.canvas.lowerCanvasEl.style.pointerEvents = ''
    this.disabledOverlay.visible = false
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:enabled')
    this.historyManager.resumeHistory()
  },

  /**
   * Масштабирование изображения
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {String} [options.type] - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.fitAsOneObject] - Масштабировать все объекты в активной группе как один объект
   * @fires editor:image-fitted
   */
  fitObject({ object, type = editorOptions.scaleType, withoutSave, fitAsOneObject } = {}) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (['activeselection'].includes(activeObject.type) && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      this.canvas.discardActiveObject()

      selectedItems.forEach((obj) => {
        const objScale = calculateScaleFactor({ montageArea: this.montageArea, imageObject: obj, scaleType: type })

        obj.scale(objScale)
        this.canvas.centerObject(obj)
      })

      const sel = new ActiveSelection(selectedItems, {
        canvas: this.canvas
      })

      this.canvas.setActiveObject(sel)
    } else {
      const scaleFactor = calculateScaleFactor({
        montageArea: this.montageArea,
        imageObject: activeObject,
        scaleType: type
      })

      activeObject.scale(scaleFactor)
      this.canvas.centerObject(activeObject)
    }

    this.canvas.renderAll()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:image-fitted', { type })
  },

  /**
   * Получение всех объектов внутри монтажной области редактора
   * @returns {Array} массив объектов
   */
  getObjects() {
    const canvasObjects = this.canvas.getObjects()

    return canvasObjects.filter((obj) => obj.id !== this.montageArea.id && obj.id !== this.disabledOverlay.id)
  },

  /**
   * Группировка объектов
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @param {fabric.Object[]} options.objects - массив объектов для группировки
   * @fires editor:objects-grouped
   */
  group({ withoutSave } = {}) {
    this.historyManager.suspendHistory()
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type !== 'activeselection') {
      return
    }

    // Получаем все объекты внутри активной селекции, группируем их и удаляем из канваса
    const objectsToGroup = activeObject.getObjects()

    const group = new Group(objectsToGroup)
    objectsToGroup.forEach((obj) => this.canvas.remove(obj))

    group.set('id', `${group.type}-${nanoid()}`)
    this.canvas.add(group)
    this.canvas.setActiveObject(group)
    this.canvas.renderAll()

    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:objects-grouped')
  },

  /**
   * Разгруппировка объектов
   * @param {fabric.Group} obj - группа объектов
   * @fires editor:objects-ungrouped
   */
  ungroup({ object, withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const group = object || this.canvas.getActiveObject()

    if (!group || group.type !== 'group') {
      return
    }

    const grouppedObjects = group.removeAll()
    this.canvas.remove(group)

    grouppedObjects.forEach((grouppedObj) => this.canvas.add(grouppedObj))

    const sel = new ActiveSelection(grouppedObjects, {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.renderAll()

    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:objects-ungrouped')
  },

  /**
   * Удалить выбранные объекты
   * @param {Object} options
   * @param {fabric.Object[]} options.objects - массив объектов для удаления
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-deleted
   */
  deleteSelectedObjects({ objects, withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObjects = objects || this.canvas.getActiveObjects()

    if (!activeObjects?.length) return

    activeObjects.forEach((obj) => {
      if (obj.type === 'group' && obj.format !== 'svg') {
        this.ungroup(obj)
        this.deleteSelectedObjects()

        return
      }

      this.canvas.remove(obj)
    })

    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:objects-deleted')
  },

  // Дебаунс для снижения частоты сохранения состояния
  debounce(fn, delay) {
    let timer = null

    return function(...args) {
      const context = this
      clearTimeout(timer)
      timer = setTimeout(() => {
        fn.apply(context, args)
      }, delay)
    }
  },

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  selectAll() {
    this.canvas.discardActiveObject()

    const sel = new ActiveSelection(this.getObjects(), {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:all-objects-selected', { selected: sel })
  },

  /**
   * Копирование объекта
   * @fires editor:object-copied
   */
  async copy() {
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    try {
      const clonedObject = await activeObject.clone()
      this.clipboard = clonedObject

      // Сохраняем объект в буфере обмена, если он доступен
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard) {
        console.warn(
          'copy. navigator.clipboard не поддерживается в этом браузере или отсутствует соединение по HTTPS-протоколу'
        )

        this.canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      if (this.clipboard.type !== 'image') {
        await navigator.clipboard.writeText(['application/image-editor', JSON.stringify(clonedObject)])

        this.canvas.fire('editor:object-copied', { object: clonedObject })
        return
      }

      const clonedObjectCanvas = clonedObject.toCanvasElement()
      const clonedObjectBlob = await new Promise((resolve) => { clonedObjectCanvas.toBlob(resolve) })

      const clipboardItem = new ClipboardItem({ [clonedObjectBlob.type]: clonedObjectBlob })
      await navigator.clipboard.write([clipboardItem])

      this.canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      console.error('copy. Ошибка записи в системный буфер обмена: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка записи в системный буфер обмена: ${error.message}`
      })
    }
  },

  /**
   * Вставка объекта
   * @fires editor:object-pasted
   */
  async paste() {
    if (!this.clipboard) return

    // clone again, so you can do multiple copies.
    const clonedObj = await this.clipboard.clone()
    this.canvas.discardActiveObject()
    clonedObj.set({
      id: `${clonedObj.type}-${nanoid()}`,
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true
    })
    if (clonedObj instanceof ActiveSelection) {
      // active selection needs a reference to the canvas.
      clonedObj.canvas = this.canvas
      clonedObj.forEachObject((obj) => {
        this.canvas.add(obj)
      })
      // this should solve the unselectability
      clonedObj.setCoords()
    } else {
      this.canvas.add(clonedObj)
    }
    this.clipboard.top += 10
    this.clipboard.left += 10
    this.canvas.setActiveObject(clonedObj)
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:object-pasted', { object: clonedObj })
  },

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-to-front
   */
  bringToFront(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj) => {
        this.canvas.bringObjectToFront(obj)
      })
    } else {
      this.canvas.bringObjectToFront(activeObject)
    }

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-bring-to-front')
  },

  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-forward
   */
  bringForward(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      const canvasObjects = this.canvas.getObjects()
      const selectedObjects = activeObject.getObjects()

      // Сдвигаем выделенные объекты вверх относительно ближайшего верхнего объекта, начиная с верхнего
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

        if (nextIndex === canvasObjects.length) continue

        this.canvas.moveObjectTo(obj, nextIndex)
      }
    } else {
      this.canvas.bringObjectForward(activeObject)
    }

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-bring-forward')
  },

  /**
 * Отправить объект на задний план по оси Z
 * @param {fabric.Object} object
 * @param {Object} options
 * @param {Boolean} options.withoutSave - Не сохранять состояние
 * @fires editor:object-send-to-back
 */
  sendToBack(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      const selectedObjects = activeObject.getObjects()

      // Отправляем объекты на нижний слой, начиная с нижнего объекта выделения
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        this.canvas.sendObjectToBack(selectedObjects[i])
      }
    } else {
      this.canvas.sendObjectToBack(activeObject)
    }

    // Служебные элементы отправляем вниз
    this.canvas.sendObjectToBack(this.montageArea)
    this.canvas.sendObjectToBack(this.disabledOverlay)

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-send-to-back')
  },

  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param {fabric.Object} object
  * @param {Object} options
  * @param {Boolean} options.withoutSave - Не сохранять состояние
  */
  sendBackwards(object, { withoutSave } = {}) {
    this.historyManager.suspendHistory()

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    // Обработка активного выделения
    if (activeObject.type === 'activeselection') {
      const canvasObjects = this.canvas.getObjects()
      const selectedObjects = activeObject.getObjects()

      // Находим минимальный индекс среди выделенных объектов
      const minSelectedIndex = Math.min(...selectedObjects.map((obj) => canvasObjects.indexOf(obj)))

      // Перемещаем выделенные объекты вниз относительно ближайшего нижнего объекта, начиная с нижнего
      for (let i = selectedObjects.length - 1; i >= 0; i -= 1) {
        this.canvas.moveObjectTo(selectedObjects[i], minSelectedIndex - 1)
      }
    } else {
      this.canvas.sendObjectBackwards(activeObject)
    }

    // Служебные элементы отправляем вниз
    this.canvas.sendObjectToBack(this.montageArea)
    this.canvas.sendObjectToBack(this.disabledOverlay)

    this.canvas.renderAll()
    this.historyManager.resumeHistory()

    if (!withoutSave) {
      this.historyManager.saveState()
    }

    this.canvas.fire('editor:object-send-backwards')
  },

  /**
   * Добавление прямоугольника
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.width - Ширина
   * @param {Number} options.height - Высота
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addRectangle({
    left,
    top,
    width = 100,
    height = 100,
    color = 'blue',
    originX = 'center',
    originY = 'center'
  } = {}) {
    const rect = new Rect({
      id: `rect-${nanoid()}`,
      left,
      top,
      fill: color,
      width,
      height,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(rect)
    }

    this.canvas.add(rect)
    this.canvas.setActiveObject(rect)
    this.canvas.renderAll()
  },

  /**
   * Добавление круга
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.radius - Радиус
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addCircle({
    left,
    top,
    radius = 50,
    color = 'green',
    originX = 'center',
    originY = 'center'
  } = {}) {
    const circle = new Circle({
      id: `circle-${nanoid()}`,
      left,
      top,
      fill: color,
      radius,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(circle)
    }

    this.canvas.add(circle)
    this.canvas.setActiveObject(circle)
    this.canvas.renderAll()
  },

  /**
   * Добавление треугольника
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.width - Ширина
   * @param {Number} options.height - Высота
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addTriangle({
    left,
    top,
    width = 100,
    height = 100,
    originX = 'center',
    originY = 'center',
    color = 'yellow'
  } = {}) {
    const triangle = new Triangle({
      id: `triangle-${nanoid()}`,
      left,
      top,
      fill: color,
      width,
      height,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(triangle)
    }

    this.canvas.add(triangle)
    this.canvas.setActiveObject(triangle)
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  // Пример с ClipPath
  // cropImage(imageObj, cropRect) {
  //   // cropRect — это объект { left, top, width, height },
  //   // который задаёт рамку для обрезки

  //   imageObj.clipPath = new fabric.Rect({
  //     left: cropRect.left,
  //     top: cropRect.top,
  //     width: cropRect.width,
  //     height: cropRect.height,
  //     absolutePositioned: true // Чтобы учитывались координаты именно канвы, а не локальные
  //   })

  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // Пример с «ручной» обрезкой (создаём новый fabric.Image)
  // cropImageAndReplace(imageObj, cropRect) {
  //   // 1. Создаём промежуточный <canvas> (DOM)
  //   const tempCanvas = document.createElement('canvas')
  //   const ctx = tempCanvas.getContext('2d')

  //   // Задаём размеры временного canvas
  //   tempCanvas.width = cropRect.width
  //   tempCanvas.height = cropRect.height

  //   // Копируем нужную часть
  //   // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  //   ctx.drawImage(
  //     imageObj._element,
  //     cropRect.left,
  //     cropRect.top,
  //     cropRect.width,
  //     cropRect.height,
  //     0,
  //     0,
  //     cropRect.width,
  //     cropRect.height
  //   )

  //   // 2. Получаем dataURL
  //   const dataURL = tempCanvas.toDataURL()

  //   // 3. Удаляем старый объект из canvas
  //   this.canvas.remove(imageObj)

  //   // 4. Создаём новый объект из dataURL
  //   fabric.FabricImage.fromURL(dataURL, (croppedImg) => {
  //     croppedImg.set({
  //       left: imageObj.left,
  //       top: imageObj.top
  //     })
  //     this.canvas.add(croppedImg)
  //     this.canvas.renderAll()
  //   })
  // },

  // TODO: Проверить что работает
  // addText(text) {
  //   const textObj = new fabric.FabricText(text, { left: 100, top: 100 })
  //   this.canvas.add(textObj)
  //   this.canvas.renderAll()
  // },

  // Ещё один вариант
  // addText(text) {
  //   const textObj = new fabricTextbox(textString, {
  //     left: 100,
  //     top: 200,
  //     fontSize: 30,
  //     fill: '#000',
  //     // Прочие настройки...
  //   });
  //   canvas.add(textObj);
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  // addSticker(url) {
  //   fabric.fabricFabricImage.fromURL(url, (img) => {
  //     img.set({
  //       left: 100,
  //       top: 100
  //       // можно что-то поднастроить...
  //     })
  //     this.canvas.add(img)
  //     this.canvas.renderAll()
  //   })
  // },

  // TODO: Проверить что работает. Возможно это должно быть внутренней фичей
  // hideControls(imageObj) {
  //   imageObj.set({
  //     hasControls: true, // разрешает уголки для маштабирования/вращения
  //     lockRotation: false // если хотим разрешить вращение, это должно быть false
  //   })
  // },

  // TODO: Проверить что работает
  // applyGradient(object) {
  //   // Допустим, линейный градиент слева направо
  //   const gradient = new fabric.fabricGradient({
  //     type: 'linear',
  //     gradientUnits: 'pixels', // или 'percentage'
  //     coords: {
  //       x1: 0,
  //       y1: 0,
  //       x2: object.width,
  //       y2: 0
  //     },
  //     colorStops: [
  //       { offset: 0, color: 'red' },
  //       { offset: 1, color: 'blue' }
  //     ]
  //   })
  //   object.set('fill', gradient)
  //   this.canvas.renderAll()

  //   // Для тени
  //   // object.setShadow({
  //   //   color: 'rgba(0,0,0,0.3)',
  //   //   blur: 5,
  //   //   offsetX: 5,
  //   //   offsetY: 5
  //   // });
  //   // this.canvas.renderAll();
  // },

  // TODO: Проверить что работает
  // applyBrightness() {
  //   const obj = this.canvas.getActiveObject()
  //   if (!obj || obj.type !== 'image') return
  //   const brightnessFilter = new fabric.fabricImage.filters.Brightness({
  //     brightness: 0.2
  //   })
  //   obj.filters[0] = brightnessFilter
  //   obj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // Предположим, у нас есть imageObj, который является fabricImage
  // applyBrightness(imageObj, value) {
  //   // value: число от -1 до +1
  //   const brightnessFilter = new fabricImage.filters.Brightness({
  //     brightness: value
  //   });
  //   // Массив filters у объекта - туда можно добавить несколько фильтров
  //   imageObj.filters[0] = brightnessFilter;
  //   imageObj.applyFilters();
  //   this.canvas.renderAll();
  // }

  // TODO: Проверить что работает
  // applyFilters(imageObj) {
  //   const saturationFilter = new fabric.fabricImage.filters.Saturation({
  //     saturation: 0.5 // 0.5 — это пример, смотрите документацию
  //   })
  //   imageObj.filters.push(saturationFilter)
  //   imageObj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // removeFilter() {
  //   const obj = this.canvas.getActiveObject()
  //   if (!obj || obj.type !== 'image') return
  //   obj.filters = []
  //   obj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // setDrawingModeOn() {
  //   this.canvas.freeDrawingBrush = new fabric.fabricPencilBrush(this.canvas)
  //   this.canvas.isDrawingMode = true
  //   this.canvas.freeDrawingBrush.color = '#ff0000'
  //   this.canvas.freeDrawingBrush.width = 5
  // },

  // TODO: Проверить что работает
  // setDrawingModeOff() {
  //   this.canvas.isDrawingMode = false
  // }
})
