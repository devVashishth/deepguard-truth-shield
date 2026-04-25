import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  Newspaper,
  Smile,
  Camera,
  ArrowRight,
  Activity,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const tiles = [
  { to: "/detect/image", icon: ImageIcon, title: "Image Detection", desc: "Upload an image, get a heatmap-explained verdict." },
  { to: "/detect/video", icon: Video, title: "Video Detection", desc: "Sample frames from a clip and aggregate verdict." },
  { to: "/detect/news", icon: Newspaper, title: "Fake News", desc: "Paste an article — get verdict + misleading phrases." },
  { to: "/detect/emotion", icon: Smile, title: "Emotion Analysis", desc: "Detect dominant facial mood from any photo." },
  { to: "/detect/webcam", icon: Camera, title: "Live Camera", desc: "Real-time Real Human vs AI Generated detection." },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, fakes: 0, real: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("verdict")
        .eq("user_id", user.id);
      if (data) {
        setStats({
          total: data.length,
          fakes: data.filter((d) => d.verdict === "fake").length,
          real: data.filter((d) => d.verdict === "real").length,
        });
      }
    })();
  }, [user]);

  return (
    <div className="container py-8">
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome back${user?.user_metadata?.full_name ? ", " + user.user_metadata.full_name.split(" ")[0] : ""}`}
        description="Pick a detection module to get started, or review your analysis history."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Activity} label="Total scans" value={stats.total} accent="primary" />
        <StatCard icon={ShieldCheck} label="Authentic" value={stats.real} accent="success" />
        <StatCard icon={AlertTriangle} label="Manipulated" value={stats.fakes} accent="destructive" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl bg-gradient-card border border-border p-6 shadow-soft hover:shadow-elegant transition-smooth"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft group-hover:shadow-glow transition-smooth">
                <Icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-smooth" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  accent: "primary" | "success" | "destructive";
}) {
  const ring = {
    primary: "bg-gradient-primary",
    success: "bg-gradient-success",
    destructive: "bg-gradient-danger",
  }[accent];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground ${ring}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold font-mono">{value}</div>
      </div>
    </div>
  );
}