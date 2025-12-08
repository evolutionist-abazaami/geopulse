import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2, Image, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface ReportGeneratorProps {
  analysisData: any;
  eventType?: string;
  region?: string;
}

const ReportGenerator = ({ analysisData, eventType, region }: ReportGeneratorProps) => {
  const [reportType, setReportType] = useState<"professional" | "simple">("simple");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [includeImages, setIncludeImages] = useState(true);

  const generateVisualization = async (type: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visualization`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            visualizationType: type,
            region: region || analysisData?.region,
            eventType: eventType || analysisData?.eventType,
            data: analysisData,
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Visualization generation failed for ${type}`);
        return null;
      }

      const data = await response.json();
      return data.imageUrl || null;
    } catch (error) {
      console.error(`Error generating ${type} visualization:`, error);
      return null;
    }
  };

  const loadImageAsBase64 = async (dataUrl: string): Promise<{ data: string; width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        resolve({
          data: dataUrl,
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  };

  const generatePDFReport = async () => {
    if (!analysisData) {
      toast.error("No analysis data available");
      return;
    }

    setIsGenerating(true);
    const isSimple = reportType === "simple";

    try {
      // Generate visualizations if enabled
      let mapImage: string | null = null;
      let chartImage: string | null = null;

      if (includeImages) {
        setGenerationStep("Generating map visualization...");
        mapImage = await generateVisualization("map");
        
        setGenerationStep("Generating chart visualization...");
        chartImage = await generateVisualization("chart");
      }

      setGenerationStep("Creating PDF report...");

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };

      // Header
      pdf.setFillColor(8, 145, 178); // Primary color
      pdf.rect(0, 0, pageWidth, 40, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("GEOPULSE", margin, 18);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Environmental Analysis Report", margin, 28);
      
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 28);

      yPos = 50;

      // Report type badge
      pdf.setTextColor(8, 145, 178);
      pdf.setFontSize(10);
      pdf.text(isSimple ? "SIMPLE SUMMARY" : "PROFESSIONAL REPORT", margin, yPos);
      yPos += 10;

      // Region and Event Type
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(region || analysisData?.region || "Environmental Analysis", margin, yPos);
      yPos += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Event Type: ${eventType || analysisData?.eventType || "General Analysis"}`, margin, yPos);
      yPos += 15;

      // Key Metrics Box
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, "F");
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      const metricsY = yPos + 10;
      
      // Change Percent
      pdf.setFont("helvetica", "bold");
      pdf.text("Change Detected", margin + 10, metricsY);
      pdf.setFontSize(16);
      pdf.setTextColor(239, 68, 68); // Red
      pdf.text(`${analysisData?.changePercent || analysisData?.change_percent || "N/A"}%`, margin + 10, metricsY + 10);
      
      // Area
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text("Area Analyzed", margin + 60, metricsY);
      pdf.setFontSize(12);
      pdf.text(analysisData?.area || analysisData?.area_analyzed || "N/A", margin + 60, metricsY + 10);
      
      // Confidence
      pdf.setFontSize(10);
      pdf.text("Confidence", margin + 120, metricsY);
      pdf.setFontSize(12);
      pdf.setTextColor(34, 197, 94); // Green
      pdf.text(`${analysisData?.confidenceLevel || 85}%`, margin + 120, metricsY + 10);
      
      yPos += 35;

      // Map Visualization
      if (mapImage) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Location Map", margin, yPos);
        yPos += 5;
        
        try {
          const imgData = await loadImageAsBase64(mapImage);
          if (imgData) {
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (imgData.height / imgData.width) * imgWidth;
            const maxHeight = 60;
            const finalHeight = Math.min(imgHeight, maxHeight);
            
            pdf.addImage(mapImage, "PNG", margin, yPos, imgWidth, finalHeight);
            yPos += finalHeight + 10;
          }
        } catch (e) {
          console.warn("Could not add map image to PDF");
          yPos += 5;
        }
      }

      // Summary Section
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, yPos);
      yPos += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      yPos = addWrappedText(
        analysisData?.summary || "Environmental analysis complete. Please review the detailed findings.",
        margin,
        yPos,
        pageWidth - margin * 2,
        5
      );
      yPos += 10;

      // Chart Visualization
      if (chartImage && yPos < pageHeight - 80) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Trend Analysis", margin, yPos);
        yPos += 5;
        
        try {
          const imgData = await loadImageAsBase64(chartImage);
          if (imgData) {
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (imgData.height / imgData.width) * imgWidth;
            const maxHeight = 50;
            const finalHeight = Math.min(imgHeight, maxHeight);
            
            pdf.addImage(chartImage, "PNG", margin, yPos, imgWidth, finalHeight);
            yPos += finalHeight + 10;
          }
        } catch (e) {
          console.warn("Could not add chart image to PDF");
        }
      }

      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = margin;
      }

      // Findings Section
      const findings = analysisData?.findings || analysisData?.recommendations || [];
      if (findings.length > 0) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Findings", margin, yPos);
        yPos += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);

        findings.slice(0, 5).forEach((finding: any, index: number) => {
          const text = typeof finding === "string" ? finding : finding.detail || finding.description || JSON.stringify(finding);
          pdf.setFillColor(8, 145, 178);
          pdf.circle(margin + 2, yPos - 1, 1.5, "F");
          yPos = addWrappedText(text, margin + 8, yPos, pageWidth - margin * 2 - 8, 5);
          yPos += 3;
          
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = margin;
          }
        });
      }

      // Professional report extra sections
      if (!isSimple) {
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = margin;
        }

        // Detailed Analysis
        if (analysisData?.fullAnalysis || analysisData?.detailedAnalysis) {
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text("Detailed Analysis", margin, yPos);
          yPos += 8;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          yPos = addWrappedText(
            (analysisData?.fullAnalysis || analysisData?.detailedAnalysis).substring(0, 1500),
            margin,
            yPos,
            pageWidth - margin * 2,
            5
          );
          yPos += 10;
        }

        // Methodology
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Methodology", margin, yPos);
        yPos += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        yPos = addWrappedText(
          "This analysis utilized advanced remote sensing techniques including multi-spectral satellite imagery analysis, NDVI computation for vegetation health assessment, and AI-powered pattern recognition for change detection. Data sources include Sentinel-2, Landsat, and MODIS satellite archives.",
          margin,
          yPos,
          pageWidth - margin * 2,
          5
        );
      }

      // Footer
      const footerY = pageHeight - 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Generated by GeoPulse AI Environmental Analysis System", margin, footerY);
      pdf.text(`Page 1 of ${pdf.getNumberOfPages()}`, pageWidth - margin - 20, footerY);

      // Save PDF
      const filename = `geopulse-${reportType}-report-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);

      toast.success(`${reportType === "professional" ? "Professional" : "Simple"} PDF report downloaded!`);
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Report Format</Label>
        <Select value={reportType} onValueChange={(v) => setReportType(v as "professional" | "simple")}>
          <SelectTrigger className="bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">
              <span className="flex items-center gap-2">
                <span>📝</span> Simple - Easy to understand summary
              </span>
            </SelectItem>
            <SelectItem value="professional">
              <span className="flex items-center gap-2">
                <span>📊</span> Professional - Detailed technical report
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Include AI visualizations</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={includeImages ? "text-primary" : "text-muted-foreground"}
          onClick={() => setIncludeImages(!includeImages)}
        >
          {includeImages ? <Check className="h-4 w-4" /> : "Off"}
        </Button>
      </div>

      {isGenerating && generationStep && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-primary">{generationStep}</span>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        variant="outline"
        onClick={generatePDFReport}
        disabled={isGenerating || !analysisData}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF Report
          </>
        )}
      </Button>
    </div>
  );
};

export default ReportGenerator;
