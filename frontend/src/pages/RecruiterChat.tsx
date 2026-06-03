import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Send, Loader2, Zap, Users, Mail,
  Search, FileText, BarChart3, Plus, Sparkles,
} from "lucide-react";
import { copilotApi, sqlApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  data?: Record<string, any>;
}

const INTENTS: Record<string, { icon: any; label: string; color: string }> = {
  search_candidates: { icon: Search, label: "Search", color: "bg-blue-100 text-blue-700" },
  generate_outreach: { icon: Mail, label: "Outreach", color: "bg-green-100 text-green-700" },
  rank: { icon: BarChart3, label: "Ranking", color: "bg-purple-100 text-purple-700" },
  summarize: { icon: FileText, label: "Summary", color: "bg-amber-100 text-amber-700" },
  answer: { icon: Sparkles, label: "Answer", color: "bg-slate-100 text-slate-700" },
};

const SUGGESTIONS = [
  { icon: Search, text: "Find senior AI engineers with LangChain experience in Singapore", category: "search" },
  { icon: Mail, text: "Generate a LinkedIn outreach message for a VP Engineering role", category: "outreach" },
  { icon: Users, text: "Rank candidates for a backend engineer position", category: "rank" },
  { icon: Zap, text: "What is the best way to evaluate executive candidates?", category: "answer" },
  { icon: FileText, text: "Show me candidates added in the last 30 days", category: "sql" },
  { icon: BarChart3, text: "Which skills are most common in our candidate pool?", category: "sql" },
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const intentInfo = message.intent ? INTENTS[message.intent] : null;

  return (
    <div className={cn("flex gap-3 mb-5", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
        isUser ? "bg-primary text-white" : "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
      )}>
        {isUser ? "You" : <Zap className="w-4 h-4" />}
      </div>

      <div className={cn("flex-1 max-w-[78%]", isUser ? "flex flex-col items-end" : "flex flex-col items-start")}>
        {intentInfo && !isUser && (
          <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-1.5", intentInfo.color)}>
            <intentInfo.icon className="w-3 h-3" />
            {intentInfo.label} mode
          </div>
        )}
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-white border shadow-sm rounded-tl-sm"
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Search results preview */}
        {message.data?.results && Array.isArray(message.data.results) && message.data.results.length > 0 && (
          <div className="mt-2 w-full space-y-1.5">
            {(message.data.results as any[]).map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold text-blue-900">{r.name}</span>
                  {r.title && <span className="text-blue-600 ml-1.5">• {r.title}</span>}
                  {r.company && <span className="text-blue-500 ml-1.5">@ {r.company}</span>}
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-200 text-xs">
                  {Math.round((r.score ?? 0) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SqlMode({ onResult }: { onResult: (res: any) => void }) {
  const [question, setQuestion] = useState("");

  const mutation = useMutation({
    mutationFn: () => sqlApi.query(question),
    onSuccess: onResult,
  });

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Natural Language → SQL
        </p>
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='e.g. "Show candidates with 5+ years experience"'
            rows={2}
            className="resize-none text-sm bg-white"
          />
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!question.trim() || mutation.isPending}
            className="flex-shrink-0 gap-1"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run"}
          </Button>
        </div>
        {mutation.data && (
          <div className="bg-white rounded-lg border p-3">
            <p className="text-xs font-mono text-slate-500 mb-2">{mutation.data.generated_sql}</p>
            <p className="text-xs text-muted-foreground mb-2">{mutation.data.explanation}</p>
            {mutation.data.results?.length > 0 && (
              <div className="overflow-auto max-h-40">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      {mutation.data.columns.map((c: string) => (
                        <th key={c} className="text-left px-2 py-1 border text-muted-foreground font-medium">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mutation.data.results.slice(0, 10).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {mutation.data.columns.map((c: string) => (
                          <td key={c} className="px-2 py-1 border">{String(row[c] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecruiterChat() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI Recruiter Copilot. I can help you:\n\n• 🔍 Find and search candidates\n• 📊 Rank and evaluate candidates\n• ✉️ Generate personalized outreach\n• 💬 Answer recruitment questions\n• 🗄️ Query the database with natural language\n\nWhat can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [showSql, setShowSql] = useState(false);

  const chatMutation = useMutation({
    mutationFn: (msg: string) => copilotApi.chat(msg, sessionId),
    onSuccess: (res) => {
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.response,
          intent: res.intent,
          data: res.data,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "I encountered an error. Please try again.",
      }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg }]);
    setInput("");
    chatMutation.mutate(msg);
  };

  const newChat = () => {
    setMessages([{
      id: "welcome-new",
      role: "assistant",
      content: "Starting a new session. How can I help you today?",
    }]);
    setSessionId(undefined);
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Sidebar */}
      <div className="w-56 flex flex-col gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Copilot
          </h1>
          <p className="text-xs text-muted-foreground">AI recruitment assistant</p>
        </div>

        <Button size="sm" variant="outline" onClick={newChat} className="gap-2 justify-start">
          <Plus className="w-4 h-4" /> New Chat
        </Button>

        <Button
          size="sm"
          variant={showSql ? "default" : "outline"}
          onClick={() => setShowSql(!showSql)}
          className="gap-2 justify-start"
        >
          <BarChart3 className="w-4 h-4" /> SQL Query
        </Button>

        <div className="mt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Capabilities
          </p>
          <div className="space-y-1.5">
            {[
              { icon: Search, label: "Semantic Search" },
              { icon: Users, label: "Candidate Ranking" },
              { icon: Mail, label: "Outreach Generator" },
              { icon: FileText, label: "Profile Summary" },
              { icon: Zap, label: "Agent Workflow" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-white">AI Recruiter Copilot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200">Powered by Groq + LangGraph</span>
          </div>
        </div>

        {/* SQL panel */}
        {showSql && (
          <div className="border-b p-4">
            <SqlMode onResult={(res) => {
              setMessages((prev) => [...prev, {
                id: `sql-${Date.now()}`,
                role: "assistant",
                content: `SQL Query Results: ${res.explanation}\n\nGenerated SQL:\n${res.generated_sql}\n\n${res.row_count} row(s) returned.`,
                data: { sql_results: res.results },
              }]);
            }} />
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </ScrollArea>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  className="text-xs bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-3 py-1.5 rounded-full border hover:border-blue-200 transition-colors flex items-center gap-1.5"
                  onClick={() => sendMessage(s.text)}
                >
                  <s.icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t bg-slate-50/50">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Ask anything about recruitment, candidates, outreach..."
              className="resize-none min-h-[44px] max-h-36 text-sm bg-white"
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || chatMutation.isPending}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              {chatMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
