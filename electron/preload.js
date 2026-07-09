const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hideWindow: () => ipcRenderer.send('hide-window'),
  sendMessage: (data) => ipcRenderer.send('send-message', data),
  openLink: (url) => ipcRenderer.send('open-link', url),
  selectAndSendFile: (chatId) => ipcRenderer.invoke('select-and-send-file', chatId),
  getChats: () => ipcRenderer.invoke('get-chats'),
  getChatMessages: (chatId) => ipcRenderer.invoke('get-chat-messages', chatId),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onWhatsAppQr: (callback) => ipcRenderer.on('whatsapp-qr', (_event, qr) => callback(qr)),
  onWhatsAppReady: (callback) => ipcRenderer.on('whatsapp-ready', () => callback()),
  onWhatsAppMessage: (callback) => ipcRenderer.on('whatsapp-message', (_event, msg) => callback(msg)),
  onWhatsAppMessageAck: (callback) => ipcRenderer.on('whatsapp-message-ack', (_event, data) => callback(data)),
});
