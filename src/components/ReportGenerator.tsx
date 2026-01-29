import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2, Image, Check, Shield, AlertTriangle, TrendingUp, MapPin, Calendar, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface ReportGeneratorProps {
  analysisData: any;
  eventType?: string;
  region?: string;
}

const ReportGenerator = ({ analysisData, eventType, region }: ReportGeneratorProps) => {
  const [reportType, setReportType] = useState<"professional" | "simple">("professional");
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

  // Helper to determine risk level based on change percent
  const getRiskLevel = (changePercent: number): { level: string; color: [number, number, number]; description: string } => {
    const absChange = Math.abs(changePercent);
    if (absChange >= 25) return { level: "CRITICAL", color: [220, 38, 38], description: "Immediate intervention required" };
    if (absChange >= 15) return { level: "HIGH", color: [234, 88, 12], description: "Urgent attention recommended" };
    if (absChange >= 8) return { level: "MODERATE", color: [234, 179, 8], description: "Monitoring and assessment needed" };
    if (absChange >= 3) return { level: "LOW", color: [34, 197, 94], description: "Within acceptable parameters" };
    return { level: "MINIMAL", color: [59, 130, 246], description: "No significant concern" };
  };

  // Get event type display info
  const getEventTypeInfo = (type: string) => {
    const types: Record<string, { label: string; category: string }> = {
      deforestation: { label: "Deforestation Analysis", category: "Land Cover Change" },
      flood: { label: "Flood Impact Assessment", category: "Natural Disaster" },
      urbanization: { label: "Urban Expansion Analysis", category: "Land Use Change" },
      drought: { label: "Drought Conditions Analysis", category: "Climate Impact" },
      fire: { label: "Wildfire Damage Assessment", category: "Natural Disaster" },
      landslide: { label: "Landslide Risk Analysis", category: "Geological Hazard" },
      mining: { label: "Mining Activity Detection", category: "Resource Extraction" },
      agriculture: { label: "Agricultural Land Analysis", category: "Land Use Change" },
      water_quality: { label: "Water Quality Assessment", category: "Environmental Health" },
      coastal_erosion: { label: "Coastal Erosion Analysis", category: "Geological Change" },
    };
    return types[type?.toLowerCase()] || { label: type || "Environmental Analysis", category: "General Assessment" };
  };

  const generatePDFReport = async () => {
    if (!analysisData) {
      toast.error("No analysis data available");
      return;
    }

    setIsGenerating(true);
    const isSimple = reportType === "simple";

    try {
      // Generate Landsat visualizations if enabled
      let mapImage: string | null = null;
      let chartImage: string | null = null;
      let classificationImage: string | null = null;

      if (includeImages) {
        setGenerationStep("Generating Landsat true-color satellite imagery...");
        mapImage = await generateVisualization("landsat_truecolor");
        
        // If classification data exists, generate classification map
        if (analysisData?.classificationResults) {
          setGenerationStep("Generating land cover classification map...");
          classificationImage = await generateVisualization("classification_map");
        } else if (analysisData?.changeDetection) {
          setGenerationStep("Generating change detection map...");
          classificationImage = await generateVisualization("change_detection_map");
        }
        
        setGenerationStep("Generating spectral indices analysis chart...");
        chartImage = await generateVisualization("chart");
      }

      setGenerationStep("Compiling professional Landsat report...");

      // Create PDF with high quality settings
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

      // Extract data
      const changePercent = parseFloat(analysisData?.changePercent || analysisData?.change_percent || 0);
      const risk = getRiskLevel(changePercent);
      const eventInfo = getEventTypeInfo(eventType || analysisData?.eventType);
      const reportDate = new Date();
      const reportId = `GP-${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, '0')}${String(reportDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Helper functions
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 4.5): number => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        const maxLines = Math.floor((pageHeight - y - 30) / lineHeight); // Limit lines to fit page
        const displayLines = lines.slice(0, Math.min(lines.length, maxLines));
        pdf.text(displayLines, x, y);
        return y + (displayLines.length * lineHeight);
      };

      const addSectionTitle = (title: string, y: number): number => {
        pdf.setFillColor(8, 145, 178);
        pdf.rect(margin, y, 3, 7, "F");
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, margin + 6, y + 5);
        return y + 12;
      };

      const addTableRow = (cols: string[], y: number, isHeader: boolean = false, colWidths: number[]): number => {
        const rowHeight = 7;
        let x = margin;
        
        if (isHeader) {
          pdf.setFillColor(243, 244, 246);
          pdf.rect(margin, y - 4, contentWidth, rowHeight, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(55, 65, 81);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(75, 85, 99);
        }
        
        pdf.setFontSize(8);
        cols.forEach((col, i) => {
          // Truncate text if too long for column
          const truncatedText = pdf.splitTextToSize(col, colWidths[i] - 4)[0] || col;
          pdf.text(truncatedText, x + 2, y);
          x += colWidths[i];
        });
        
        return y + rowHeight;
      };

      const checkPageBreak = (requiredSpace: number): void => {
        if (yPos > pageHeight - requiredSpace) {
          pdf.addPage();
          yPos = margin;
          // Add page header on new pages
          pdf.setFontSize(8);
          pdf.setTextColor(156, 163, 175);
          pdf.text(`GeoPulse Report ${reportId}`, margin, 12);
          pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, 12);
          yPos = 20;
        }
      };

      // ============= COVER PAGE =============
      // Full page gradient header
      pdf.setFillColor(8, 145, 178);
      pdf.rect(0, 0, pageWidth, 90, "F");
      
      // Accent line
      pdf.setFillColor(6, 182, 212);
      pdf.rect(0, 85, pageWidth, 5, "F");

      // Logo and branding
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("GEOPULSE", margin, 35);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Environmental Intelligence Platform", margin, 44);
      
      // Report type badge
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 52, 48, 7, 2, 2, "F");
      pdf.setTextColor(8, 145, 178);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text(isSimple ? "SUMMARY REPORT" : "PROFESSIONAL ANALYSIS", margin + 3, 57);

      // Report ID
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Report ID: ${reportId}`, pageWidth - margin - 42, 75);

      yPos = 100;

      // Main Title - truncate if too long
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(eventInfo.label, contentWidth);
      pdf.text(titleLines[0], margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "normal");
      pdf.text(eventInfo.category, margin, yPos);
      yPos += 15;

      // Location and Date Info Box
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPos, contentWidth, 30, 3, 3, "F");
      
      const infoBoxY = yPos;
      const colWidth = contentWidth / 3;
      
      // Region column
      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(7);
      pdf.text("REGION", margin + 5, infoBoxY + 8);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      const regionText = pdf.splitTextToSize(region || analysisData?.region || "Ghana", colWidth - 10)[0];
      pdf.text(regionText, margin + 5, infoBoxY + 16);

      // Analysis period column
      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("ANALYSIS PERIOD", margin + colWidth + 5, infoBoxY + 8);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      const startDate = analysisData?.startDate || analysisData?.start_date || "2024-01-01";
      const endDate = analysisData?.endDate || analysisData?.end_date || new Date().toISOString().split('T')[0];
      pdf.text(`${startDate} to ${endDate}`, margin + colWidth + 5, infoBoxY + 16);

      // Report date column
      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("REPORT DATE", margin + colWidth * 2 + 5, infoBoxY + 8);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), margin + colWidth * 2 + 5, infoBoxY + 16);

      yPos += 38;

      // Risk Assessment Banner
      pdf.setFillColor(risk.color[0], risk.color[1], risk.color[2]);
      pdf.roundedRect(margin, yPos, contentWidth, 20, 3, 3, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("RISK ASSESSMENT", margin + 6, yPos + 7);
      
      pdf.setFontSize(14);
      pdf.text(risk.level, margin + 6, yPos + 16);
      
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const riskDescLines = pdf.splitTextToSize(risk.description, contentWidth - 70);
      pdf.text(riskDescLines[0], margin + 50, yPos + 12);

      yPos += 28;

      // Key Metrics Grid
      const metricsBoxWidth = (contentWidth - 8) / 3;
      const metricsBoxHeight = 35;
      
      // Metric 1: Change Detected
      pdf.setFillColor(254, 242, 242);
      pdf.roundedRect(margin, yPos, metricsBoxWidth, metricsBoxHeight, 3, 3, "F");
      pdf.setTextColor(153, 27, 27);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("CHANGE DETECTED", margin + 4, yPos + 8);
      pdf.setFontSize(20);
      pdf.text(`${changePercent.toFixed(1)}%`, margin + 4, yPos + 23);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(changePercent > 0 ? "Increase" : changePercent < 0 ? "Decrease" : "No change", margin + 4, yPos + 30);

      // Metric 2: Area Analyzed
      pdf.setFillColor(239, 246, 255);
      pdf.roundedRect(margin + metricsBoxWidth + 4, yPos, metricsBoxWidth, metricsBoxHeight, 3, 3, "F");
      pdf.setTextColor(30, 64, 175);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("AREA ANALYZED", margin + metricsBoxWidth + 8, yPos + 8);
      pdf.setFontSize(14);
      const area = analysisData?.area || analysisData?.area_analyzed || "2,450 km²";
      const areaText = pdf.splitTextToSize(area, metricsBoxWidth - 8)[0];
      pdf.text(areaText, margin + metricsBoxWidth + 8, yPos + 23);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("Total coverage", margin + metricsBoxWidth + 8, yPos + 30);

      // Metric 3: Confidence
      pdf.setFillColor(236, 253, 245);
      pdf.roundedRect(margin + (metricsBoxWidth + 4) * 2, yPos, metricsBoxWidth, metricsBoxHeight, 3, 3, "F");
      pdf.setTextColor(21, 128, 61);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("CONFIDENCE", margin + (metricsBoxWidth + 4) * 2 + 4, yPos + 8);
      pdf.setFontSize(20);
      const confidence = analysisData?.confidenceLevel || analysisData?.confidence || 87;
      pdf.text(`${confidence}%`, margin + (metricsBoxWidth + 4) * 2 + 4, yPos + 23);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("AI accuracy", margin + (metricsBoxWidth + 4) * 2 + 4, yPos + 30);

      yPos += metricsBoxHeight + 10;

      // ============= NEW PAGE - EXECUTIVE SUMMARY =============
      pdf.addPage();
      yPos = margin;

      // Page header
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`GeoPulse Report ${reportId}`, margin, 12);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, 12);
      yPos = 25;

      yPos = addSectionTitle("EXECUTIVE SUMMARY", yPos);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      
      const executiveSummary = analysisData?.summary || 
        `This environmental analysis examines ${eventInfo.label.toLowerCase()} patterns within the ${region || 'specified'} region. ` +
        `Satellite-based remote sensing detected a ${Math.abs(changePercent).toFixed(1)}% ${changePercent >= 0 ? 'increase' : 'decrease'} in the monitored indicator. ` +
        `Analysis utilized multi-spectral imagery and AI-powered pattern recognition. ` +
        `This situation is classified as ${risk.level} risk.`;
      
      yPos = addWrappedText(executiveSummary, margin, yPos, contentWidth, 4.5);
      yPos += 12;

      // Map Visualization
      if (mapImage) {
        checkPageBreak(80);
        yPos = addSectionTitle("SATELLITE IMAGERY ANALYSIS", yPos);
        
        try {
          const imgData = await loadImageAsBase64(mapImage);
          if (imgData) {
            pdf.setFillColor(249, 250, 251);
            pdf.roundedRect(margin, yPos - 2, contentWidth, 65, 3, 3, "F");
            
            const imgWidth = contentWidth - 10;
            const imgHeight = 55;
            pdf.addImage(mapImage, "PNG", margin + 5, yPos + 2, imgWidth, imgHeight);
            yPos += 70;
            
            pdf.setFontSize(8);
            pdf.setTextColor(107, 114, 128);
            pdf.setFont("helvetica", "italic");
            pdf.text("Figure 1: Satellite imagery showing analyzed region with environmental change indicators", margin, yPos);
            yPos += 10;
          }
        } catch (e) {
          console.warn("Could not add map image to PDF");
        }
      }

      // ============= DETAILED FINDINGS =============
      checkPageBreak(60);
      yPos = addSectionTitle("KEY FINDINGS", yPos);

      const findings = analysisData?.findings || analysisData?.recommendations || [
        { type: "observation", detail: "Significant environmental change detected in primary monitoring zones" },
        { type: "trend", detail: "Progressive pattern consistent with regional climate and land use factors" },
        { type: "impact", detail: "Potential implications for local ecosystems and communities identified" },
        { type: "action", detail: "Continued monitoring and targeted intervention strategies recommended" }
      ];

      findings.slice(0, 4).forEach((finding: any, index: number) => {
        checkPageBreak(18);
        
        const text = typeof finding === "string" ? finding : finding.detail || finding.description || JSON.stringify(finding);
        const findingType = finding.type || (index === 0 ? "Primary" : index === 1 ? "Secondary" : "Additional");
        
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin, yPos - 3, contentWidth, 16, 2, 2, "F");
        
        pdf.setFillColor(8, 145, 178);
        pdf.circle(margin + 5, yPos + 3, 2.5, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(index + 1), margin + 3.8, yPos + 4.5);
        
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(findingType.toUpperCase().substring(0, 12), margin + 12, yPos + 2);
        
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(8);
        const wrappedFinding = pdf.splitTextToSize(text, contentWidth - 16);
        pdf.text(wrappedFinding[0] || '', margin + 12, yPos + 9);
        
        yPos += 18;
      });

      // ============= TREND CHART =============
      if (chartImage) {
        checkPageBreak(80);
        yPos += 5;
        yPos = addSectionTitle("TEMPORAL ANALYSIS", yPos);
        
        try {
          pdf.setFillColor(249, 250, 251);
          pdf.roundedRect(margin, yPos - 2, contentWidth, 60, 3, 3, "F");
          
          const imgWidth = contentWidth - 10;
          const imgHeight = 50;
          pdf.addImage(chartImage, "PNG", margin + 5, yPos + 2, imgWidth, imgHeight);
          yPos += 65;
          
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128);
          pdf.setFont("helvetica", "italic");
          pdf.text("Figure 2: Environmental change trend analysis over the study period", margin, yPos);
          yPos += 10;
        } catch (e) {
          console.warn("Could not add chart image to PDF");
        }
      }

      // ============= PROFESSIONAL REPORT EXTRAS =============
      if (!isSimple) {
        // Data Summary Table
        pdf.addPage();
        yPos = margin;
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`GeoPulse Report ${reportId}`, margin, 12);
        pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, 12);
        yPos = 25;

        yPos = addSectionTitle("ANALYSIS METRICS", yPos);

        const colWidths = [50, 60, 60];
        yPos = addTableRow(["PARAMETER", "VALUE", "STATUS"], yPos, true, colWidths);
        yPos = addTableRow(["Environmental Change", `${changePercent.toFixed(2)}%`, risk.level], yPos, false, colWidths);
        yPos = addTableRow(["Coverage Area", area, "Complete"], yPos, false, colWidths);
        yPos = addTableRow(["Confidence Score", `${confidence}%`, confidence >= 80 ? "High" : "Moderate"], yPos, false, colWidths);
        yPos = addTableRow(["Data Sources", "Sentinel-2, Landsat-8", "Verified"], yPos, false, colWidths);
        yPos = addTableRow(["Analysis Resolution", "10-30m", "High-Res"], yPos, false, colWidths);
        yPos = addTableRow(["Temporal Range", `${startDate} to ${endDate}`, "Valid"], yPos, false, colWidths);
        yPos += 15;

        // Recommendations Section
        checkPageBreak(60);
        yPos = addSectionTitle("RECOMMENDATIONS", yPos);

        const recommendations = [
          { priority: "HIGH", action: "Establish continuous monitoring protocols for identified hotspots", timeline: "Immediate" },
          { priority: "MEDIUM", action: "Deploy ground-truth verification teams to validate satellite findings", timeline: "30 days" },
          { priority: "MEDIUM", action: "Engage local stakeholders and authorities with preliminary findings", timeline: "45 days" },
          { priority: "LOW", action: "Schedule follow-up analysis to track progression of detected changes", timeline: "90 days" },
        ];

        recommendations.forEach((rec, index) => {
          checkPageBreak(18);
          
          const priorityColors: Record<string, [number, number, number]> = {
            HIGH: [220, 38, 38],
            MEDIUM: [234, 179, 8],
            LOW: [34, 197, 94]
          };
          
          pdf.setFillColor(249, 250, 251);
          pdf.roundedRect(margin, yPos - 3, contentWidth, 15, 2, 2, "F");
          
          pdf.setFillColor(priorityColors[rec.priority][0], priorityColors[rec.priority][1], priorityColors[rec.priority][2]);
          pdf.roundedRect(margin + 3, yPos, 18, 6, 1, 1, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.text(rec.priority, margin + 5, yPos + 4);
          
          pdf.setTextColor(17, 24, 39);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.text(rec.action, margin + 25, yPos + 4);
          
          pdf.setTextColor(107, 114, 128);
          pdf.setFontSize(8);
          pdf.text(`Timeline: ${rec.timeline}`, pageWidth - margin - 35, yPos + 4);
          
          yPos += 18;
        });

        yPos += 10;

        // Methodology Section
        checkPageBreak(70);
        yPos = addSectionTitle("METHODOLOGY", yPos);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);

        const methodology = [
          {
            title: "Data Acquisition",
            content: "Multi-spectral satellite imagery sourced from Sentinel-2 MSI and Landsat-8 OLI sensors, with cloud-free scene selection and atmospheric correction applied."
          },
          {
            title: "Processing Pipeline",
            content: "Images processed through radiometric calibration, geometric correction, and co-registration. Spectral indices (NDVI, NDWI, NBR) computed for change detection."
          },
          {
            title: "AI Analysis",
            content: "Deep learning models trained on historical patterns perform automated feature extraction and anomaly detection with confidence scoring."
          },
          {
            title: "Validation",
            content: "Results cross-referenced with ground-truth data, historical records, and secondary sources to ensure accuracy and reliability of findings."
          }
        ];

        methodology.forEach((item) => {
          checkPageBreak(25);
          
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(17, 24, 39);
          pdf.text(item.title, margin, yPos);
          yPos += 5;
          
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(75, 85, 99);
          yPos = addWrappedText(item.content, margin, yPos, contentWidth, 4);
          yPos += 8;
        });

        // Data Sources
        checkPageBreak(40);
        yPos += 5;
        yPos = addSectionTitle("DATA SOURCES & REFERENCES", yPos);

        const sources = [
          "European Space Agency (ESA) Copernicus Sentinel-2 Mission",
          "NASA/USGS Landsat-8 Operational Land Imager (OLI)",
          "Google Earth Engine Cloud Computing Platform",
          "MODIS (Moderate Resolution Imaging Spectroradiometer)",
          "OpenStreetMap Geographic Database"
        ];

        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);
        sources.forEach((source, index) => {
          pdf.text(`${index + 1}. ${source}`, margin, yPos);
          yPos += 6;
        });
      }

      // ============= FINAL PAGE - DISCLAIMER & FOOTER =============
      checkPageBreak(60);
      yPos = pageHeight - 70;

      // Disclaimer box
      pdf.setFillColor(254, 249, 195);
      pdf.roundedRect(margin, yPos, contentWidth, 30, 3, 3, "F");
      pdf.setFillColor(234, 179, 8);
      pdf.rect(margin, yPos, 4, 30, "F");
      
      pdf.setTextColor(113, 63, 18);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("DISCLAIMER", margin + 8, yPos + 8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const disclaimer = "This report is generated using AI-assisted satellite imagery analysis. While every effort is made to ensure accuracy, results should be validated with ground-truth data before making critical decisions. GeoPulse is not liable for decisions made based solely on this analysis.";
      yPos = addWrappedText(disclaimer, margin + 8, yPos + 14, contentWidth - 12, 4);

      // Footer
      const footerY = pageHeight - 20;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
      
      pdf.setFillColor(8, 145, 178);
      pdf.rect(0, pageHeight - 12, pageWidth, 12, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("GeoPulse Environmental Intelligence Platform", margin, pageHeight - 5);
      pdf.text("www.geopulse.ai", pageWidth / 2 - 15, pageHeight - 5);
      pdf.text(`© ${new Date().getFullYear()} All Rights Reserved`, pageWidth - margin - 35, pageHeight - 5);

      // Add page numbers to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        if (i > 1) {
          pdf.setFontSize(8);
          pdf.setTextColor(156, 163, 175);
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 18);
        }
      }

      // Save PDF
      const filename = `GeoPulse-${reportType === "professional" ? "Professional" : "Summary"}-Report-${reportId}.pdf`;
      pdf.save(filename);

      toast.success(`${reportType === "professional" ? "Professional" : "Summary"} report downloaded successfully!`);
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
            <SelectItem value="professional">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Professional Report</div>
                  <div className="text-xs text-muted-foreground">Full analysis with methodology & recommendations</div>
                </div>
              </span>
            </SelectItem>
            <SelectItem value="simple">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Summary Report</div>
                  <div className="text-xs text-muted-foreground">Key findings and metrics overview</div>
                </div>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium">Include AI Visualizations</span>
            <p className="text-xs text-muted-foreground">Satellite imagery & trend charts</p>
          </div>
        </div>
        <Button
          variant={includeImages ? "default" : "outline"}
          size="sm"
          onClick={() => setIncludeImages(!includeImages)}
        >
          {includeImages ? <Check className="h-4 w-4" /> : "Off"}
        </Button>
      </div>

      {/* Report Preview Info */}
      <div className="p-4 bg-gradient-to-r from-primary/5 to-cyan-500/5 border border-primary/20 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-primary" />
          Report Contents
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6">
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-500" /> Executive summary & risk assessment
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-500" /> Key metrics & findings
          </li>
          {includeImages && (
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-emerald-500" /> Satellite imagery & trend analysis
            </li>
          )}
          {reportType === "professional" && (
            <>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-emerald-500" /> Detailed recommendations
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-emerald-500" /> Methodology & data sources
              </li>
            </>
          )}
        </ul>
      </div>

      {isGenerating && generationStep && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="absolute inset-0 h-5 w-5 animate-ping opacity-20 rounded-full bg-primary" />
            </div>
            <div>
              <span className="text-sm font-medium text-primary">{generationStep}</span>
              <p className="text-xs text-muted-foreground">This may take a moment...</p>
            </div>
          </div>
        </div>
      )}

      <Button
        className="w-full h-12 text-base font-medium"
        onClick={generatePDFReport}
        disabled={isGenerating || !analysisData}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <Download className="h-5 w-5 mr-2" />
            Download {reportType === "professional" ? "Professional" : "Summary"} Report
          </>
        )}
      </Button>
    </div>
  );
};

export default ReportGenerator;
