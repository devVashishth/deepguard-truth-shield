import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Image as ImageIcon,
  Video,
  Newspaper,
  Smile,
  Camera,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import hero from "@/assets/hero.jpg";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: ImageIcon, title: "Image Deepfake Detection", desc: "CNN-style multimodal analysis with explainable heatmap overlays of suspicious regions." },
  { icon: Video, title: "Video Frame Analysis", desc: "Sample frames, score each, aggregate verdict with frame-by-frame anomaly breakdown." },
  { icon: Newspaper, title: "Fake News Verification", desc: "NLP-driven classifier highlighting misleading phrases, red flags and supporting signals." },
  { icon: Smile, title: "Emotion Analysis", desc: "Detect dominant facial mood with per-class confidence — happy, sad, angry, neutral and more." },
  { icon: Camera, title: "Real-time Webcam", desc: "Live Real Human vs AI-Generated detection straight from your browser camera." },
  { icon: Brain, title: "Explainable AI", desc: "Every verdict comes with reasoning, artifacts, and visual evidence. Never a black box." },
];

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur bg-background/70 border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight text-lg">DeepGuard AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-smooth">Features</a>
            <a href="#how" className="hover:text-foreground transition-smooth">How it works</a>
            <a href="#metrics" className="hover:text-foreground transition-smooth">Performance</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Open Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth?mode=signup">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero">
        <div className="container py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by multimodal AI · Explainable by design
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Detect <span className="text-gradient">deepfakes</span>.<br />
              Verify what's real.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              DeepGuard AI analyzes images, videos, news, and live webcam feeds to spot manipulated media — with visual heatmaps explaining every decision.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={user ? "/dashboard" : "/auth?mode=signup"}>
                  {user ? "Go to Dashboard" : "Start detecting free"} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Explore features</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Image · Video · Text · Live", "Heatmap explanations", "Encrypted history"].map((t) => (
                <div key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t}</div>
              ))}
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-6 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <img
              src={hero}
              alt="DeepGuard AI scanning a synthetic face"
              className="relative rounded-2xl shadow-elegant border border-border"
            />
            <div className="absolute -bottom-6 -left-6 hidden md:block bg-card border border-border rounded-xl p-4 shadow-elegant w-56">
              <div className="text-xs text-muted-foreground">Verdict</div>
              <div className="text-lg font-semibold">Likely manipulated</div>
              <div className="font-mono text-2xl text-gradient">94%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <div className="text-sm font-medium text-primary mb-2">Capabilities</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">A complete deepfake forensics suite</h2>
            <p className="mt-3 text-muted-foreground">Six detection surfaces, one explainable AI engine. Run analysis directly in your browser, get structured verdicts, and keep a full history.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group rounded-2xl bg-gradient-card border border-border p-6 shadow-soft hover:shadow-elegant transition-smooth">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft group-hover:shadow-glow transition-smooth">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-20 bg-secondary/40 border-y border-border">
        <div className="container grid md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Upload or capture", d: "Drop an image, video, paste a news article, or open your camera." },
            { n: "02", t: "Multimodal analysis", d: "Frames are processed through an explainable AI pipeline checking for manipulation cues." },
            { n: "03", t: "Get a verdict + heatmap", d: "See confidence, suspicious regions, and a plain-English explanation. Saved to history." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-card border border-border p-6 shadow-soft">
              <div className="font-mono text-sm text-primary">{s.n}</div>
              <div className="mt-2 text-xl font-semibold">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-20 md:py-28">
        <div className="container grid md:grid-cols-4 gap-6 text-center">
          {[
            { k: "97.2%", v: "Image accuracy*" },
            { k: "94.6%", v: "Video F1*" },
            { k: "<3s", v: "Avg. analysis" },
            { k: "6", v: "Detection modes" },
          ].map((m) => (
            <div key={m.v} className="rounded-2xl border border-border bg-gradient-card p-8 shadow-soft">
              <div className="text-4xl font-semibold text-gradient font-mono">{m.k}</div>
              <div className="mt-2 text-sm text-muted-foreground">{m.v}</div>
            </div>
          ))}
        </div>
        <p className="container mt-4 text-xs text-muted-foreground">*Indicative benchmarks on FaceForensics++/Celeb-DF style evaluation. Live results depend on input quality.</p>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-3xl bg-gradient-primary p-10 md:p-16 shadow-elegant text-primary-foreground text-center">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Stop trusting media at face value.</h2>
            <p className="mt-4 opacity-90 max-w-2xl mx-auto">Create a free DeepGuard account and start detecting manipulated content in seconds.</p>
            <div className="mt-8">
              <Button size="lg" variant="secondary" asChild>
                <Link to={user ? "/dashboard" : "/auth?mode=signup"}>
                  {user ? "Open Dashboard" : "Create free account"} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-border">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> DeepGuard AI · Explainable media forensics
          </div>
          <div>© {new Date().getFullYear()} DeepGuard AI</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
