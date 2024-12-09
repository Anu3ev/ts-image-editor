import * as fabric from 'fabric'

console.log('init-editor.js', fabric)

export default function() {
  // Инициализируем холст Fabric.js
  const canvas = new fabric.Canvas('editor-canvas', {
    preserveObjectStacking: true
  })

  // Кнопки
  const chooseImageBtn = document.getElementById('choose-image')
  const saveCanvasBtn = document.getElementById('save-canvas')
  const fileInput = document.getElementById('file-input')

  console.log('chooseImageBtn', chooseImageBtn)

  // Открываем диалог выбора файла по нажатию на кнопку
  chooseImageBtn.addEventListener('click', () => {
    fileInput.click()
    console.log('fileInput', fileInput)
  })

  // Загрузка выбранных изображений
  fileInput.addEventListener('change', (e) => {
    const { files } = e.target

    for (let i = 0; i < files.length; i++) {
      (function(file) {
        const reader = new FileReader()
        reader.onload = function(f) {
          fabric.FabricImage.fromURL(f.target.result).then((img) => {
            console.log('img', img)
            // Добавляем изображение по центру холста
            img.set({
              left: canvas.width / 2,
              top: canvas.height / 2,
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
            canvas.add(img)
            canvas.setActiveObject(img)
            canvas.renderAll()
          })
        }
        reader.readAsDataURL(file)
      }(files[i]))
    }
  })

  // Сохранение результата
  saveCanvasBtn.addEventListener('click', () => {
    // Получаем изображение в формате dataURL
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 })
    // Можно, к примеру, открыть его в новом окне
    const win = window.open()
    win.document.write(`<img src="${dataURL}"/>`)
  })

  // Опционально: можно настроить селекцию объектов, фон и т.д.
  canvas.backgroundColor = '#fff'
  canvas.renderAll()
}
