import { useState, useRef, useEffect } from "react";
import { AIChatBox, Message } from "./AIChatBox";
import { Button } from "./ui/button";
import { Sparkles, X, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "You are a helpful assistant for the Boarding House Complaint Management System. You help tenants describe their issues accurately, provide advice on how to handle living situations, and guide them through the complaint process. Keep your responses concise and professional."
    }
  ]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data: string) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data }]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` }
      ]);
    }
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    chatMutation.mutate({ messages: newMessages });
  };

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {/* Chat Window */}
      <div
        className={cn(
          "w-[350px] md:w-[400px] transition-all duration-300 transform origin-bottom-right shadow-2xl border bg-card rounded-2xl overflow-hidden pointer-events-auto",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10"
        )}
      >
        <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5" />
            <h3 className="font-semibold tracking-tight">AI Complaint Assistant</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <AIChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={chatMutation.isPending}
          height="450px"
          className="border-0 shadow-none rounded-none"
          placeholder="Ask me anything..."
          emptyStateMessage="How can I help you today?"
          suggestedPrompts={[
            "How do I report a leak?",
            "What happens after I file a complaint?",
            "Tips for noisy neighbors"
          ]}
        />
      </div>

      {/* Floating Button */}
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-xl hover:scale-110 transition-all p-0 flex items-center justify-center relative group pointer-events-auto",
          isOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary"
        )}
      >
        {isOpen ? (
          <X className="size-6 animate-in fade-in zoom-in duration-200" />
        ) : (
          <>
            <MessageSquare className="size-6 animate-in fade-in zoom-in duration-200 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground/30 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-foreground/20 text-[10px] items-center justify-center font-bold">!</span>
            </span>
          </>
        )}
      </Button>
    </div>
  );
}
