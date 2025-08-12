"use client"
import Image from "next/image";
import styles from "./page.module.css";
import React, { Component, useState } from "react";
import remarkGfm from "remark-gfm";
import Markdown, { Components } from 'react-markdown'

interface Message {
    role: string,
    content: string
}

// This is the interface for props passed from react-markdown
interface ThinkingProcessProps {
  node?: any; // The 'node' property is often not used, but it's passed.
  children?: React.ReactNode; // 'children' is the content inside your <think> tag.
}

type CustomComponents = Components & {
  think: React.ElementType;
};

// Now, type your component correctly.
const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <button onClick={toggleExpansion}>
        Thinking... {isExpanded ? '▲' : '▼'}
      </button>
      {isExpanded && <div className={styles['thonk-child']}>{children}</div>}
    </div>
  );
};

export default function Home() {
    // qwen/qwen3-32b, openai/gpt-oss-120b, openai/gpt-oss-20b, meta-llama/llama-4-maverick-17b-128e-instruct
    const models = [
        'qwen/qwen3-32b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'meta-llama/llama-4-maverick-17b-128e-instruct'
    ]
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageStringCache, setMessageStringCache] = useState<string>('');
    const [includeReasoning, setIncludeReasoning] = useState<boolean>(false);
    const [model, setModel] = useState<string>('openai/gpt-oss-120b');

    const sendMessage = async () => {
        // Add the user's message to the state
        const userMessage = { role: "user", content: messageStringCache };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setMessageStringCache('');

        // Add a placeholder for the assistant's response to display immediately
        const assistantMessagePlaceholder = { role: "assistant", content: "" };
        setMessages([...newMessages, assistantMessagePlaceholder]);

        const resp = await fetch('https://ai.hackclub.com/chat/completions', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ stream: true, model: model, messages: newMessages })
        });

        if (!resp.ok) {
            setMessages([...newMessages, { role: "assistant", content: "I've encountered an error! Sorry!" }]);
            console.error(resp)
        }

        // Get a text reader from the response body
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder("utf-8");

        let done = false;
        let accumulatedContent = "";

        // Loop through the streaming chunks
        while (!done) {
            const { value, done: doneReading } = await reader!.read();
            done = doneReading;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                console.log(line)
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.choices[0].delta && data.choices[0].delta.content) {
                            const newContent = data.choices[0].delta.content;
                            accumulatedContent += newContent;

                            // Update the last message with the new content
                            setMessages(currentMessages => {
                                const lastMessageIndex = currentMessages.length - 1;
                                const updatedMessages = [...currentMessages];
                                updatedMessages[lastMessageIndex] = {
                                    ...updatedMessages[lastMessageIndex],
                                    content: updatedMessages[lastMessageIndex].content + newContent
                                };
                                return updatedMessages;
                            });
                        }
                    } catch (e) {
                        console.error("Failed to parse JSON from stream chunk:", e);
                    }
                }
            }
        }
    }
    return (
        <div className={styles.page}>
            <div className={styles['messages-container']}>
                {messages.length > 0 && (
                    messages.map((message, index) => (
                        <div className={`${styles.message} ${styles[message.role]}`} key={index}>
                            <div>
                                <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                            </div>
                        </div>
                    ))
                )}
                {messages.length == 0 && (
                    <div className={styles['no-msgs']}>
                        <h1>I am Hack Club AI</h1>
                        <span>Ask me anything, but nothing inappropriate!</span>
                    </div>
                )}
            </div>
            <div className={styles['message-field-combo']}>
                <div className={styles['message-field']}>
                    <textarea 
                        placeholder="Ask Hack Club AI anything"
                        value={messageStringCache}
                        onChange={(e) => {setMessageStringCache(e.target.value)}}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                    />
                </div>
                <div>
                    <label>Model</label>
                    <select onChange={(e) => setModel(e.target.value)}>
                        {models.map((model, index) => (
                            <option value={model} key={index}>{model}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
