import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Users, Clock, Target, Zap, Brain,
  BarChart3, Activity,
} from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/common/LoadingSpinner";
import StatCard from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border shadow-lg rounded-lg px-3 py-2 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-xs">
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: dashboardApi.getMetrics,
    refetchInterval: 120_000,
  });

  if (isLoading || !metrics) return <PageLoader text="Loading analytics..." />;

  const { recruitment, ai, business, candidates_by_status, candidates_over_time, top_skills } = metrics;

  // Build funnel data
  const funnelData = [
    { stage: "Total", count: recruitment.total_candidates },
    { stage: "Active", count: recruitment.active_candidates },
    { stage: "Interview", count: recruitment.interviews_scheduled },
    { stage: "Hired", count: recruitment.hires_completed },
  ];

  // KPI radar data
  const radarData = [
    { subject: "Response Rate", value: business.response_rate, full: 100 },
    { subject: "Conversion", value: business.interview_conversion_rate, full: 100 },
    { subject: "Fill Speed", value: Math.max(0, 100 - business.time_to_fill_days), full: 100 },
    { subject: "AI Adoption", value: Math.min(100, ai.ai_searches_executed * 5), full: 100 },
    { subject: "Docs Indexed", value: Math.min(100, ai.documents_indexed * 10), full: 100 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Comprehensive recruitment intelligence and AI performance metrics
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Activity className="w-3 h-3 text-green-500" /> Live data
        </Badge>
      </div>

      <Tabs defaultValue="recruitment">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recruitment" className="gap-2">
            <Users className="w-4 h-4" /> Recruitment
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Zap className="w-4 h-4" /> AI Performance
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Business KPIs
          </TabsTrigger>
        </TabsList>

        {/* Recruitment Tab */}
        <TabsContent value="recruitment" className="mt-5 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Candidates" value={recruitment.total_candidates.toLocaleString()} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <StatCard title="Active Pipeline" value={recruitment.active_candidates.toLocaleString()} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
            <StatCard title="Interviews" value={recruitment.interviews_scheduled} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" />
            <StatCard title="Hired" value={recruitment.hires_completed} icon={Target} iconColor="text-purple-600" iconBg="bg-purple-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidates over time (area) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Candidate Acquisition Trend</CardTitle>
                <CardDescription>New candidates added per month (last 12 months)</CardDescription>
              </CardHeader>
              <CardContent>
                {candidates_over_time.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={candidates_over_time}>
                      <defs>
                        <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CUSTOM_TOOLTIP />} />
                      <Area type="monotone" dataKey="value" name="Candidates" stroke="#3b82f6" fill="url(#colorCand)" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    No data yet — add candidates to see trends
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pipeline funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recruitment Funnel</CardTitle>
                <CardDescription>Candidates at each stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
{funnelData.map((item: { stage: string; count: number }, i: number) => {
                     const pct = funnelData[0].count > 0 ? (item.count / funnelData[0].count) * 100 : 0;
                     return (
                       <div key={item.stage}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{item.stage}</span>
                          <span className="text-muted-foreground">{item.count}</span>
                        </div>
                        <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2 text-xs text-white font-medium transition-all"
                            style={{ width: `${Math.max(pct, 5)}%`, background: COLORS[i] }}
                          >
                            {pct > 15 && `${Math.round(pct)}%`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status distribution + Top skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {candidates_by_status.length > 0 ? (
                  <div className="flex gap-6">
                    <ResponsiveContainer width="60%" height={180}>
                      <PieChart>
<Pie data={candidates_by_status} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="label">
                          {candidates_by_status.map((_it: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2 my-auto">
{candidates_by_status.map((it: { label: string; value: number }, i: number) => (
                         <div key={it.label} className="flex items-center gap-2 text-sm">
                           <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                           <span className="capitalize flex-1">{it.label}</span>
                           <span className="font-semibold">{it.value}</span>
                         </div>
                       ))}
                     </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No status data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {top_skills.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={top_skills.slice(0, 8)} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CUSTOM_TOOLTIP />} />
                      <Bar dataKey="value" name="Candidates" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No skills data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Performance Tab */}
        <TabsContent value="ai" className="mt-5 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="AI Searches" value={ai.ai_searches_executed} icon={Zap} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <StatCard title="Outreach Generated" value={ai.outreach_generated} icon={Target} iconColor="text-green-600" iconBg="bg-green-50" />
            <StatCard title="Documents Indexed" value={ai.documents_indexed} icon={Brain} iconColor="text-purple-600" iconBg="bg-purple-50" />
            <StatCard title="Agent Runs Total" value={ai.agent_runs_total} icon={Activity} iconColor="text-amber-600" iconBg="bg-amber-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Activity Breakdown</CardTitle>
                <CardDescription>Types of AI operations performed</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: "Searches", value: ai.ai_searches_executed },
                    { name: "Outreach", value: ai.outreach_generated },
                    { name: "Docs", value: ai.documents_indexed },
                    { name: "Agent Runs", value: ai.agent_runs_total },
                  ]} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                      {[0, 1, 2, 3].map((i: number) => <Cell key={i} fill={COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Impact Metrics</CardTitle>
                <CardDescription>Estimated time saved by AI automation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {[
                    { label: "Resume screening time saved", value: `${ai.ai_searches_executed * 20} min`, color: "bg-blue-500" },
                    { label: "Outreach drafting saved", value: `${ai.outreach_generated * 15} min`, color: "bg-green-500" },
                    { label: "Manual search saved", value: `${ai.agent_runs_total * 45} min`, color: "bg-purple-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="font-bold text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business KPIs Tab */}
        <TabsContent value="business" className="mt-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: "Response Rate", value: `${business.response_rate}%`, target: 40, color: "#3b82f6", desc: "of outreach messages get a reply" },
              { label: "Interview Conversion", value: `${business.interview_conversion_rate}%`, target: 35, color: "#10b981", desc: "of candidates reach interview stage" },
              { label: "Time to Fill", value: `${business.time_to_fill_days}d`, target: 45, color: "#f59e0b", desc: "average days to fill a position", isTime: true },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-4xl font-bold mt-2 mb-4" style={{ color: kpi.color }}>{kpi.value}</p>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: kpi.isTime
                          ? `${Math.min(100, (kpi.target / business.time_to_fill_days) * 100)}%`
                          : `${Math.min(100, parseFloat(kpi.value))}%`,
                        background: kpi.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Radar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recruitment Health Score</CardTitle>
              <CardDescription>Multi-dimensional performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Current" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="Target" dataKey="full" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeDasharray="4 4" strokeWidth={1.5} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
