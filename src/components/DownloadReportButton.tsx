import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateAnalysisPdf, type ReportInput } from "@/lib/pdfReport";
import { toast } from "sonner";

export function DownloadReportButton({
  input,
  variant = "outline",
  size = "sm",
  label = "Download PDF",
  className,
}: {
  input: ReportInput;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await generateAnalysisPdf(input);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate PDF");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button onClick={handle} disabled={loading} variant={variant} size={size} className={className}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}