interface Window {
  electronAPI?: {
    hideWindow: () => void;
    sendMessage: (data: { chatId: string; message?: string; mediaData?: string; mediaType?: string; isSticker?: boolean }) => void;
    openLink: (url: string) => void;
    selectAndSendFile: (chatId: string) => Promise<boolean>;
    getChats: () => Promise<any[]>;
    getChatMessages: (chatId: string) => Promise<any[]>;
    getStatus: () => Promise<boolean>;
    onWhatsAppQr: (callback: (qr: string) => void) => void;
    onWhatsAppReady: (callback: () => void) => void;
    onWhatsAppMessage: (callback: (msg: any) => void) => void;
  };
}
