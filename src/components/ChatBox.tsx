"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  username: string;
  text: string;
  isCorrect?: boolean;
}

interface ChatBoxProps {
  username: string;
  onMessageSend: (message: string) => void;
  messages: Message[];
  isGuessing: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  username,
  onMessageSend,
  messages,
  isGuessing
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
    
    onMessageSend(message);
    setMessage("");
  };
  
  return (
    <div className="card flex flex-col h-full">
      <div className="p-3 border-b border-card-border font-medium">
        {isGuessing ? "Guess the word!" : "Chat"}
      </div>
      <div className="flex-grow overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`p-2 rounded-lg ${
              msg.isCorrect 
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800" 
                : msg.username === "System"
                  ? "bg-gray-100 dark:bg-gray-800/50 italic text-gray-700 dark:text-gray-300"
                  : msg.username === username 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200" 
                    : "bg-gray-50 dark:bg-gray-800/20"
            }`}
          >
            <span className="font-semibold">{msg.username}:</span> {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-card-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isGuessing}
            placeholder={isGuessing ? "Type your guess..." : "Waiting for your turn..."}
            className="flex-grow p-2"
          />
          <button
            type="submit"
            disabled={!isGuessing || message.trim() === ""}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;