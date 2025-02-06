document.addEventListener('DOMContentLoaded', () => {
  // Кнопка выбора изображения
  const chooseImageBtn = document.getElementById('choose-images-btn')
  // Кнопка сохранения
  const saveCanvasBtn = document.getElementById('save-canvas')
  // Инпут для загрузки файла
  const fileInput = document.getElementById('file-input')
  // Очистить
  const clearBtn = document.getElementById('clear-btn')

  // Bring to front
  const bringToFrontBtn = document.getElementById('bring-to-front-btn')

  // Send to back
  const sendToBackBtn = document.getElementById('send-to-back-btn')

  // Копировать-вставить
  const copyBtn = document.getElementById('copy-btn')
  const pasteBtn = document.getElementById('paste-btn')

  // Поворот объекта
  const rotateBtn = document.getElementById('rotate-plus-90-btn')
  const rotateLeftBtn = document.getElementById('rotate-minus-90-btn')

  // Flip
  const flipXBtn = document.getElementById('flip-x-btn')
  const flipYBtn = document.getElementById('flip-y-btn')

  // Select all
  const selectAllBtn = document.getElementById('select-all-btn')

  // Удалить объект
  const deleteSelectedBtn = document.getElementById('delete-selected-btn')

  // Сгруппировать/разгруппировать выделенные объекты
  const groupBtn = document.getElementById('group-btn')
  const ungroupBtn = document.getElementById('ungroup-btn')

  // Zoom
  const zoomInBtn = document.getElementById('zoom-in-btn')
  const zoomOutBtn = document.getElementById('zoom-out-btn')
  const defaultScaleBtn = document.getElementById('default-scale-btn')

  // Image fit
  const imageFitContainBtn = document.getElementById('fit-contain-btn')
  const imageFitCoverBtn = document.getElementById('fit-cover-btn')

  // Сброс масштаба
  const resetFit = document.getElementById('reset-fit-btn')

  // Scale canvas
  const scaleCanvasBtn = document.getElementById('scale-canvas-btn')

  // Инициализация редактора
  window.insalesImageEditorInit('editor-canvas', {
    width: 800,
    height: 600,
    displayWidth: '800px',
    displayHeight: '600px'
  })

  const editorInstance = window['editor-canvas']

  console.log('demo.js: editorInstance', editorInstance)

  // Scale canvas
  scaleCanvasBtn.addEventListener('click', () => {
    editorInstance.scaleCanvas()
  })

  // Сброс масштаба
  resetFit.addEventListener('click', () => {
    editorInstance.resetObjectSize()
  })

  // Image fit contain
  imageFitContainBtn.addEventListener('click', () => {
    editorInstance.imageFit({ type: 'contain' })
  })

  // Image fit cover
  imageFitCoverBtn.addEventListener('click', () => {
    editorInstance.imageFit({ type: 'cover' })
  })

  // Bring to front
  bringToFrontBtn.addEventListener('click', () => {
    editorInstance.bringToFront()
  })

  // Send to back
  sendToBackBtn.addEventListener('click', () => {
    editorInstance.sendToBack()
  })

  // Сброс масштаба
  defaultScaleBtn.addEventListener('click', () => {
    editorInstance.setScale()
  })

  // Увеличение масштаба
  zoomInBtn.addEventListener('click', () => {
    editorInstance.zoom(0.1)
  })

  // Уменьшение масштаба
  zoomOutBtn.addEventListener('click', () => {
    editorInstance.zoom(-0.1)
  })

  // Группировка объектов
  groupBtn.addEventListener('click', () => {
    editorInstance.group()
  })

  // Разгруппировка объектов
  ungroupBtn.addEventListener('click', () => {
    editorInstance.ungroup()
  })

  // Удалить выбранный объект
  deleteSelectedBtn.addEventListener('click', () => {
    editorInstance.deleteSelectedObjects()
  })

  // Выделить все объекты
  selectAllBtn.addEventListener('click', () => {
    editorInstance.selectAll()
  })

  // Очистка холста
  clearBtn.addEventListener('click', () => {
    editorInstance.clearCanvas()
  })

  // Копирование объекта
  copyBtn.addEventListener('click', () => {
    editorInstance.copy()
  })

  // Вставка объекта
  pasteBtn.addEventListener('click', () => {
    editorInstance.paste()
  })

  // Поворот объекта на 90 градусов
  rotateBtn.addEventListener('click', () => {
    editorInstance.rotate(90)
  })

  // Поворот объекта на -90 градусов
  rotateLeftBtn.addEventListener('click', () => {
    editorInstance.rotate(-90)
  })

  // Flip по горизонтали
  flipXBtn.addEventListener('click', () => {
    editorInstance.flipX()
  })

  // Flip по вертикали
  flipYBtn.addEventListener('click', () => {
    editorInstance.flipY()
  })

  chooseImageBtn.addEventListener('click', () => {
    fileInput.click()
    console.log('fileInput', fileInput)
  })

  fileInput.addEventListener('change', (e) => {
    const { files } = e.target

    for (let i = 0; i < files.length; i++) {
      (function(file) {
        const reader = new FileReader()
        reader.onload = function(f) {
          editorInstance.importImage({ url: f.target.result })
        }
        reader.readAsDataURL(file)
      }(files[i]))
    }

    fileInput.value = ''
  })

  // Сохранение результата
  saveCanvasBtn.addEventListener('click', async() => {
    const file = await editorInstance.exportImageFile()

    const url = URL.createObjectURL(file)
    const link = document.createElement('a')

    link.href = url
    link.download = file.name

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  })
})
