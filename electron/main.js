import { app, BrowserWindow, globalShortcut, ipcMain, screen, Notification, dialog, shell } from 'electron';
import notifier from 'node-notifier';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let whatsappClient;

let isWhatsAppReady = false;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 400;
  const winHeight = 600;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth,
    y: height - winHeight,
    show: false, // Start hidden
    frame: false,
    transparent: true,
    vibrancy: 'fullscreen-ui', // macOS native blur behind window
    visualEffectState: 'active',
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Floating behavior
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  // Hide from dock
  if (app.dock) app.dock.hide();

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide when clicking away
  mainWindow.on('blur', () => {
    mainWindow.hide();
  });
}

function registerShortcuts() {
  const shortcutKey = process.platform === 'darwin' ? 'Option+Space' : 'Alt+Space';
  
  // Global hotkey to toggle window
  globalShortcut.register(shortcutKey, () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setupWhatsApp() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('Scan the QR code below:');
    qrcode.generate(qr, { small: true });
    // Also send to frontend if needed
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp-qr', qr);
    }
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp is ready!');
    isWhatsAppReady = true;
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp-ready');
    }
  });

  whatsappClient.on('message_create', async (message) => {
    if (mainWindow) {
      let mediaData = null;
      let mediaType = null;
      
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          if (media) {
            mediaData = media.data;
            mediaType = media.mimetype;
          }
        } catch (err) {
          console.error("Failed to download media:", err);
        }
      }

      mainWindow.webContents.send('whatsapp-message', {
        id: message.id._serialized,
        body: message.body,
        from: message.from,
        to: message.to,
        fromMe: message.fromMe,
        timestamp: message.timestamp,
        author: message.author,
        hasMedia: message.hasMedia,
        mediaData,
        mediaType,
      });

      // Secret Notification
      if (!mainWindow.isVisible() && !message.fromMe) {
        notifier.notify({
          title: 'System Process',
          message: 'Background sync complete.',
          sound: true
        });
      }
    }
  });

  whatsappClient.initialize();
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
  setupWhatsApp();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('get-status', () => {
  return isWhatsAppReady;
});

ipcMain.handle('get-chats', async () => {
  if (whatsappClient) {
    try {
      const chats = await whatsappClient.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        unreadCount: chat.unreadCount,
        timestamp: chat.timestamp
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
});

ipcMain.on('send-message', async (event, { chatId, message, mediaData, mediaType, isSticker }) => {
  if (whatsappClient) {
    try {
      if (mediaData) {
        const media = new MessageMedia(mediaType, mediaData);
        await whatsappClient.sendMessage(chatId, media, { sendMediaAsSticker: isSticker, caption: message || '' });
      } else {
        await whatsappClient.sendMessage(chatId, message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
});

ipcMain.handle('get-chat-messages', async (event, chatId) => {
  if (whatsappClient) {
    try {
      const chat = await whatsappClient.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 50 });
      
      const formattedMessages = await Promise.all(messages.map(async (msg) => {
        let mediaData = null;
        let mediaType = null;
        if (msg.hasMedia) {
          try {
            const media = await msg.downloadMedia();
            if (media) {
              mediaData = media.data;
              mediaType = media.mimetype;
            }
          } catch (err) {
            console.error('Failed to download history media', err);
          }
        }
        return {
          id: msg.id._serialized,
          body: msg.body,
          from: msg.from,
          to: msg.to,
          fromMe: msg.fromMe,
          timestamp: msg.timestamp,
          author: msg.author,
          hasMedia: msg.hasMedia,
          mediaData,
          mediaType,
        };
      }));
      return formattedMessages;
    } catch (err) {
      console.error(err);
      return [];
    }
  }
  return [];
});

ipcMain.on('open-link', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('select-and-send-file', async (event, chatId) => {
  if (!whatsappClient) return;
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    message: 'Select a file to send securely'
  });
  
  if (!canceled && filePaths.length > 0) {
    try {
      const media = MessageMedia.fromFilePath(filePaths[0]);
      await whatsappClient.sendMessage(chatId, media);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  return false;
});
