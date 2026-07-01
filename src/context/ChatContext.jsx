import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { UserContext } from './UserContext.jsx';
import { AppContext } from './AppContext.jsx';

export const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { currentUser } = useContext(UserContext);
  const { language } = useContext(AppContext);
  const [activeChatJobId, setActiveChatJobId] = useState(null);
  const [messages, setMessages] = useState([]);

  // جلب كافة الرسائل المتعلقة بالتذكرة الحالية وتفعيل المزامنة اللحظية
  useEffect(() => {
    if (!activeChatJobId) {
      setMessages([]);
      return;
    }

    // 1. جلب الرسائل السابقة الموثقة بقاعدة البيانات
    const loadMessages = async () => {
      try {
        const history = await db.messages.getByJob(activeChatJobId);
        setMessages(history);
      } catch (err) {
        console.error("فشل جلب الرسائل السابقة:", err);
      }
    };
    loadMessages();

    // 2. تفعيل الاشتراك اللحظي (Supabase Real-time / LocalStorage Storage Event Sync)
    const subscription = db.messages.subscribe(activeChatJobId, (newMessage) => {
      setMessages(prev => {
        // التحقق لمنع تكرار الرسائل المستلمة
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [activeChatJobId]);

  // إرسال رسالة دردشة فورية مع معالجة حماية XSS آلياً
  const sendMessage = async (text, receiverId) => {
    if (!currentUser || !activeChatJobId) return;

    const messagePayload = {
      job_id: activeChatJobId,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      text: text,
      timestamp: new Date().toISOString()
    };

    try {
      await db.messages.send(messagePayload);
    } catch (err) {
      console.error("فشل إرسال رسالة الدردشة:", err);
    }
  };

  return (
    <ChatContext.Provider value={{ activeChatJobId, setActiveChatJobId, messages, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
