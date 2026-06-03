import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Building2, Briefcase, Mail, Phone,
  Linkedin, Github, Clock, Edit2, Save, X, Send, Loader2,
  ExternalLink, Star, FileText, Tag,
} from "lucide-react";
import { candidatesApi, outreachApi, jobsApi } from "@/lib/api";
import { Candidate } from "@/types";
import { cn, getInitials, formatDate, getScoreBg } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/common/LoadingSpinner";

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Candidate>>({});
  const [outreachType, setOutreachType] = useState("email");
  const [jdText, setJdText] = useState("");
  const [generatedOutreach, setGeneratedOutreach] = useState<any>(null);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => candidatesApi.get(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Candidate>) => candidatesApi.update(id!, data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", id] });
      setIsEditing(false);
      toast({ title: "Saved", description: "Candidate profile updated.", variant: "success" as any });
    },
  });

  const outreachMutation = useMutation({
    mutationFn: () =>
      outreachApi.generate({
        candidate_id: id!,
        job_description_text: jdText || undefined,
        outreach_type: outreachType,
      }),
    onSuccess: (data) => setGeneratedOutreach(data),
    onError: () => toast({ title: "Error", description: "Failed to generate outreach", variant: "destructive" }),
  });

  if (isLoading || !candidate) return <PageLoader text="Loading candidate..." />;

  const startEdit = () => {
    setEditData({
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      current_company: candidate.current_company,
      current_title: candidate.current_title,
      years_experience: candidate.years_experience,
      skills: candidate.skills,
      linkedin_url: candidate.linkedin_url,
      github_url: candidate.github_url,
      candidate_summary: candidate.candidate_summary,
      status: candidate.status,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    const payload: any = { ...editData };
    if (typeof payload.skills === "string") {
      payload.skills = payload.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    updateMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/candidates")} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Candidates
        </Button>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="gap-1">
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} className="gap-1">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit} className="gap-1">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xl font-bold flex-shrink-0">
              {getInitials(candidate.full_name)}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input value={editData.full_name || ""} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} placeholder="Full Name" className="font-semibold" />
                  <Select value={editData.status || "active"} onValueChange={(v) => setEditData({ ...editData, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["active", "inactive", "interview", "hired", "rejected"].map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={editData.current_title || ""} onChange={(e) => setEditData({ ...editData, current_title: e.target.value })} placeholder="Current Title" />
                  <Input value={editData.current_company || ""} onChange={(e) => setEditData({ ...editData, current_company: e.target.value })} placeholder="Current Company" />
                  <Input value={editData.location || ""} onChange={(e) => setEditData({ ...editData, location: e.target.value })} placeholder="Location" />
                  <Input value={editData.years_experience?.toString() || ""} onChange={(e) => setEditData({ ...editData, years_experience: Number(e.target.value) })} type="number" placeholder="Years Experience" />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold">{candidate.full_name}</h1>
                    <Badge variant={candidate.status === "active" ? "success" as any : candidate.status === "hired" ? "default" : "secondary"} className="mt-1">
                      {candidate.status}
                    </Badge>
                  </div>
                  {(candidate.current_title || candidate.current_company) && (
                    <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      {[candidate.current_title, candidate.current_company].filter(Boolean).join(" at ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    {candidate.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.location}</span>
                    )}
                    {candidate.years_experience && (
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{candidate.years_experience}y experience</span>
                    )}
                    {candidate.email && (
                      <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="w-3.5 h-3.5" />{candidate.email}
                      </a>
                    )}
                    {candidate.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{candidate.phone}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {candidate.linkedin_url && (
                      <a href={candidate.linkedin_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 h-8">
                          <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                        </Button>
                      </a>
                    )}
                    {candidate.github_url && (
                      <a href={candidate.github_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 h-8">
                          <Github className="w-3.5 h-3.5" /> GitHub
                        </Button>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Added {formatDate(candidate.created_at)}</p>
              {candidate.source && <p className="mt-0.5 capitalize">via {candidate.source}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4" /> Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  value={Array.isArray(editData.skills) ? editData.skills.join(", ") : editData.skills || ""}
                  onChange={(e) => setEditData({ ...editData, skills: e.target.value as any })}
                  placeholder="Python, FastAPI, Docker, ..."
                />
              ) : candidate.skills && candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
{candidate.skills.map((s: string) => (
                     <span key={s} className="inline-block text-sm bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-medium">
                       {s}
                     </span>
                   ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editData.candidate_summary || ""}
                  onChange={(e) => setEditData({ ...editData, candidate_summary: e.target.value })}
                  rows={4}
                  placeholder="Candidate summary..."
                />
              ) : candidate.candidate_summary ? (
                <p className="text-sm leading-relaxed">{candidate.candidate_summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No summary available</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {candidate.tags && candidate.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Tag className="w-4 h-4" /> Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
{candidate.tags.map((t: string) => (
                     <Badge key={t} variant="outline">{t}</Badge>
                   ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resume Tab */}
        <TabsContent value="resume" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resume Text</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.resume_text ? (
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg overflow-auto max-h-[600px] border">
                  {candidate.resume_text}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No resume text available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4" /> Generate Outreach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Outreach Type</label>
                  <Select value={outreachType} onValueChange={setOutreachType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Cold Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Job Description (optional)</label>
                <Textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description to personalize the outreach..."
                  rows={4}
                />
              </div>
              <Button
                onClick={() => outreachMutation.mutate()}
                disabled={outreachMutation.isPending}
                className="gap-2"
              >
                {outreachMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  : <><Send className="w-4 h-4" /> Generate Message</>
                }
              </Button>

              {generatedOutreach && (
                <div className="mt-4 space-y-3">
                  {generatedOutreach.subject && (
                    <div className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">SUBJECT</p>
                      <p className="text-sm font-medium">{generatedOutreach.subject}</p>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Message</p>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => navigator.clipboard.writeText(generatedOutreach.message)}
                        className="h-7 text-xs"
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedOutreach.message}</p>
                  </div>
                  <p className="text-xs text-muted-foreground italic">{generatedOutreach.personalization_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
