import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Sparkles, Plus, ChevronRight, Loader2,
  MapPin, Building2, Clock, Star, Zap, Trash2,
} from "lucide-react";
import { jobsApi, agentApi } from "@/lib/api";
import { JobAnalysisResult, JobDescription } from "@/types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/LoadingSpinner";

function SkillPill({ skill, variant = "required" }: { skill: string; variant?: "required" | "preferred" }) {
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium mr-1.5 mb-1.5 ${
      variant === "required"
        ? "bg-blue-100 text-blue-800 border border-blue-200"
        : "bg-slate-100 text-slate-700 border border-slate-200"
    }`}>
      {skill}
    </span>
  );
}

function AnalysisResult({ result }: { result: JobAnalysisResult }) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">Role</p>
            <p className="font-semibold text-sm">{result.role}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 font-medium mb-1">Seniority</p>
            <p className="font-semibold text-sm">{result.seniority}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 font-medium mb-1">Experience</p>
            <p className="font-semibold text-sm">{result.years_experience ? `${result.years_experience}+ years` : "Not specified"}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 font-medium mb-1">Location</p>
            <p className="font-semibold text-sm">{result.location || "Remote / Not specified"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Required Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {result.required_skills.map((s) => <SkillPill key={s} skill={s} variant="required" />)}
          {result.required_skills.length === 0 && <p className="text-sm text-muted-foreground">None extracted</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Nice-to-Have Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {result.preferred_skills.map((s) => <SkillPill key={s} skill={s} variant="preferred" />)}
          {result.preferred_skills.length === 0 && <p className="text-sm text-muted-foreground">None extracted</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {result.keywords.map((k) => (
              <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.industry && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="w-4 h-4" />
          Industry: <span className="font-medium text-foreground">{result.industry}</span>
        </div>
      )}
    </div>
  );
}

function WorkflowResults({ data }: { data: any }) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{data.candidates_found}</p>
            <p className="text-xs text-blue-600 mt-1">Candidates Found</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{data.evaluations?.length ?? 0}</p>
            <p className="text-xs text-green-600 mt-1">Evaluated</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">{data.duration_seconds?.toFixed(1)}s</p>
            <p className="text-xs text-purple-600 mt-1">Runtime</p>
          </CardContent>
        </Card>
      </div>

      {data.top_candidate && (
        <Card className="border-2 border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Top Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{data.top_candidate.candidate_name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{data.top_candidate.recommendation}</p>
              </div>
              <div className="text-3xl font-bold text-green-600">{data.top_candidate.score}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                {data.top_candidate.strengths.map((s: string) => (
                  <p key={s} className="text-xs text-green-800 flex items-start gap-1">
                    <span className="text-green-500 mt-0.5">✓</span> {s}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">Areas to Explore</p>
                {data.top_candidate.weaknesses.map((w: string) => (
                  <p key={w} className="text-xs text-amber-800 flex items-start gap-1">
                    <span className="text-amber-500 mt-0.5">!</span> {w}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">All Evaluations</h3>
        {data.evaluations?.map((e: any) => (
          <Card key={e.candidate_id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{e.candidate_name}</p>
                  <p className="text-xs text-muted-foreground">{e.recommendation}</p>
                </div>
                <div className={`text-2xl font-bold ${e.score >= 80 ? "text-green-600" : e.score >= 60 ? "text-amber-600" : "text-red-500"}`}>
                  {e.score}
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-secondary rounded-full">
                <div
                  className={`h-full rounded-full ${e.score >= 80 ? "bg-green-500" : e.score >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                  style={{ width: `${e.score}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function JobAnalyzer() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [jdTitle, setJdTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [analysisResult, setAnalysisResult] = useState<JobAnalysisResult | null>(null);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: jobsApi.list,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => jobsApi.analyze(jdText),
    onSuccess: (data) => setAnalysisResult(data),
    onError: () => toast({ title: "Error", description: "Analysis failed", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: () => jobsApi.create({ title: jdTitle, raw_text: jdText, company_name: jdCompany }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Saved", description: "Job description saved and analyzed.", variant: "success" as any });
    },
  });

  const workflowMutation = useMutation({
    mutationFn: (jdId?: string) =>
      agentApi.runWorkflow({
        job_description_id: jdId,
        job_description_text: jdId ? undefined : jdText,
        top_k: 10,
      }),
    onSuccess: (data) => setWorkflowResult(data),
    onError: () => toast({ title: "Workflow failed", description: "Agent workflow error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast({ title: "Deleted" }); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Job Analyzer</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Paste a job description — AI extracts requirements and finds matching candidates.
        </p>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze">Analyze JD</TabsTrigger>
          <TabsTrigger value="workflow">Run AI Workflow</TabsTrigger>
          <TabsTrigger value="saved">Saved JDs ({jobs?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Job Title</label>
                <Input value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} placeholder="Senior Backend Engineer" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company</label>
                <Input value={jdCompany} onChange={(e) => setJdCompany(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Job Description *</label>
                <Textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={16}
                  className="font-mono text-xs resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={!jdText || analyzeMutation.isPending}
                  className="gap-2"
                >
                  {analyzeMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    : <><Sparkles className="w-4 h-4" /> Analyze with AI</>
                  }
                </Button>
                {analysisResult && jdTitle && (
                  <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save JD
                  </Button>
                )}
              </div>
            </div>

            <div>
              {analyzeMutation.isPending && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Sparkles className="w-10 h-10 text-blue-500 mx-auto animate-pulse" />
                    <p className="text-sm text-muted-foreground mt-3">AI is analyzing requirements...</p>
                  </div>
                </div>
              )}
              {analysisResult && !analyzeMutation.isPending && (
                <AnalysisResult result={analysisResult} />
              )}
              {!analysisResult && !analyzeMutation.isPending && (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-xl">
                  <div className="text-center px-6">
                    <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Paste a JD and click Analyze</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI will extract role, skills, seniority, location and more
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" /> 4-Agent AI Workflow
                  </h3>
                  <div className="space-y-2">
                    {["1. Requirement Analysis Agent", "2. Candidate Search Agent", "3. Evaluation Agent (0–100 scoring)", "4. Outreach Generation Agent"].map((step) => (
                      <p key={step} className="text-xs flex items-center gap-2 text-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        {step}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Job Description</label>
                <Textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste JD or use a saved one..."
                  rows={12}
                  className="text-xs font-mono resize-none"
                />
              </div>
              <Button
                onClick={() => workflowMutation.mutate(undefined)}
                disabled={!jdText || workflowMutation.isPending}
                className="w-full gap-2"
              >
                {workflowMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Running workflow...</>
                  : <><Zap className="w-4 h-4" /> Run AI Workflow</>
                }
              </Button>
            </div>

            <div>
              {workflowMutation.isPending && (
                <div className="flex items-center justify-center h-72">
                  <div className="text-center">
                    <Zap className="w-10 h-10 text-blue-500 mx-auto animate-pulse" />
                    <p className="text-sm font-medium mt-3">Agents are working...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take 15–30 seconds</p>
                  </div>
                </div>
              )}
              {workflowResult && !workflowMutation.isPending && <WorkflowResults data={workflowResult} />}
            </div>
          </div>
        </TabsContent>

        {/* Saved Tab */}
        <TabsContent value="saved" className="mt-5">
          {jobsLoading ? (
            <PageLoader />
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job: JobDescription) => (
                <Card key={job.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{job.title}</h3>
                          {job.seniority && <Badge variant="secondary" className="text-xs">{job.seniority}</Badge>}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {job.company_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company_name}</span>}
                          {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                          {job.years_experience && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.years_experience}+ years</span>}
                        </div>
                        {job.required_skills && job.required_skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {job.required_skills.slice(0, 6).map((s) => (
                              <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">Saved {formatDate(job.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => workflowMutation.mutate(job.id)}
                          disabled={workflowMutation.isPending}
                          className="gap-1.5 text-xs"
                        >
                          <Zap className="w-3.5 h-3.5" /> Run Workflow
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => deleteMutation.mutate(job.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Briefcase} title="No saved job descriptions" description="Analyze a JD and save it for future use." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
