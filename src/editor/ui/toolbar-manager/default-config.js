import {
  copyPasteIcon,
  lockIcon,
  unlockIcon,
  bringForwardIcon,
  sendBackwardsIcon,
  bringToFrontIcon,
  sendToBackIcon,
  deleteIcon
} from './icons'

export default {
  style: {
    position: 'absolute',
    display: 'none',
    background: '#2B2D33',
    borderRadius: '8px',
    padding: '0 8px',
    height: '32px',
    gap: '10px',
    zIndex: 10,
    alignItems: 'center'
  },

  btnStyle: {
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '20px',
    width: '20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    transform: 'scale(1)'
  },

  btnHover: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '50%',
    transform: 'scale(1.1)'
  },

  toolbarClass: 'fabric-editor-toolbar',
  btnClass: 'fabric-editor-toolbar-btn',

  lockedActions: [{
    name: 'Разблокировать',
    handle: 'unlock'
  }],

  actions: [
    {
      name: 'Создать копию',
      handle: 'copyPaste'
    },
    {
      name: 'Заблокировать',
      handle: 'lock'
    },
    {
      name: 'На передний план',
      handle: 'bringToFront'
    },
    {
      name: 'На задний план',
      handle: 'sendToBack'
    },
    {
      name: 'На один уровень вверх',
      handle: 'bringForward'
    },
    {
      name: 'На один уровень вниз',
      handle: 'sendBackwards'
    },
    {
      name: 'Удалить',
      handle: 'delete'
    }
  ],

  offsetTop: 50,

  icons: {
    copyPaste: copyPasteIcon,
    delete: deleteIcon,
    lock: lockIcon,
    unlock: unlockIcon,
    bringToFront: bringToFrontIcon,
    sendToBack: sendToBackIcon,
    bringForward: bringForwardIcon,
    sendBackwards: sendBackwardsIcon
  },

  handlers: {
    copyPaste: async(editor) => {
      await editor.copy()
      await editor.paste()
    },

    delete: (editor) => {
      editor.deleteSelectedObjects()
    },

    lock: (editor) => {
      editor.lockObject()
    },

    unlock: (editor) => {
      editor.unlockObject()
    },

    bringForward: (editor) => {
      editor.bringForward()
    },

    bringToFront: (editor) => {
      editor.bringToFront()
    },

    sendToBack: (editor) => {
      editor.sendToBack()
    },

    sendBackwards: (editor) => {
      editor.sendBackwards()
    }
  }
}
