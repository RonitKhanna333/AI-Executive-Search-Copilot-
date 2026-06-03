import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Search, Plus, Upload, Users, ChevronRight,
  MapPin, Briefcase, Star, Filter, X, Download, Loader2,
} from "lucide-react";
import { candidatesApi } from "@/lib/api";
import { Candidate } from "@/types";
import { cn, getInitials, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/LoadingSpinner";

const STATUS_COLORS: Record<string, string> = {
  active: "success",
  inactive: "secondary",
  interview: "warning",
  hired: "default",
  rejected: "destructive",
};

function CandidateCard({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) {
  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer hover:border-blue-200 group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm flex-shrink-0">
            {getInitials(candidate.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-snug group-hover:text-blue-600 transition-colors">
                {candidate.full_name}
              </h3>
              <Badge variant={(STATUS_COLORS[candidate.status] as any) || "secondary"} className="flex-shrink-0 text-xs">
                {candidate.status}
              </Badge>
            </div>
            {(candidate.current_title || candidate.current_company) && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Briefcase className="w-3 h-3 flex-shrink-0" />
                {[candidate.current_title, candidate.current_company].filter(Boolean).join(" at ")}
              </p>
            )}
            {candidate.location && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {candidate.location}
              </p>
            )}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {candidate.skills.slice(0, 4).map((s) => (
                  <span key={s} className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
                {candidate.skills.length > 4 && (
                  <span className="text-xs text-muted-foreground">+{candidate.skills.length - 4}</span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Added {formatRelativeTime(candidate.created_at)}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

function SemanticSearchResult({ result, onClick }: { result: any; onClick: () => void }) {
  const pct = Math.round(result.similarity_score * 100);
  return (
    <Card className="hover:shadow-md cursor-pointer transition-all group" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white font-bold text-sm flex-shrink-0">
            {getInitials(result.candidate.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm group-hover:text-blue-600">{result.candidate.full_name}</h3>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className={cn("text-xs font-bold",
                  pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500"
                )}>
                  {pct}% match
                </span>
              </div>
            </div>
            {(result.candidate.current_title || result.candidate.current_company) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[result.candidate.current_title, result.candidate.current_company].filter(Boolean).join(" at ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 italic">{result.explanation}</p>
            {result.candidate.skills?.slice(0, 5).map((s: string) => (
              <span key={s} className="inline-block mr-1 mt-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Candidates() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [semanticQuery, setSemanticQuery] = useState(searchParams.get("q") || "");
  const [activeQuery, setActiveQuery] = useState(searchParams.get("q") || "");
  const [isSearchMode, setIsSearchMode] = useState(!!searchParams.get("q"));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "", email: "", phone: "", location: "",
    current_company: "", current_title: "", years_experience: "",
    skills: "", linkedin_url: "", candidate_summary: "",
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["candidates", page, statusFilter],
    queryFn: () => candidatesApi.list({
      page,
      page_size: 20,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }),
    enabled: !isSearchMode,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["candidates-search", activeQuery],
    queryFn: () => candidatesApi.search(activeQuery, 20),
    enabled: isSearchMode && !!activeQuery,
  });

  const createMutation = useMutation({
    mutationFn: candidatesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setShowAddDialog(false);
      setNewCandidate({
        full_name: "", email: "", phone: "", location: "",
        current_company: "", current_title: "", years_experience: "",
        skills: "", linkedin_url: "", candidate_summary: "",
      });
      toast({ title: "Candidate added", description: "Profile created successfully.", variant: "success" as any });
    },
    onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.detail || "Failed to add", variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => candidatesApi.uploadResume(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setShowUploadDialog(false);
      toast({ title: "Resume parsed", description: "Candidate profile created from resume.", variant: "success" as any });
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e?.response?.data?.detail || "Error", variant: "destructive" }),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
    onDrop: (files) => { if (files[0]) uploadMutation.mutate(files[0]); },
  });

  const handleSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) {
      setIsSearchMode(false);
      return;
    }
    setActiveQuery(semanticQuery);
    setIsSearchMode(true);
  };

  const clearSearch = () => {
    setSemanticQuery("");
    setActiveQuery("");
    setIsSearchMode(false);
  };

  const handleAddSubmit = () => {
    if (!newCandidate.full_name) return;
    createMutation.mutate({
      ...newCandidate,
      years_experience: newCandidate.years_experience ? Number(newCandidate.years_experience) : null,
      skills: newCandidate.skills ? newCandidate.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
  };

  const isLoading = isSearchMode ? searchLoading : listLoading;
  const total = listData?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isSearchMode ? `Semantic search results` : `${total} candidates in database`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Resume
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Candidate
          </Button>
        </div>
      </div>

      {/* Semantic Search bar */}
      <div className="space-y-2">
        <form onSubmit={handleSemanticSearch}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10 pr-10 h-11 bg-white text-sm"
              placeholder='AI semantic search — e.g. "Senior Python engineers with RAG experience in Singapore"'
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
            />
            {semanticQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        {!isSearchMode && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1.5 flex-wrap">
              {["all", "active", "interview", "hired", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors capitalize",
                    statusFilter === s
                      ? "bg-primary text-white border-primary"
                      : "border-input hover:bg-accent"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isSearchMode ? (
        searchResults && searchResults.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Found <strong>{searchResults.length}</strong> candidates matching "{activeQuery}"
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {searchResults.map((r: any) => (
                <SemanticSearchResult key={r.candidate.id} result={r} onClick={() => navigate(`/candidates/${r.candidate.id}`)} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={Search} title="No results found" description={`No candidates matched "${activeQuery}". Try a different search.`} />
        )
      ) : listData?.items && listData.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listData.items.map((c: Candidate) => (
              <CandidateCard key={c.id} candidate={c} onClick={() => navigate(`/candidates/${c.id}`)} />
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description="Add candidates manually, upload resumes, or import a CSV file."
          action={
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add First Candidate
            </Button>
          }
        />
      )}

      {/* Add Candidate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>Fill in the candidate's profile information.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
              <Input value={newCandidate.full_name} onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input value={newCandidate.email} onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })} type="email" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input value={newCandidate.phone} onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })} placeholder="+1 555-0100" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Current Title</label>
              <Input value={newCandidate.current_title} onChange={(e) => setNewCandidate({ ...newCandidate, current_title: e.target.value })} placeholder="Senior Engineer" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Current Company</label>
              <Input value={newCandidate.current_company} onChange={(e) => setNewCandidate({ ...newCandidate, current_company: e.target.value })} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input value={newCandidate.location} onChange={(e) => setNewCandidate({ ...newCandidate, location: e.target.value })} placeholder="Singapore" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Years Experience</label>
              <Input value={newCandidate.years_experience} onChange={(e) => setNewCandidate({ ...newCandidate, years_experience: e.target.value })} type="number" min="0" placeholder="8" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Skills (comma-separated)</label>
              <Input value={newCandidate.skills} onChange={(e) => setNewCandidate({ ...newCandidate, skills: e.target.value })} placeholder="Python, FastAPI, PostgreSQL, Docker" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">LinkedIn URL</label>
              <Input value={newCandidate.linkedin_url} onChange={(e) => setNewCandidate({ ...newCandidate, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/janesmith" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Summary</label>
              <Textarea value={newCandidate.candidate_summary} onChange={(e) => setNewCandidate({ ...newCandidate, candidate_summary: e.target.value })} placeholder="Brief candidate summary..." rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={!newCandidate.full_name || createMutation.isPending}>
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Candidate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Resume Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
            <DialogDescription>Upload a PDF or DOCX resume. AI will auto-parse the candidate profile.</DialogDescription>
          </DialogHeader>
          <div
            {...getRootProps()}
            className={cn(
              "mt-2 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Parsing resume...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drop resume here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOCX</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
