import { useState } from "react";
import { Newspaper, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerdictCard } from "@/components/VerdictCard";
import { runAnalysis } from "@/lib/analyze";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FakeNews() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const analyze = async () => {
    if (!user || !text.trim()) return;
    setLoading(true);
    try {
      const { result } = await runAnalysis({ type: "fakenews", text, sourceUrl });
      setResult(result);
      await supabase.from("analyses").insert({
        user_id: user.id,
        type: "fakenews",
        verdict: result.verdict,
        confidence: result.confidence,
        title: sourceUrl || text.slice(0, 80),
        input_preview: text.slice(0, 500),
        result,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const highlighted = highlightMisleading(text, result?.misleading_phrases ?? []);

  return (
    <div className="container py-8">
      <PageHeader
        icon={Newspaper}
        title="Fake News Detection"
        description="Paste a news article or claim. We analyze language, sourcing and consistency, and surface the misleading phrases that drove the verdict."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="src">Source URL (optional)</Label>
            <Input id="src" placeholder="https://example.com/article" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="text">Article / claim text</Label>
            <Textarea id="text" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full article text here…" maxLength={12000} />
            <div className="text-xs text-muted-foreground text-right">{text.length} / 12000</div>
          </div>
          <Button onClick={analyze} disabled={loading || !text.trim()} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? "Analyzing…" : "Verify"}
          </Button>
        </div>

        <div className="space-y-4">
          {result && (
            <>
              <VerdictCard verdict={result.verdict} confidence={result.confidence} summary={result.summary} />
              {result.misleading_phrases?.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Misleading phrases</div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{highlighted}</div>
                </div>
              )}
              <SignalList title="Red flags" items={result.red_flags ?? []} accent="destructive" />
              <SignalList title="Supporting signals" items={result.supporting_signals ?? []} accent="success" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SignalList({ title, items, accent }: { title: string; items: string[]; accent: "destructive" | "success" }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className={accent === "destructive" ? "text-destructive" : "text-success"}>•</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function highlightMisleading(text: string, phrases: string[]) {
  if (!phrases.length) return text;
  // simple split-and-mark
  const escaped = phrases
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) => {
    if (escaped.some((e) => new RegExp(`^${e}$`, "i").test(p))) {
      return (
        <mark key={i} className="bg-destructive/20 text-foreground px-1 rounded">
          {p}
        </mark>
      );
    }
    return <span key={i}>{p}</span>;
  });
}