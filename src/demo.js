document.addEventListener('DOMContentLoaded', () => {
  const chooseImageBtn = document.getElementById('choose-image')
  const saveCanvasBtn = document.getElementById('save-canvas')
  const fileInput = document.getElementById('file-input')

  window.insalesImageEditorInit('editor-canvas')

  const editor = window['editor-canvas']
  const { canvas } = editor

  console.log('window[editor-canvas]', window['editor-canvas'])

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
          window['editor-canvas'].loadImage(f.target.result)
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


  // TODO: Надо разобраться как такие ивенты сделать автоматическими при передаче определённого пропса, или свойства в options
  // При клике на объект - поднять его над другими
  canvas.on('mouse:down', (options) => {
    if (options.target) {
      editor.bringToFront(options.target)
    }
  })
})
