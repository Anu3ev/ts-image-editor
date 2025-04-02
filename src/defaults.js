// API Docs: https://fabricjs.com/api/classes/canvas/

export default {
  // Canvas backstore width and height
  backstoreWidth: 512,
  backstoreHeight: 512,
  // Canvas (upper & lower) CSS width and height
  canvasDisplayWidth: '100%',
  canvasDisplayHeight: '100%',
  // Wrapper CSS width and height
  canvasWrapperWidth: '100%',
  canvasWrapperHeight: '100%',
  // Container CSS width and height
  editorContainerWidth: 'fit-content',
  editorContainerHeight: '100%',
  // Cохраняют ли объекты свой текущий порядок (z-index) при выделении
  preserveObjectStacking: true,

  defaultScale: 0.7,

  centeredScaling: true,
  centeredRotation: true,

  // Кастомные опции
  bringToFrontOnSelection: false,
  mouseWheelZooming: true,
  canvasDragging: false,
  copyObjectsByHotkey: true,
  pasteImageFromClipboard: true,
  undoRedoByHotKeys: true,
  selectAllByHotkey: true,
  deleteObjectsByHotkey: true,
  resetObjectFitByDoubleClick: true,

  // Дефолтный тип скейлинга для объектов (cotain/cover)
  scaleType: 'contain',

  // Можно передать JSON объект в виде строки для инициализации редактора
  initialStateJSON: null,

  // URL изображения
  imageUrl: null
}
