import { useQuery } from "@tanstack/react-query";
import {
  Users, Briefcase, Brain, MessageSquare,
  TrendingUp, Clock, Mail, Zap, FileText, Search,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import StatCard from "@/components/common/StatCard";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: dashboardApi.getMetrics,
    refetchInterval: 60_000,
  });

  if (isLoading || !metrics) return <PageLoader text="Loading dashboard..." />;

  const { recruitment, ai, business, candidates_by_status, candidates_over_time, top_skills } = metrics;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Here's what's happening with your recruitment pipeline today.
          </p>
        </div>
        <Button onClick={() => navigate("/copilot")} className="gap-2">
          <Zap className="w-4 h-4" /> Ask Copilot
        </Button>
      </div>

      {/* Recruitment Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recruitment
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Candidates"
            value={recruitment.total_candidates.toLocaleString()}
            icon={Users}
            change={12}
            changeLabel="this month"
            iconColor="text-blue-600" iconBg="bg-blue-50"
          />
          <StatCard
            title="Active Pipeline"
            value={recruitment.active_candidates.toLocaleString()}
            icon={TrendingUp}
            iconColor="text-green-600" iconBg="bg-green-50"
          />
          <StatCard
            title="Interviews Scheduled"
            value={recruitment.interviews_scheduled}
            icon={Clock}
            iconColor="text-amber-600" iconBg="bg-amber-50"
          />
          <StatCard
            title="Hires Completed"
            value={recruitment.hires_completed}
            icon={Briefcase}
            iconColor="text-purple-600" iconBg="bg-purple-50"
          />
        </div>
      </div>

      {/* AI Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          AI Activity
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="AI Searches"
            value={ai.ai_searches_executed}
            icon={Search}
            iconColor="text-blue-600" iconBg="bg-blue-50"
          />
          <StatCard
            title="Outreach Generated"
            value={ai.outreach_generated}
            icon={Mail}
            iconColor="text-green-600" iconBg="bg-green-50"
          />
          <StatCard
            title="Documents Indexed"
            value={ai.documents_indexed}
            icon={FileText}
            iconColor="text-amber-600" iconBg="bg-amber-50"
          />
          <StatCard
            title="Agent Runs"
            value={ai.agent_runs_total}
            icon={Zap}
            iconColor="text-purple-600" iconBg="bg-purple-50"
          />
        </div>
      </div>

      {/* Business KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Business KPIs
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
              <p className="text-3xl font-bold mt-1">{business.response_rate}%</p>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${business.response_rate}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Interview Conversion</p>
              <p className="text-3xl font-bold mt-1">{business.interview_conversion_rate}%</p>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${business.interview_conversion_rate}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg. Time to Fill</p>
              <p className="text-3xl font-bold mt-1">{business.time_to_fill_days} <span className="text-base font-normal text-muted-foreground">days</span></p>
              <p className="text-xs text-muted-foreground mt-2">Industry avg: 45 days</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates over time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Candidates Over Time</CardTitle>
            <CardDescription>New candidates added per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={candidates_over_time} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Status</CardTitle>
            <CardDescription>Candidates by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {candidates_by_status.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={candidates_by_status}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value" nameKey="label"
                    >
{candidates_by_status.map((_item, i: number) => (
                         <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                       ))}
                     </Pie>
                    <Tooltip />
                   </PieChart>
                 </ResponsiveContainer>
                 <div className="space-y-1.5 mt-2">
                   {candidates_by_status.map((item, i: number) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="capitalize">{item.label}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Skills */}
      {top_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Skills in Pipeline</CardTitle>
            <CardDescription>Most common skills across all candidates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top_skills} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Add Candidate", icon: Users, href: "/candidates", color: "text-blue-600" },
            { label: "Analyze JD", icon: Briefcase, href: "/jobs", color: "text-green-600" },
            { label: "Ask Company Brain", icon: Brain, href: "/company-brain", color: "text-amber-600" },
            { label: "Chat with Copilot", icon: MessageSquare, href: "/copilot", color: "text-purple-600" },
          ].map(({ label, icon: Icon, href, color }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-accent transition-colors text-center"
            >
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
