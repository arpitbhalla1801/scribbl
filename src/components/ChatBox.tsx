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
      <div className="p-3 border-b border-card-border text-sm text-gray-600 dark:text-gray-400">
        {isGuessing ? "Guess the Word" : "Chat"}
        {isGuessing && (
          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
            active
          </span>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto p-3 space-y-2 min-h-0 max-h-64">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            No messages yet...
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-2 rounded text-sm ${
                msg.isCorrect 
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" 
                  : msg.username === "System"
                    ? "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 italic"
                    : msg.username === username 
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" 
                      : "bg-gray-50 dark:bg-gray-800"
              }`}
            >
              <div className="font-medium mb-1 text-xs">
                {msg.username === username ? 'You' : msg.username}
                {msg.isCorrect && (
                  <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                )}
              </div>
              <div className="break-words">{msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t border-card-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isGuessing}
            placeholder={
              hasGuessedCorrectly
                ? "You guessed correctly! ✓"
                : isGuessing 
                  ? "Type your guess..." 
                  : "Waiting for your turn..."
            }
            className="flex-1 px-3 py-2 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isGuessing || message.trim() === ""}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;