import {
  Rect,
  Circle,
  Triangle
} from 'fabric'

import { nanoid } from 'nanoid'

export default class ShapeManager {
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
   * Добавление прямоугольника
   * @param {Object} shapeOptions
   * @param {Number} shapeOptions.left - Координата X
   * @param {Number} shapeOptions.top - Координата Y
   * @param {Number} shapeOptions.width - Ширина
   * @param {Number} shapeOptions.height - Высота
   * @param {String} shapeOptions.fill - Цвет заливки
   * @param {String} shapeOptions.originX - Ориентация по X
   * @param {String} shapeOptions.originY - Ориентация по Y
   * @param {Rect} shapeOptions.rest - Остальные параметры
   *
   * @param {Object} flags.withoutSelection - Не выделять объект
   * @param {Object} flags.withoutAdding - Не добавлять объект в canvas
   */
  addRectangle(
    {
      id = `rect-${nanoid()}`,
      left,
      top,
      width = 100,
      height = 100,
      fill = 'blue',
      originX = 'center',
      originY = 'center',
      ...rest
    } = {},
    { withoutSelection, withoutAdding } = {}
  ) {
    const { canvas } = this.editor

    const rect = new Rect({
      id,
      left,
      top,
      width,
      height,
      fill,
      originX,
      originY,
      ...rest
    })

    if (!left && !top) {
      canvas.centerObject(rect)
    }

    if (withoutAdding) return rect

    canvas.add(rect)

    if (!withoutSelection) {
      canvas.setActiveObject(rect)
    }

    canvas.renderAll()
    return rect
  }

  /**
   * Добавление круга
   * @param {Object} shapeOptions
   * @param {Number} shapeOptions.left - Координата X
   * @param {Number} shapeOptions.top - Координата Y
   * @param {Number} shapeOptions.radius - Радиус
   * @param {string} shapeOptions.fill - Цвет заливки
   * @param {String} shapeOptions.originX - Ориентация по X
   * @param {String} shapeOptions.originY - Ориентация по Y
   * @param {Circle} shapeOptions.rest - Остальные параметры
   *
   * @param {Object} flags.withoutSelection - Не выделять объект
   * @param {Object} flags.withoutAdding - Не добавлять объект в canvas
   */
  addCircle(
    {
      id = `circle-${nanoid()}`,
      left,
      top,
      radius = 50,
      fill = 'green',
      originX = 'center',
      originY = 'center',
      ...rest
    } = {},
    { withoutSelection, withoutAdding } = {}
  ) {
    const { canvas } = this.editor

    const circle = new Circle({
      id,
      left,
      top,
      fill,
      radius,
      originX,
      originY,
      ...rest
    })

    if (!left && !top) {
      canvas.centerObject(circle)
    }

    if (withoutAdding) return circle
    canvas.add(circle)

    if (!withoutSelection) {
      canvas.setActiveObject(circle)
    }

    canvas.renderAll()
    return circle
  }

  /**
   * Добавление треугольника
   * @param {Object} shapeOptions
   * @param {Number} shapeOptions.left - Координата X
   * @param {Number} shapeOptions.top - Координата Y
   * @param {Number} shapeOptions.width - Ширина
   * @param {Number} shapeOptions.height - Высота
   * @param {String} shapeOptions.originX - Ориентация по X
   * @param {String} shapeOptions.originY - Ориентация по Y
   * @param {String} shapeOptions.fill - Цвет заливки
   * @param {Triangle} shapeOptions.rest - Остальные параметры
   *
   * @param {Object} flags.withoutSelection - Не выделять объект
   * @param {Object} flags.withoutAdding - Не добавлять объект в canvas
   */
  addTriangle(
    {
      id = `triangle-${nanoid()}`,
      left,
      top,
      width = 100,
      height = 100,
      originX = 'center',
      originY = 'center',
      fill = 'yellow',
      ...rest
    } = {},
    { withoutSelection, withoutAdding } = {}
  ) {
    const { canvas } = this.editor

    const triangle = new Triangle({
      id,
      left,
      top,
      fill,
      width,
      height,
      originX,
      originY,
      ...rest
    })

    if (!left && !top) {
      canvas.centerObject(triangle)
    }

    if (withoutAdding) return triangle
    canvas.add(triangle)

    if (!withoutSelection) {
      canvas.setActiveObject(triangle)
    }

    canvas.renderAll()
    return triangle
  }
}
