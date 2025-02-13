import initListeners from './listeners'

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация редактора
  window.ImageEditorInit('editor', {
    width: 800,
    height: 600,
    displayWidth: '800px',
    displayHeight: '600px'
  })

  const editorInstance = window.editor
  console.log('editorInstance', editorInstance)

  initListeners(editorInstance)
})
