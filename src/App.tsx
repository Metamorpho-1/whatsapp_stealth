import { useState, useEffect, useRef } from 'react';
import { Search, Terminal, MessageSquare, ShieldCheck, QrCode, ArrowLeft, Image as ImageIcon, SmilePlus, Sticker, Paperclip, Palette } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const Linkify = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (!text) return null;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a 
              key={i} 
              href="#" 
              onClick={(e) => { e.preventDefault(); window.electronAPI?.openLink(part); }} 
              className="text-blue-400 hover:underline underline-offset-2"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export default function App() {
  const [input, setInput] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [lightbox, setLightbox] = useState<{data: string, type: string} | null>(null);
  const [savedStickers, setSavedStickers] = useState<any[]>([]);
  
  const [skin, setSkin] = useState<'glass' | 'terminal' | 'notes' | 'ghost' | 'vscode' | 'slack' | 'excel' | 'notion'>('glass');
  const [panicMode, setPanicMode] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stash = localStorage.getItem('stealth-stickers');
    if (stash) {
      try { setSavedStickers(JSON.parse(stash)); } catch(e){}
    }
    const savedSkin = localStorage.getItem('stealth-skin');
    if (savedSkin) {
      setSkin(savedSkin as any);
    }

    inputRef.current?.focus();

    if (window.electronAPI) {
      window.electronAPI.onWhatsAppQr((qrCodeStr) => {
        setQr(qrCodeStr);
      });

      if (window.electronAPI.getStatus) {
        window.electronAPI.getStatus().then(async (ready) => {
          if (ready) {
            setIsReady(true);
            setQr(null);
            if (window.electronAPI?.getChats) {
              const fetchedChats = await window.electronAPI.getChats();
              setChats(fetchedChats);
            }
          }
        });
      }

      window.electronAPI.onWhatsAppReady(async () => {
        setIsReady(true);
        setQr(null);
        if (window.electronAPI?.getChats) {
          const fetchedChats = await window.electronAPI.getChats();
          setChats(fetchedChats);
        }
      });

      window.electronAPI.onWhatsAppMessage((msg) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Panic Mask Boss Key: Ctrl + Space
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setPanicMode(p => !p);
        return;
      }

      if (e.key === 'Escape' && !lightbox && !showEmoji && !showStickers && !panicMode) {
        window.electronAPI?.hideWindow();
      } else if (e.key === 'Escape') {
        setLightbox(null);
        setShowEmoji(false);
        setShowStickers(false);
        setPanicMode(false);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [lightbox, showEmoji, showStickers, panicMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChat, panicMode]);

  const toggleSkin = () => {
    const skins: any[] = ['glass', 'terminal', 'notes', 'ghost', 'vscode', 'slack', 'excel', 'notion'];
    const next = skins[(skins.indexOf(skin) + 1) % skins.length];
    setSkin(next);
    localStorage.setItem('stealth-skin', next);
  };

  const loadChatHistory = async (chat: any) => {
    setSelectedChat(chat);
    setInput('');
    setMessages([]);
    if (window.electronAPI?.getChatMessages) {
      const history = await window.electronAPI.getChatMessages(chat.id);
      setMessages(history);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim()) return;

      if (selectedChat) {
        window.electronAPI?.sendMessage({ chatId: selectedChat.id, message: input });
        setInput('');
        setShowEmoji(false);
        setShowStickers(false);
      } else {
        if (input.startsWith('/send ')) {
          const parts = input.split(' ');
          const number = parts[1];
          const message = parts.slice(2).join(' ');
          if (number && message) {
            window.electronAPI?.sendMessage({ chatId: `${number}@c.us`, message });
          }
        }
        setInput('');
        window.electronAPI?.hideWindow();
      }
    }
  };

  const saveStickerToStash = (mediaData: string, mediaType: string) => {
    const newStickers = [{mediaData, mediaType}, ...savedStickers].slice(0, 50);
    setSavedStickers(newStickers);
    localStorage.setItem('stealth-stickers', JSON.stringify(newStickers));
  };

  const sendSticker = (mediaData: string, mediaType: string) => {
    if (selectedChat) {
      window.electronAPI?.sendMessage({ 
        chatId: selectedChat.id, 
        mediaData, 
        mediaType, 
        isSticker: true 
      });
      setShowStickers(false);
    }
  };

  const uploadFile = async () => {
    if (selectedChat && window.electronAPI?.selectAndSendFile) {
      await window.electronAPI.selectAndSendFile(selectedChat.id);
    }
  };

  const filteredChats = chats.filter(chat => chat.name?.toLowerCase().includes(input.toLowerCase()));

  const visibleMessages = messages.filter(m => {
    if (!selectedChat) return false;
    return m.from === selectedChat.id || m.to === selectedChat.id;
  });

  // Skin configurations
  const skinStyles = {
    glass: {
      wrapper: "bg-black/5 rounded-xl border border-white/5 shadow-none text-white/90 font-sans",
      header: "border-b border-white/10 bg-transparent text-white/60",
      input: "text-white placeholder:text-white/40",
      button: "hover:bg-white/10 hover:text-white text-white/60",
      msgFromMe: "bg-white/20 text-white backdrop-blur-md",
      msgFromThem: "bg-black/20 text-white/90 backdrop-blur-md",
      contactHover: "hover:bg-white/10",
      contactIcon: "bg-white/10 text-white/60",
      contactName: "text-white/90",
    },
    terminal: {
      wrapper: "bg-[#1e1e1e] rounded-sm border border-[#333] text-[#00ff00] font-mono shadow-xl",
      header: "border-b border-[#333] bg-[#1e1e1e] text-[#00ff00]/60",
      input: "text-[#00ff00] placeholder:text-[#00ff00]/40",
      button: "hover:bg-[#00ff00]/10 hover:text-[#00ff00] text-[#00ff00]/60",
      msgFromMe: "bg-[#1e1e1e] text-[#00ff00] border border-[#00ff00]/30",
      msgFromThem: "bg-[#1e1e1e] text-[#00ff00]/80",
      contactHover: "hover:bg-[#00ff00]/10",
      contactIcon: "bg-transparent text-[#00ff00]/60",
      contactName: "text-[#00ff00]",
    },
    notes: {
      wrapper: "bg-[#fdf6e3] rounded-sm border border-[#e5e0c8] shadow-md text-[#657b83] font-serif",
      header: "border-b border-[#e5e0c8] bg-[#fdf6e3] text-[#93a1a1]",
      input: "text-[#586e75] placeholder:text-[#93a1a1]",
      button: "hover:bg-[#eee8d5] hover:text-[#586e75] text-[#93a1a1]",
      msgFromMe: "bg-[#eee8d5] text-[#586e75]",
      msgFromThem: "bg-transparent text-[#657b83] border-l-2 border-[#cb4b16] rounded-none",
      contactHover: "hover:bg-[#eee8d5]",
      contactIcon: "bg-transparent text-[#93a1a1]",
      contactName: "text-[#586e75] font-bold",
    },
    ghost: {
      wrapper: "bg-transparent shadow-none text-black/80 font-sans",
      header: "border-none bg-transparent text-transparent",
      input: "text-black/80 placeholder:text-transparent",
      button: "opacity-10 hover:opacity-100 text-black",
      msgFromMe: "bg-transparent text-black font-bold",
      msgFromThem: "bg-transparent text-black/80",
      contactHover: "hover:bg-black/5",
      contactIcon: "opacity-0",
      contactName: "text-black/80",
    },
    vscode: {
      wrapper: "bg-[#1e1e1e] rounded-md border border-[#333] text-[#d4d4d4] font-mono",
      header: "border-b border-[#333] bg-[#252526] text-[#858585]",
      input: "text-[#d4d4d4] placeholder:text-[#858585]",
      button: "hover:bg-[#333] hover:text-[#d4d4d4] text-[#858585]",
      msgFromMe: "bg-[#2d2d30] text-[#9cdcfe]",
      msgFromThem: "bg-[#1e1e1e] text-[#ce9178]",
      contactHover: "hover:bg-[#2a2d2e]",
      contactIcon: "bg-transparent text-[#569cd6]",
      contactName: "text-[#dcdcaa]",
    },
    slack: {
      wrapper: "bg-[#3f0e40] rounded-lg border border-[#350d36] text-[#d1d2d3] font-sans",
      header: "border-b border-[#350d36] bg-[#350d36] text-[#ab9ba9]",
      input: "text-white placeholder:text-[#ab9ba9]",
      button: "hover:bg-[#1164a3] hover:text-white text-[#ab9ba9]",
      msgFromMe: "bg-[#1164a3] text-white",
      msgFromThem: "bg-transparent text-[#d1d2d3]",
      contactHover: "hover:bg-[#1164a3]",
      contactIcon: "bg-transparent text-[#ab9ba9]",
      contactName: "text-[#ab9ba9] font-bold hover:text-white",
    },
    excel: {
      wrapper: "bg-white rounded-none border-2 border-[#107c41] text-black font-sans grid-bg",
      header: "border-b-2 border-[#107c41] bg-[#f3f2f1] text-[#107c41]",
      input: "text-black placeholder:text-gray-400 border border-gray-300 bg-white",
      button: "hover:bg-[#107c41] hover:text-white text-[#107c41]",
      msgFromMe: "bg-white text-black border border-gray-300 rounded-none shadow-sm",
      msgFromThem: "bg-[#f3f2f1] text-black border border-gray-300 rounded-none shadow-sm",
      contactHover: "hover:bg-[#f3f2f1]",
      contactIcon: "bg-transparent text-[#107c41]",
      contactName: "text-black",
    },
    notion: {
      wrapper: "bg-white rounded-lg border border-gray-200 text-[#37352f] font-sans shadow-sm",
      header: "border-none bg-white text-[#999]",
      input: "text-[#37352f] placeholder:text-[#999]",
      button: "hover:bg-gray-100 hover:text-[#37352f] text-[#999]",
      msgFromMe: "bg-gray-100 text-[#37352f] rounded-md",
      msgFromThem: "bg-white text-[#37352f]",
      contactHover: "hover:bg-gray-50",
      contactIcon: "bg-transparent text-[#999]",
      contactName: "text-[#37352f] font-medium",
    }
  }[skin];

  if (panicMode) {
    return (
      <div className="flex flex-col w-screen h-screen bg-[#1e1e1e] p-4 font-mono text-[#00ff00] text-xs overflow-hidden">
        <div className="mb-2 opacity-50">kernel: System Diagnostics Triggered.</div>
        <div>[  OK  ] Started Thermal Daemon Service.</div>
        <div>[  OK  ] Started Authorization Manager.</div>
        <div>[  OK  ] Started Network Time Synchronization.</div>
        <div>[  OK  ] Reached target System Initialization.</div>
        <div className="mt-2 text-[#d4d4d4]">Compiling dependencies...</div>
        <div className="text-yellow-500">Warning: module 'stealth' has no exported member 'Panic'</div>
        <div className="mt-4 animate-pulse">Building target [=================>   ] 85%</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen bg-transparent justify-end pb-2 pr-2 pl-2">
      {/* Lightbox Modal */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <img 
            src={`data:${lightbox.type};base64,${lightbox.data}`} 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Camouflaged UI */}
      <div className={`w-full max-h-[85vh] max-w-2xl mx-auto overflow-hidden flex flex-col relative transition-colors ${skinStyles.wrapper}`}>
        
        {/* Header / Input Area */}
        <div className={`flex items-center px-4 py-3 shrink-0 relative z-20 transition-colors ${skinStyles.header}`}>
          {selectedChat ? (
            <button onClick={() => setSelectedChat(null)} className={`mr-3 transition-colors ${skinStyles.button}`}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Search className="w-5 h-5 mr-3 opacity-60" />
          )}
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedChat ? `Message ${selectedChat.name}...` : "Search contacts or type /send..."}
            className={`flex-1 bg-transparent border-none outline-none text-base resize-none h-6 min-h-[24px] max-h-32 custom-scrollbar transition-colors ${skinStyles.input}`}
            autoFocus
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '24px';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          
          {selectedChat && (
            <div className="flex items-center space-x-1 ml-2">
              <button onClick={uploadFile} className={`p-1.5 rounded-md transition-colors ${skinStyles.button}`}>
                <Paperclip className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }} className={`p-1.5 rounded-md transition-colors ${skinStyles.button}`}>
                <SmilePlus className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); }} className={`p-1.5 rounded-md transition-colors ${skinStyles.button}`}>
                <Sticker className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={toggleSkin} className={`p-1.5 ml-2 rounded-md transition-colors ${skinStyles.button}`} title="Toggle Skin">
            <Palette className="w-4 h-4" />
          </button>
        </div>

        {/* Popovers */}
        {showEmoji && (
          <div className="absolute top-[60px] right-4 z-30 shadow-2xl rounded-xl overflow-hidden border border-black/10 opacity-95">
            <EmojiPicker theme={Theme.AUTO} onEmojiClick={(emojiData) => setInput(prev => prev + emojiData.emoji)} />
          </div>
        )}

        {showStickers && (
          <div className="absolute top-[60px] right-4 z-30 w-72 h-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col">
            <div className="text-xs font-semibold text-white/60 uppercase mb-3">Local Sticker Stash</div>
            {savedStickers.length === 0 ? (
              <div className="text-sm text-white/50 text-center mt-10">Right-click a received sticker to save it here.</div>
            ) : (
              <div className="grid grid-cols-4 gap-2 overflow-y-auto custom-scrollbar">
                {savedStickers.map((s, i) => (
                  <div key={i} onClick={() => sendSticker(s.mediaData, s.mediaType)} className="aspect-square bg-white/5 rounded cursor-pointer hover:bg-white/20 transition-colors p-1">
                    <img src={`data:${s.mediaType};base64,${s.mediaData}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Area */}
        <div className="flex flex-col p-2 overflow-y-auto custom-scrollbar flex-1 relative z-10">
          
          {!isReady && !qr && (
            <div className={`flex items-center px-3 py-2 text-sm opacity-60`}>
              <Terminal className="w-4 h-4 mr-3" />
              Initializing secure connection...
            </div>
          )}

          {qr && (
            <div className={`flex flex-col items-center justify-center p-6 text-sm opacity-80`}>
              <QrCode className="w-8 h-8 mb-3" />
              <p className="mb-2">Security Auth Required</p>
              <div className="bg-white p-2 rounded backdrop-blur-md">
                <p className="text-black text-xs font-mono max-w-xs break-all text-center">
                  Check terminal for QR code
                </p>
              </div>
            </div>
          )}

          {/* Chat List */}
          {isReady && !selectedChat && chats.length > 0 && (
            <div className="flex flex-col pb-4">
              <div className="px-3 py-2 text-xs font-semibold opacity-50 uppercase tracking-wider sticky top-0 bg-inherit z-10 backdrop-blur">
                Recent Contacts
              </div>
              {filteredChats.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => loadChatHistory(chat)}
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer group transition-colors ${skinStyles.contactHover}`}
                >
                  <div className={`p-2 rounded-md mr-3 transition-colors relative ${skinStyles.contactIcon}`}>
                    <MessageSquare className="w-4 h-4 opacity-80" />
                    {chat.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className={`text-sm transition-colors ${skinStyles.contactName}`}>
                      {chat.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Chat Messages */}
          {isReady && selectedChat && (
            <div className="flex flex-col justify-end min-h-full pb-4">
              {visibleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center opacity-40 p-8 h-full">
                  <ShieldCheck className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm text-center">Secure channel open.<br/>Loading history or start typing...</p>
                </div>
              ) : (
                visibleMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex flex-col max-w-[85%] mb-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      msg.fromMe ? `self-end ${skinStyles.msgFromMe}` : `self-start ${skinStyles.msgFromThem}`
                    }`}
                  >
                    {!msg.fromMe && msg.author && (
                      <span className="text-xs opacity-50 mb-1">{msg.author}</span>
                    )}
                    
                    {/* Render Media */}
                    {msg.hasMedia && msg.mediaData && (
                      <div className="mb-2 rounded overflow-hidden">
                        {msg.mediaType?.startsWith('image/') || msg.mediaType?.startsWith('video/') ? (
                          <div className="relative group cursor-pointer" onClick={() => setLightbox({data: msg.mediaData, type: msg.mediaType})}>
                            <img 
                              src={`data:${msg.mediaType};base64,${msg.mediaData}`} 
                              alt="Media" 
                              className="max-w-full h-auto max-h-48 object-contain rounded"
                            />
                            {!msg.fromMe && msg.mediaType.includes('webp') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); saveStickerToStash(msg.mediaData, msg.mediaType); }}
                                className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Save
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center text-xs opacity-60 bg-black/10 p-2 rounded">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            [Media: {msg.mediaType}]
                          </div>
                        )}
                      </div>
                    )}
                    
                    {msg.body && <span className="whitespace-pre-wrap break-words"><Linkify text={msg.body} /></span>}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
