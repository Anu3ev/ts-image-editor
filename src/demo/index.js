import initListeners from './listeners'
import initEditor from '../main'

document.addEventListener('DOMContentLoaded', async() => {
  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    width: 800,
    height: 600,
    displayWidth: '800px',
    displayHeight: '600px'
  })

  initListeners(editorInstance)
})
