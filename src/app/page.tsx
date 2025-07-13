"use client"
import Image from "next/image";
import styles from "./page.module.css";
import { useState } from "react";

interface Message {
    role: string,
    content: string
}

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageStringCache, setMessageStringCache] = useState<string>('');

    const sendMessage = async () => {
        const newMessages = [...messages, { role: "user", content: messageStringCache }];
        setMessages(newMessages);
        setMessageStringCache('');
        const resp = await fetch('https://ai.hackclub.com/chat/completions', {
            method: 'POST',
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: newMessages })
        });
        if (!resp.ok) {
            setMessages([...newMessages, { role: "assistant", content: "I've encountered an error! Sorry!" }]);
            throw new Error(`An error occured. Resp code: ${resp.status}`);
        }
        const json = await resp.json();
        console.log(json);
        setMessages([...newMessages, { role: "assistant", content: json.choices[0].message.content }]);
    }
    return (
        <div className={styles.page}>
            {messages.map((message, index) => (
                <div className={styles.message} key={index}>
                    <b>{message.role}</b>: {message.content}
                </div>
            ))}
            <div className={styles['message-field-combo']}>
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
        </div>
    );
}
