import { useCallback, useEffect, useRef, useState } from 'react';
import { mockChatMessages, type ChatMessage } from '../../../data/mock';
import { cn } from '../../../utils/cn';
import { toast } from '../../ui';
import styles from './ChatView.module.scss';

const LINE_HEIGHT = 24;
const MAX_LINES = 4;
const MAX_HEIGHT = LINE_HEIGHT * MAX_LINES;

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [draft, setDraft] = useState('');
  const [multiline, setMultiline] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const syncTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, LINE_HEIGHT), MAX_HEIGHT);
    el.style.height = `${next}px`;
    setMultiline(next > LINE_HEIGHT + 1);
  }, []);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages, scrollMessagesToBottom]);

  useEffect(() => {
    syncTextarea();
  }, [draft, syncTextarea]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const keepInputVisible = () => {
      if (document.activeElement !== textareaRef.current) return;
      textareaRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    };

    vv.addEventListener('resize', keepInputVisible);
    return () => vv.removeEventListener('resize', keepInputVisible);
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, msg]);
    setDraft('');
    toast.info('顾问将在 24 小时内回复（演示）');
  };

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>在线咨询</h1>
        <p className={styles.headerStatus}>顾问在线 · 预计 5 分钟内回复</p>
      </header>

      <div ref={messagesRef} className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={cn(styles.bubbleRow, styles[msg.role])}>
            <div className={styles.bubble}>
              {msg.content}
              <div className={styles.time}>{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={cn(styles.inputBar, multiline && styles.inputBarMultiline)}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          value={draft}
          placeholder="输入咨询内容…"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onInput={syncTextarea}
          onFocus={() => {
            scrollMessagesToBottom();
            requestAnimationFrame(() => {
              textareaRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          className={styles.sendBtn}
          disabled={!draft.trim()}
          aria-label="发送"
          onClick={send}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
