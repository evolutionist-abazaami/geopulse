import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Loader2, Share2, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface ComparisonReportGeneratorProps {
  comparisonResult: {
    location: string;
    eventType: string;
    period1: {
      range: string;
      changePercent: number;
      area: string;
      summary: string;
    };
    period2: {
      range: string;
      changePercent: number;
      area: string;
      summary: string;
    };
    comparison: {
      trend: string;
      difference: string;
      insight: string;
    };
    chartData?: any[];
  };
}

const ComparisonReportGenerator = ({ comparisonResult }: ComparisonReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const getEventTypeInfo = (type: string) => {
    const types: Record<string, { label: string; icon: string; category: string }> = {
      deforestation: { label: "Deforestation Analysis", icon: "🌳", category: "Land Cover Change" },
      vegetation_loss: { label: "Vegetation Loss Analysis", icon: "🍃", category: "Land Cover Change" },
      flood: { label: "Flood Impact Assessment", icon: "🌊", category: "Natural Disaster" },
      drought: { label: "Drought Conditions Analysis", icon: "🏜️", category: "Climate Impact" },
      urbanization: { label: "Urban Expansion Analysis", icon: "🏙️", category: "Land Use Change" },
      wildfire: { label: "Wildfire Damage Assessment", icon: "🔥", category: "Natural Disaster" },
    };
    return types[type?.toLowerCase()] || { label: type || "Environmental Analysis", icon: "📊", category: "Comparative Assessment" };
  };

  const getRiskLevel = (changePercent: number): { level: string; color: [number, number, number]; bgColor: [number, number, number]; description: string } => {
    const absChange = Math.abs(changePercent);
    if (absChange >= 25) return { level: "CRITICAL", color: [220, 38, 38], bgColor: [254, 226, 226], description: "Immediate intervention required" };
    if (absChange >= 15) return { level: "HIGH", color: [234, 88, 12], bgColor: [255, 237, 213], description: "Urgent attention recommended" };
    if (absChange >= 8) return { level: "MODERATE", color: [202, 138, 4], bgColor: [254, 249, 195], description: "Monitoring and assessment needed" };
    if (absChange >= 3) return { level: "LOW", color: [22, 163, 74], bgColor: [220, 252, 231], description: "Within acceptable parameters" };
    return { level: "MINIMAL", color: [59, 130, 246], bgColor: [219, 234, 254], description: "No significant concern" };
  };

  const getTrendAnalysis = (trend: string, difference: string, p1: number, p2: number): { status: string; color: [number, number, number]; interpretation: string } => {
    if (trend === "increasing") {
      return {
        status: "ESCALATING",
        color: [220, 38, 38],
        interpretation: `Environmental impact has increased by ${difference}% between the two periods, indicating deteriorating conditions that require attention.`
      };
    } else if (trend === "decreasing") {
      return {
        status: "IMPROVING",
        color: [22, 163, 74],
        interpretation: `Environmental impact has decreased by ${difference}% between the two periods, suggesting recovery or successful intervention measures.`
      };
    }
    return {
      status: "STABLE",
      color: [59, 130, 246],
      interpretation: `Environmental conditions have remained relatively stable between the two periods with minimal change detected.`
    };
  };

  const generateComparisonPDF = async () => {
    if (!comparisonResult) {
      toast.error("No comparison data available");
      return;
    }

    setIsGenerating(true);
    toast.info("Generating comparison report...");

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;
      const contentWidth = pageWidth - margin * 2;

      const reportDate = new Date();
      const reportId = `GP-CMP-${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, '0')}${String(reportDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const eventInfo = getEventTypeInfo(comparisonResult.eventType);
      const period1Risk = getRiskLevel(comparisonResult.period1.changePercent);
      const period2Risk = getRiskLevel(comparisonResult.period2.changePercent);
      const trendAnalysis = getTrendAnalysis(
        comparisonResult.comparison.trend,
        comparisonResult.comparison.difference,
        comparisonResult.period1.changePercent,
        comparisonResult.period2.changePercent
      );

      // Helper functions
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };

      const addSectionTitle = (title: string, y: number): number => {
        pdf.setFillColor(8, 145, 178);
        pdf.rect(margin, y, 3, 8, "F");
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, margin + 6, y + 6);
        return y + 14;
      };

      const checkPageBreak = (requiredSpace: number): void => {
        if (yPos > pageHeight - requiredSpace) {
          pdf.addPage();
          yPos = margin;
          pdf.setFontSize(8);
          pdf.setTextColor(156, 163, 175);
          pdf.text(`GeoPulse Comparison Report ${reportId}`, margin, 12);
          pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, 12);
          yPos = 25;
        }
      };

      // ============= COVER PAGE =============
      // Header gradient
      pdf.setFillColor(8, 145, 178);
      pdf.rect(0, 0, pageWidth, 85, "F");
      
      // Accent stripe
      pdf.setFillColor(6, 182, 212);
      pdf.rect(0, 80, pageWidth, 5, "F");

      // Branding
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont("helvetica", "bold");
      pdf.text("GEOPULSE", margin, 35);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Environmental Intelligence Platform", margin, 45);

      // Report type badge
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 52, 55, 8, 2, 2, "F");
      pdf.setTextColor(8, 145, 178);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("COMPARATIVE ANALYSIS", margin + 3, 57);

      // Report ID
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Report ID: ${reportId}`, pageWidth - margin - 50, 70);

      yPos = 100;

      // Main Title
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Before & After Environmental Analysis", margin, yPos);
      yPos += 10;

      pdf.setFontSize(14);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${eventInfo.label} • ${eventInfo.category}`, margin, yPos);
      yPos += 20;

      // Location & Date Box
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "F");
      
      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(9);
      pdf.text("LOCATION", margin + 8, yPos + 10);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(comparisonResult.location, margin + 8, yPos + 18);

      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("REPORT DATE", pageWidth - margin - 50, yPos + 10);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(reportDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin - 50, yPos + 18);

      yPos += 35;

      // Trend Status Banner
      pdf.setFillColor(trendAnalysis.color[0], trendAnalysis.color[1], trendAnalysis.color[2]);
      pdf.roundedRect(margin, yPos, contentWidth, 22, 3, 3, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("TREND STATUS", margin + 8, yPos + 9);
      
      pdf.setFontSize(14);
      pdf.text(trendAnalysis.status, margin + 50, yPos + 9);
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${comparisonResult.comparison.difference}% change between periods`, margin + 8, yPos + 17);

      yPos += 32;

      // ============= PERIOD COMPARISON BOXES =============
      const boxWidth = (contentWidth - 8) / 2;

      // Period 1 Box (Before)
      pdf.setFillColor(period1Risk.bgColor[0], period1Risk.bgColor[1], period1Risk.bgColor[2]);
      pdf.roundedRect(margin, yPos, boxWidth, 55, 3, 3, "F");
      
      pdf.setFillColor(period1Risk.color[0], period1Risk.color[1], period1Risk.color[2]);
      pdf.roundedRect(margin, yPos, boxWidth, 12, 3, 3, "F");
      pdf.rect(margin, yPos + 6, boxWidth, 6, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("PERIOD 1 • BEFORE", margin + 5, yPos + 8);

      pdf.setTextColor(period1Risk.color[0], period1Risk.color[1], period1Risk.color[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(comparisonResult.period1.range, margin + 5, yPos + 22);

      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${comparisonResult.period1.changePercent.toFixed(1)}%`, margin + 5, yPos + 40);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Risk: ${period1Risk.level}`, margin + 5, yPos + 50);

      // Period 2 Box (After)
      pdf.setFillColor(period2Risk.bgColor[0], period2Risk.bgColor[1], period2Risk.bgColor[2]);
      pdf.roundedRect(margin + boxWidth + 8, yPos, boxWidth, 55, 3, 3, "F");
      
      pdf.setFillColor(period2Risk.color[0], period2Risk.color[1], period2Risk.color[2]);
      pdf.roundedRect(margin + boxWidth + 8, yPos, boxWidth, 12, 3, 3, "F");
      pdf.rect(margin + boxWidth + 8, yPos + 6, boxWidth, 6, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("PERIOD 2 • AFTER", margin + boxWidth + 13, yPos + 8);

      pdf.setTextColor(period2Risk.color[0], period2Risk.color[1], period2Risk.color[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(comparisonResult.period2.range, margin + boxWidth + 13, yPos + 22);

      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${comparisonResult.period2.changePercent.toFixed(1)}%`, margin + boxWidth + 13, yPos + 40);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Risk: ${period2Risk.level}`, margin + boxWidth + 13, yPos + 50);

      yPos += 65;

      // ============= PAGE 2 - DETAILED ANALYSIS =============
      pdf.addPage();
      yPos = margin;
      
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`GeoPulse Comparison Report ${reportId}`, margin, 12);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, 12);
      yPos = 25;

      // Executive Summary
      yPos = addSectionTitle("EXECUTIVE SUMMARY", yPos);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(55, 65, 81);
      
      const executiveSummary = 
        `This comparative environmental analysis examines ${eventInfo.label.toLowerCase()} patterns at ${comparisonResult.location} across two distinct time periods. ` +
        `During Period 1 (${comparisonResult.period1.range}), the environmental change indicator measured ${comparisonResult.period1.changePercent.toFixed(1)}%. ` +
        `In Period 2 (${comparisonResult.period2.range}), this changed to ${comparisonResult.period2.changePercent.toFixed(1)}%, representing a ${comparisonResult.comparison.difference}% ${comparisonResult.comparison.trend === "increasing" ? "increase" : comparisonResult.comparison.trend === "decreasing" ? "decrease" : "variation"}. ` +
        `Based on our comprehensive satellite analysis and AI-powered pattern recognition, the overall trend is classified as ${trendAnalysis.status}.`;
      
      yPos = addWrappedText(executiveSummary, margin, yPos, contentWidth, 5);
      yPos += 15;

      // Comparative Insight
      yPos = addSectionTitle("TREND INTERPRETATION", yPos);
      
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPos - 2, contentWidth, 25, 3, 3, "F");
      
      pdf.setTextColor(55, 65, 81);
      pdf.setFontSize(10);
      yPos = addWrappedText(trendAnalysis.interpretation, margin + 5, yPos + 5, contentWidth - 10, 5);
      yPos += 10;

      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "italic");
      yPos = addWrappedText(comparisonResult.comparison.insight, margin + 5, yPos, contentWidth - 10, 5);
      yPos += 15;

      // Detailed Period Analysis
      yPos = addSectionTitle("PERIOD 1 ANALYSIS (BEFORE)", yPos);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(55, 65, 81);
      
      const period1Summary = comparisonResult.period1.summary || 
        `During the period from ${comparisonResult.period1.range}, satellite analysis detected a ${comparisonResult.period1.changePercent.toFixed(1)}% change in ${eventInfo.label.toLowerCase()} indicators. ` +
        `The area analyzed covered ${comparisonResult.period1.area || "the designated region"}. This baseline period serves as the reference point for comparative assessment.`;
      
      yPos = addWrappedText(period1Summary, margin, yPos, contentWidth, 5);
      yPos += 12;

      checkPageBreak(50);
      yPos = addSectionTitle("PERIOD 2 ANALYSIS (AFTER)", yPos);
      
      const period2Summary = comparisonResult.period2.summary || 
        `During the period from ${comparisonResult.period2.range}, satellite analysis detected a ${comparisonResult.period2.changePercent.toFixed(1)}% change in ${eventInfo.label.toLowerCase()} indicators. ` +
        `The area analyzed covered ${comparisonResult.period2.area || "the designated region"}. Comparison with the baseline period reveals ${comparisonResult.comparison.trend} environmental impact.`;
      
      yPos = addWrappedText(period2Summary, margin, yPos, contentWidth, 5);
      yPos += 15;

      // Key Findings
      checkPageBreak(60);
      yPos = addSectionTitle("KEY FINDINGS", yPos);

      const findings = [
        {
          type: "CHANGE MAGNITUDE",
          detail: `The absolute change between periods is ${comparisonResult.comparison.difference}%, indicating ${parseFloat(comparisonResult.comparison.difference) > 10 ? "significant" : parseFloat(comparisonResult.comparison.difference) > 5 ? "moderate" : "minor"} environmental variation.`
        },
        {
          type: "TREND DIRECTION",
          detail: `Environmental impact is ${comparisonResult.comparison.trend}, with Period 2 showing ${comparisonResult.comparison.trend === "increasing" ? "higher" : comparisonResult.comparison.trend === "decreasing" ? "lower" : "similar"} change levels compared to Period 1.`
        },
        {
          type: "RISK ASSESSMENT",
          detail: `Period 1 risk level: ${period1Risk.level} (${period1Risk.description}). Period 2 risk level: ${period2Risk.level} (${period2Risk.description}).`
        },
        {
          type: "INTERVENTION STATUS",
          detail: comparisonResult.comparison.trend === "decreasing" 
            ? "Positive trend suggests potential success of mitigation measures or natural recovery processes."
            : comparisonResult.comparison.trend === "increasing"
            ? "Escalating trend indicates need for immediate intervention and enhanced monitoring."
            : "Stable conditions suggest current management approach is maintaining equilibrium."
        }
      ];

      findings.forEach((finding, index) => {
        checkPageBreak(25);
        
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin, yPos - 4, contentWidth, 20, 2, 2, "F");
        
        pdf.setFillColor(8, 145, 178);
        pdf.circle(margin + 6, yPos + 4, 3, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(index + 1), margin + 4.5, yPos + 6);
        
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(finding.type, margin + 14, yPos + 4);
        
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(9);
        const wrappedFinding = pdf.splitTextToSize(finding.detail, contentWidth - 20);
        pdf.text(wrappedFinding.slice(0, 2).join(' '), margin + 14, yPos + 12);
        
        yPos += 24;
      });

      // ============= PAGE 3 - RECOMMENDATIONS =============
      pdf.addPage();
      yPos = margin;
      
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`GeoPulse Comparison Report ${reportId}`, margin, 12);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, 12);
      yPos = 25;

      yPos = addSectionTitle("RECOMMENDATIONS", yPos);

      const recommendations = comparisonResult.comparison.trend === "increasing" ? [
        { priority: "HIGH", action: "Implement immediate monitoring protocols for the affected region", timeline: "Within 2 weeks" },
        { priority: "HIGH", action: "Conduct ground-truth verification of satellite findings", timeline: "Within 1 month" },
        { priority: "MEDIUM", action: "Develop intervention strategy based on specific impact zones", timeline: "Within 2 months" },
        { priority: "MEDIUM", action: "Establish stakeholder communication for coordinated response", timeline: "Ongoing" },
        { priority: "LOW", action: "Schedule follow-up comparative analysis to track changes", timeline: "Quarterly" }
      ] : comparisonResult.comparison.trend === "decreasing" ? [
        { priority: "MEDIUM", action: "Document successful intervention strategies for replication", timeline: "Within 1 month" },
        { priority: "MEDIUM", action: "Continue current monitoring and management practices", timeline: "Ongoing" },
        { priority: "LOW", action: "Analyze contributing factors to positive trend", timeline: "Within 2 months" },
        { priority: "LOW", action: "Share findings with relevant environmental agencies", timeline: "Within 1 month" },
        { priority: "LOW", action: "Plan long-term sustainability assessment", timeline: "Within 6 months" }
      ] : [
        { priority: "MEDIUM", action: "Maintain current environmental monitoring frequency", timeline: "Ongoing" },
        { priority: "LOW", action: "Review and optimize existing management protocols", timeline: "Within 3 months" },
        { priority: "LOW", action: "Conduct periodic comparative assessments", timeline: "Semi-annually" },
        { priority: "LOW", action: "Update baseline data for future comparisons", timeline: "Annually" }
      ];

      recommendations.forEach((rec, index) => {
        checkPageBreak(22);
        
        const priorityColors: Record<string, [number, number, number]> = {
          "HIGH": [220, 38, 38],
          "MEDIUM": [234, 179, 8],
          "LOW": [59, 130, 246]
        };
        
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin, yPos - 3, contentWidth, 18, 2, 2, "F");
        
        pdf.setFillColor(...priorityColors[rec.priority]);
        pdf.roundedRect(margin + 3, yPos, 25, 6, 1, 1, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(rec.priority, margin + 6, yPos + 4);
        
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text(rec.action, margin + 32, yPos + 4);
        
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Timeline: ${rec.timeline}`, margin + 32, yPos + 11);
        
        yPos += 20;
      });

      yPos += 10;

      // Data Sources
      checkPageBreak(50);
      yPos = addSectionTitle("DATA SOURCES & METHODOLOGY", yPos);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(75, 85, 99);
      
      const methodology = 
        "This comparative analysis utilizes multi-spectral satellite imagery processed through advanced change detection algorithms. " +
        "Environmental indicators are derived from validated indices including NDVI, NDWI, and thermal analysis where applicable. " +
        "AI-powered pattern recognition enhances detection accuracy with confidence levels exceeding 85% for standard assessments.";
      
      yPos = addWrappedText(methodology, margin, yPos, contentWidth, 5);
      yPos += 10;

      const sources = [
        "• Sentinel-2 Multi-Spectral Imagery",
        "• Landsat 8/9 OLI-TIRS Data",
        "• MODIS Terra/Aqua Products",
        "• GeoPulse AI Analysis Engine v2.0"
      ];

      sources.forEach(source => {
        pdf.text(source, margin, yPos);
        yPos += 5;
      });

      yPos += 15;

      // Footer
      pdf.setFillColor(8, 145, 178);
      pdf.rect(0, pageHeight - 20, pageWidth, 20, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("GeoPulse Environmental Intelligence Platform", margin, pageHeight - 12);
      pdf.text(`Generated: ${reportDate.toISOString()}`, margin, pageHeight - 7);
      
      pdf.setFont("helvetica", "bold");
      pdf.text("www.geopulse.ai", pageWidth - margin - 30, pageHeight - 10);

      // Save PDF
      const filename = `GeoPulse_Comparison_${comparisonResult.location.replace(/[^a-zA-Z0-9]/g, "_")}_${reportDate.toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);

      toast.success("Comparison report downloaded successfully!");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateShareLink = async () => {
    setIsSharing(true);
    setShareUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("Please sign in to share reports");
        setIsSharing(false);
        return;
      }

      const eventInfo = getEventTypeInfo(comparisonResult.eventType);
      const title = `${eventInfo.label} - ${comparisonResult.location}`;

      const { data, error } = await supabase
        .from("shared_reports")
        .insert({
          report_type: "comparison",
          title,
          location_name: comparisonResult.location,
          event_type: comparisonResult.eventType,
          report_data: comparisonResult,
          created_by: session.user.id,
        })
        .select("share_id")
        .single();

      if (error) {
        console.error("Share error:", error);
        toast.error("Failed to create share link");
        return;
      }

      const baseUrl = window.location.origin;
      const url = `${baseUrl}/shared/${data.share_id}`;
      setShareUrl(url);
      toast.success("Share link created!");
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to create share link");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="space-y-3 mt-4">
      <Button
        onClick={generateComparisonPDF}
        disabled={isGenerating}
        variant="outline"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Download Comparison Report (PDF)
          </>
        )}
      </Button>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share Report
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Share Comparison Report
            </DialogTitle>
            <DialogDescription>
              Generate a public link to share this comparison analysis with stakeholders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!shareUrl ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Create a shareable link for:
                </p>
                <div className="bg-muted rounded-lg p-4 mb-4">
                  <p className="font-semibold">{comparisonResult.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {getEventTypeInfo(comparisonResult.eventType).label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {comparisonResult.period1.range} vs {comparisonResult.period2.range}
                  </p>
                </div>
                <Button onClick={generateShareLink} disabled={isSharing} className="w-full">
                  {isSharing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Link...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Anyone with this link can view the report
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShareUrl(null);
                    setShareDialogOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComparisonReportGenerator;
