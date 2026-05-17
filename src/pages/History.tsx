import { useEffect, useState } from "react";
import { History as HistoryIcon, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { toast } from "sonner";

interface Row {
  id: string;
  type: string;
  verdict: string | null;
  confidence: number | null;
  title: string | null;
  media_url: string | null;
  input_preview?: string | null;
  result: any;
  created_at: string;
}

const typeLabel: Record<string, string> = {
  image: "Image",
  video: "Video",
  fakenews: "Fake News",
  emotion: "Emotion",
  webcam: "Webcam",
};

export default function History() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as any) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    }
  };

  return (
    <div className="container py-8">
      <PageHeader icon={HistoryIcon} title="Analysis History" description="Every scan you run is saved here, encrypted and accessible only to you." />

      {rows === null && (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <p className="text-muted-foreground">No analyses yet. Run your first scan to populate this list.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows?.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 shadow-soft">
            {r.media_url ? (
              r.type === "video" ? (
                <video src={r.media_url} className="h-16 w-16 rounded-lg object-cover bg-black" muted />
              ) : (
                <img src={r.media_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              )
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                {typeLabel[r.type]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{typeLabel[r.type]}</span>
                {r.verdict && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.verdict === "fake" ? "bg-destructive/15 text-destructive" :
                    r.verdict === "real" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  }`}>{r.verdict}{r.confidence ? ` · ${Math.round(Number(r.confidence))}%` : ""}</span>
                )}
              </div>
              <div className="font-medium truncate mt-1">{r.title ?? "Untitled"}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
            <DownloadReportButton
              input={{
                type: r.type as any,
                title: r.title,
                createdAt: r.created_at,
                verdict: r.verdict,
                confidence: r.confidence,
                mediaUrl: r.media_url,
                inputPreview: r.input_preview,
                result: r.result,
              }}
              label="PDF"
            />
          </div>
        ))}
      </div>
    </div>
  );
}