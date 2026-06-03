import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  Brain, Upload, Send, FileText, Trash2, Loader2,
  ChevronDown, ExternalLink, Plus, X, Sparkles,
} from "lucide-react";
import { companyBrainApi } from "@/lib/api";
import { Document, CompanyBrainChatResponse } from "@/types";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/common/EmptyState";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄", docx: "📝", txt: "📃", md: "📋",
};

function DocumentCard({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/40 transition-colors group">
      <div className="text-2xl flex-shrink-0">{FILE_TYPE_ICONS[doc.file_type] || "📄"}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant={doc.status === "indexed" ? "success" as any : doc.status === "processing" ? "warning" as any : "destructive"}
            className="text-xs h-4"
          >
            {doc.status}
          </Badge>
          {doc.chunk_count > 0 && <span className="text-xs text-muted-foreground">{doc.chunk_count} chunks</span>}
          {doc.file_size && <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(doc.created_at)}</p>
      </div>
      <Button
        variant="ghost" size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
        isUser ? "bg-primary text-white" : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
      )}>
        {isUser ? "You" : <Brain className="w-4 h-4" />}
      </div>
      <div className={cn("flex-1 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-white border shadow-sm rounded-tl-sm"
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.sources && message.sources.length > 0 && !isUser && (
          <div className="mt-1.5">
            <button
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
              onClick={() => setShowSources(!showSources)}
            >
              <ExternalLink className="w-3 h-3" />
              {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
              <ChevronDown className={cn("w-3 h-3 transition-transform", showSources && "rotate-180")} />
            </button>
            {showSources && (
              <div className="mt-1.5 space-y-1.5">
                {message.sources.map((src: any, i: number) => (
                  <div key={i} className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                    <p className="font-medium text-blue-800">{src.document_title}</p>
                    <p className="text-blue-700 mt-0.5 italic">"{src.chunk_content}"</p>
                    <p className="text-blue-500 mt-1">{Math.round(src.relevance_score * 100)}% relevant</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompanyBrain() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm the Company Brain AI. I can answer questions about your company's documents, SOPs, and internal knowledge. Upload documents to get started, then ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [category, setCategory] = useState("");

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: companyBrainApi.listDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, cat }: { file: File; cat: string }) =>
      companyBrainApi.upload(file, cat || undefined),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Document uploaded",
        description: `"${doc.title}" is being indexed...`,
        variant: "success" as any,
      });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => companyBrainApi.chat(msg, sessionId),
    onSuccess: (res: CompanyBrainChatResponse) => {
      setSessionId(res.session_id);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: res.answer,
        sources: res.sources,
      }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm sorry, I couldn't process that. Please check if documents are indexed.",
      }]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: companyBrainApi.deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    onDrop: (files) => {
      files.forEach((file) => uploadMutation.mutate({ file, cat: category }));
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    chatMutation.mutate(text);
  };

  const exampleQuestions = [
    "What is our executive search process?",
    "What are the hiring criteria for VP roles?",
    "Summarize our onboarding SOP",
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Left: Documents Panel */}
      <div className="w-80 flex flex-col flex-shrink-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" /> Company Brain
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Upload documents and chat with your knowledge base</p>
        </div>

        {/* Upload */}
        <div className="mb-3">
          <Input
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-2 h-8 text-xs"
          />
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-1.5">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Processing...</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs font-medium">Drop files here</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD</p>
              </>
            )}
          </div>
        </div>

        {/* Documents list */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Indexed Documents ({documents?.length ?? 0})
            </p>
          </div>
          <ScrollArea className="h-full">
            {docsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-1 pr-2">
                {documents.map((doc: Document) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onDelete={() => deleteMutation.mutate(doc.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No documents yet</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Chat header */}
        <div className="px-5 py-3.5 border-b bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-3">
          <Brain className="w-5 h-5 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">Company Brain</p>
            <p className="text-xs text-blue-100">
              {documents?.length ?? 0} documents indexed • RAG-powered
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-5">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </ScrollArea>

        {/* Example questions */}
        {messages.length === 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {exampleQuestions.map((q) => (
              <button
                key={q}
                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-100"
                onClick={() => setInput(q)}
              >
                {q}
              </button>
            ))}
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
              placeholder="Ask about your company documents..."
              className="resize-none min-h-[44px] max-h-32 text-sm bg-white"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || chatMutation.isPending}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
