// API Docs: https://fabricjs.com/api/classes/canvas/

export default {
  // Ширина и высота канваса в пикселях (backstore)
  width: '800',
  height: '600',
  // Отображаемая ширина и высота канваса в пикселях
  displayWidth: '800px',
  displayHeight: '600px',
  // Cохраняют ли объекты свой текущий порядок (z-index) при выделении
  preserveObjectStacking: true,

  // Кастомные опции
  bringToFrontOnSelection: true,
  mouseWheelZooming: true,
  canvasDragging: false,

  // Дефолтный тип скейлинга для объектов (cotain/cover)
  scaleType: 'contain'
}
