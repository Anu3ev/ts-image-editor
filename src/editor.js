import * as fabric from 'fabric'

import defaults from './defaults'

class InsalesImageEditor {
  constructor(canvasId, options) {
    console.log('init', options)

    this.canvas = new fabric.Canvas(canvasId, { ...defaults.canvasOptions, ...options.canvasOptions })
  }

  loadImage(url) {
    fabric.FabricImage.fromURL(url).then((img) => {
      console.log('img', img)
      // Добавляем изображение по центру холста
      img.set({
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: true
      })

      // Включаем трансформацию (масштабирование, вращение)
      img.setControlsVisibility({
        mt: true, // middle top
        mb: true, // middle bottom
        ml: true, // middle left
        mr: true, // middle right
        bl: true, // bottom left
        br: true, // bottom right
        tl: true, // top left
        tr: true, // top right
        mtr: true // middle top rotate
      })

      this.canvas.add(img)
      this.canvas.setActiveObject(img)
      this.canvas.renderAll()
    })
  }

  // TODO: Метод для сохранения результата

  // TODO: Посмотреть актуальный метод
  setWidth(width) {
    this.canvas.setWidth(width)
    this.canvas.renderAll()
  }

  // TODO: Посмотреть актуальный метод
  setHeight(height) {
    this.canvas.setHeight(height)
    this.canvas.renderAll()
  }

  bringToFront(object) {
    this.canvas.bringObjectToFront(object)
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  sendToBack(object) {
    this.canvas.sendToBack(object)
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  // Пример с ClipPath
  cropImage(imageObj, cropRect) {
    // cropRect — это объект { left, top, width, height },
    // который задаёт рамку для обрезки

    imageObj.clipPath = new fabric.Rect({
      left: cropRect.left,
      top: cropRect.top,
      width: cropRect.width,
      height: cropRect.height,
      absolutePositioned: true // Чтобы учитывались координаты именно канвы, а не локальные
    })

    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  // Пример с «ручной» обрезкой (создаём новый fabric.Image)
  cropImageAndReplace(imageObj, cropRect) {
    // 1. Создаём промежуточный <canvas> (DOM)
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')

    // Задаём размеры временного canvas
    tempCanvas.width = cropRect.width
    tempCanvas.height = cropRect.height

    // Копируем нужную часть
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(
      imageObj._element,
      cropRect.left,
      cropRect.top,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    )

    // 2. Получаем dataURL
    const dataURL = tempCanvas.toDataURL()

    // 3. Удаляем старый объект из canvas
    this.canvas.remove(imageObj)

    // 4. Создаём новый объект из dataURL
    fabric.FabricImage.fromURL(dataURL, (croppedImg) => {
      croppedImg.set({
        left: imageObj.left,
        top: imageObj.top
      })
      this.canvas.add(croppedImg)
      this.canvas.renderAll()
    })
  }

  // TODO: Проверить что работает
  addText(text) {
    const textObj = new fabric.FabricText(text, { left: 100, top: 100 })
    this.canvas.add(textObj)
    this.canvas.renderAll()
  }

  // Ещё один вариант
  // addText(text) {
  //   const textObj = new fabric.Textbox(textString, {
  //     left: 100,
  //     top: 200,
  //     fontSize: 30,
  //     fill: '#000',
  //     // Прочие настройки...
  //   });
  //   this.canvas.add(textObj);
  //   this.canvas.renderAll();
  // }

  // TODO: Проверить что работает
  addSticker(url) {
    fabric.FabricImage.fromURL(url, (img) => {
      img.set({
        left: 100,
        top: 100
        // можно что-то поднастроить...
      })
      this.canvas.add(img)
      this.canvas.renderAll()
    })
  }

  // TODO: Проверить что работает. Возможно это должно быть внутренней фичей
  hideControls(imageObj) {
    imageObj.set({
      hasControls: true, // разрешает уголки для маштабирования/вращения
      lockRotation: false // если хотим разрешить вращение, это должно быть false
    })
  }

  // TODO: Проверить что работает
  rotate(angle) {
    if (!this.canvas.getActiveObject()) return
    const obj = this.canvas.getActiveObject()
    obj.angle += angle
    this.canvas.renderAll()
  }

  // Пример: Повернуть на 90 градусов по кнопке
  // rotate90(imageObj) {
  //   imageObj.angle += 90;
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  flipX() {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    this.canvas.renderAll()
  }

  // flipHorizontally(object) {
  //   object.flipX = !object.flipX;
  //   canvas.renderAll();
  // }

  // flipVertically(object) {
  //   object.flipY = !object.flipY;
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  applyGradient(object) {
    // Допустим, линейный градиент слева направо
    const gradient = new fabric.Gradient({
      type: 'linear',
      gradientUnits: 'pixels', // или 'percentage'
      coords: {
        x1: 0,
        y1: 0,
        x2: object.width,
        y2: 0
      },
      colorStops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' }
      ]
    })
    object.set('fill', gradient)
    this.canvas.renderAll()

    // Для тени
    // object.setShadow({
    //   color: 'rgba(0,0,0,0.3)',
    //   blur: 5,
    //   offsetX: 5,
    //   offsetY: 5
    // });
    // this.canvas.renderAll();
  }

  // TODO: Проверить что работает
  applyBrightness() {
    const obj = this.canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    const brightnessFilter = new fabric.Image.filters.Brightness({
      brightness: 0.2
    })
    obj.filters[0] = brightnessFilter
    obj.applyFilters()
    this.canvas.renderAll()
  }

  // Предположим, у нас есть imageObj, который является fabric.Image
  // applyBrightness(imageObj, value) {
  //   // value: число от -1 до +1
  //   const brightnessFilter = new fabric.Image.filters.Brightness({
  //     brightness: value
  //   });
  //   // Массив filters у объекта - туда можно добавить несколько фильтров
  //   imageObj.filters[0] = brightnessFilter;
  //   imageObj.applyFilters();
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  applyFilters(imageObj) {
    const saturationFilter = new fabric.Image.filters.Saturation({
      saturation: 0.5 // 0.5 — это пример, смотрите документацию
    })
    imageObj.filters.push(saturationFilter)
    imageObj.applyFilters()
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  removeFilter() {
    const obj = this.canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    obj.filters = []
    obj.applyFilters()
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  setDrawingModeOn() {
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas)
    this.canvas.isDrawingMode = true
    this.canvas.freeDrawingBrush.color = '#ff0000'
    this.canvas.freeDrawingBrush.width = 5
  }

  // TODO: Проверить что работает
  setDrawingModeOff() {
    this.canvas.isDrawingMode = false
  }

  // TODO: Проверить что работает
  addRectangle() {
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'blue',
      width: 100,
      height: 80
    })
    this.canvas.add(rect)
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  addCircle() {
    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      fill: 'green',
      radius: 50
    })
    this.canvas.add(circle)
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  addRoundRect() {
    const roundRect = new fabric.Rect({
      left: 300,
      top: 100,
      fill: 'orange',
      width: 100,
      height: 100,
      rx: 20, // радиус скругления по горизонтали
      ry: 20 // радиус скругления по вертикали
    })
    this.canvas.add(roundRect)
    this.canvas.renderAll()
  }
}

export default InsalesImageEditor
