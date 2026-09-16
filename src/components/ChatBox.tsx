"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  username: string;
  text: string;
  isCorrect?: boolean;
}

interface ChatBoxProps {
  username: string;
  onMessageSend: (message: string, timeLeft?: number) => void;
  messages: Message[];
  isGuessing: boolean;
  timeLeft?: number;
  hasGuessedCorrectly?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  username,
  onMessageSend,
  messages,
  isGuessing,
  timeLeft,
  hasGuessedCorrectly = false
}) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === "") return;
    onMessageSend(message, timeLeft);
    setMessage("");
  };

  return (
    <div className="card flex flex-col h-full">
      <div className="p-3 border-b-2 flex items-center gap-2" style={{ borderColor: 'var(--card-border)' }}>
        <span className="font-bold text-sm text-primary">
          {isGuessing ? "Guess the word" : "Chat"}
        </span>
        {isGuessing && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'var(--marker-green)' }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-3 space-y-2 min-h-0 max-h-64">
        {messages.length === 0 ? (
          <div className="text-center text-muted py-8 text-sm">
            No guesses yet — say hi! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.username === username;
            const isSystem = msg.username === "System";
            return (
              <div
                key={msg.id}
                className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] ${isMe ? 'ml-auto' : ''} ${isSystem ? 'mx-auto text-center italic' : ''}`}
                style={
                  msg.isCorrect
                    ? { background: 'var(--success-light)', color: 'var(--marker-green-dark)', border: '2px solid var(--marker-green)' }
                    : isSystem
                      ? { background: 'transparent', color: 'var(--text-muted)' }
                      : isMe
                        ? { background: 'var(--marker-blue)', color: '#fff' }
                        : { background: 'var(--paper-dim)', color: 'var(--text-primary)' }
                }
              >
                {!isSystem && (
                  <div className="font-bold mb-0.5 text-xs opacity-80">
                    {isMe ? 'You' : msg.username}
                    {msg.isCorrect && <span className="ml-1">✓</span>}
                  </div>
                )}
                <div className="break-words">{msg.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t-2" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isGuessing}
            placeholder={
              hasGuessedCorrectly
                ? "You got it! ✓"
                : isGuessing
                  ? "Type your guess…"
                  : "Waiting for your turn…"
            }
            className="flex-1 !py-2 !text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isGuessing || message.trim() === ""}
            className="btn-primary !min-h-0 !py-2 !px-4 !text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
