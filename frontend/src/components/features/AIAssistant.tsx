"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useDemo } from "@/state/DemoContext";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button, IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";

export function AssistantConversation({ expanded = false }: { expanded?: boolean }) {
  const { ai, aiSuggestions, sendAiMessage, triggerAiError, clearAiError, clearAiConversation } = useDemo();
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [ai.messages, ai.isTyping]);

  const send = () => {
    if (!value.trim()) return;
    sendAiMessage(value);
    setValue("");
  };

  return <div className={cn("assistant-conversation", expanded && "assistant-expanded")}>
    <div className="assistant-messages" aria-live="polite">
      {!ai.messages.length && <div className="assistant-empty"><Bot size={25} /><strong>كيف أساعدك اليوم؟</strong><p>اختر اقتراحًا أو اكتب ما يشغلك الآن.</p></div>}
      {ai.messages.map((message) => <div key={message.id} className={cn("assistant-message", message.role === "user" ? "assistant-user" : "assistant-bot")}>
        {message.role === "assistant" && <span className="assistant-avatar"><AppIcon name="assistant" size={19} /></span>}
        <div><p>{message.content}</p><span>{message.createdAt}</span></div>
      </div>)}
      {ai.isTyping && <div className="assistant-message assistant-bot"><span className="assistant-avatar"><AppIcon name="assistant" size={19} /></span><div className="typing-dots" aria-label="المساعد يكتب"><i /><i /><i /></div></div>}
      {ai.error && <div className="assistant-error"><span>{ai.error}</span><Button size="sm" variant="ghost" onClick={clearAiError}>إغلاق</Button></div>}
      <div ref={endRef} />
    </div>
    {!expanded && <div className="assistant-suggestions">{aiSuggestions.slice(0, 2).map((suggestion) => <button type="button" key={suggestion} onClick={() => sendAiMessage(suggestion)}>{suggestion}</button>)}</div>}
    {expanded && <div className="assistant-suggestions">{aiSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => sendAiMessage(suggestion)}>{suggestion}</button>)}</div>}
    <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); send(); }}>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="اكتب ما تحتاجه الآن..." aria-label="رسالة إلى مساعد الذكاء الاصطناعي" />
      <IconButton label="إرسال الرسالة" type="submit" className="assistant-send"><Send size={18} /></IconButton>
    </form>
    {expanded && <div className="assistant-debug-actions"><button type="button" onClick={clearAiConversation}>محادثة جديدة</button><button type="button" onClick={triggerAiError}>محاكاة حالة خطأ</button></div>}
  </div>;
}

export function AIAssistantWidget() {
  const { ai, openAi, closeAi } = useDemo();
  return <>
    <button type="button" className="ai-fab" aria-label="فتح مساعد الذكاء الاصطناعي" title="مساعد رحلة التغيير" onClick={openAi}><Sparkles size={21} /><span>مساعدك</span></button>
    {ai.isOpen && <div className="assistant-widget" role="dialog" aria-modal="false" aria-label="مساعد الذكاء الاصطناعي">
      <div className="assistant-widget-header"><div className="assistant-title"><span className="assistant-avatar"><AppIcon name="assistant" size={21} /></span><div><strong>مساعد رحلة التغيير</strong><span><i /> متاح الآن</span></div></div><IconButton label="إغلاق مساعد الذكاء الاصطناعي" onClick={closeAi}><X size={19} /></IconButton></div>
      <AssistantConversation />
    </div>}
  </>;
}

export function AIAssistantHero() {
  return <div className="ai-page-shell"><div className="ai-page-intro"><span className="ai-hero-mark"><Bot size={27} /><Sparkles size={14} /></span><div><p className="eyebrow">مساعد ذكي تجريبي</p><h2>خلّنا نرتب الخطوة التالية</h2><p>واجهة محادثة جاهزة للربط بمزوّد AI لاحقًا، وتعمل الآن بردود تجريبية محلية.</p></div></div><AssistantConversation expanded /></div>;
}
