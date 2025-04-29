export default {
  style: {
    position: 'absolute',
    display: 'none',
    background: '#000',
    borderRadius: '8px',
    padding: '4px 8px',
    gap: '8px',
    zIndex: 10,
    alignItems: 'center'
  },

  actions: ['copyPaste', 'delete', 'lock', 'bringForward', 'sendBack'],

  handlers: {
    copyPaste: (editor) => {
      console.log('copyPaste')
    },

    delete: (editor) => {
      console.log('delete')
    },

    lock: (editor) => {
      console.log('lock')
    },

    bringForward: (editor) => {
      console.log('bringForward')
    },

    sendBack: (editor) => {
      console.log('sendBack')
    }
  },

  icons: {
    copyPaste: '📋',
    delete: '🗑️',
    lock: '🔒',
    bringForward: '⬆️',
    sendBack: '⬇️'
  }
}
