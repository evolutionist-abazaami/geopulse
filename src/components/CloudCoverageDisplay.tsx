import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Cloud, CloudOff, CloudRain, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface CloudCoverageDisplayProps {
  cloudCoverage?: number; // 0-100 percentage
  dataQuality?: number; // 0-100 quality score
  analysisConfidence?: number; // 0-100 confidence
  sensorType?: string;
  acquisitionDate?: string;
}

const CloudCoverageDisplay = ({
  cloudCoverage = 0,
  dataQuality = 90,
  analysisConfidence = 87,
  sensorType = "Sentinel-2 MSI",
  acquisitionDate
}: CloudCoverageDisplayProps) => {
  const isUsable = cloudCoverage <= 20 && dataQuality >= 70;
  const isAccurate = analysisConfidence >= 90;

  const getCloudIcon = () => {
    if (cloudCoverage <= 10) return <CloudOff className="h-4 w-4 text-emerald-500" />;
    if (cloudCoverage <= 30) return <Cloud className="h-4 w-4 text-amber-500" />;
    return <CloudRain className="h-4 w-4 text-destructive" />;
  };

  const getCloudStatus = () => {
    if (cloudCoverage <= 10) return { label: "Clear", color: "bg-emerald-500" };
    if (cloudCoverage <= 20) return { label: "Minimal", color: "bg-emerald-400" };
    if (cloudCoverage <= 30) return { label: "Low", color: "bg-amber-400" };
    if (cloudCoverage <= 50) return { label: "Moderate", color: "bg-amber-500" };
    return { label: "High", color: "bg-destructive" };
  };

  const getQualityStatus = () => {
    if (dataQuality >= 90) return { label: "Excellent", color: "text-emerald-500" };
    if (dataQuality >= 80) return { label: "Good", color: "text-emerald-400" };
    if (dataQuality >= 70) return { label: "Acceptable", color: "text-amber-500" };
    if (dataQuality >= 50) return { label: "Low", color: "text-amber-600" };
    return { label: "Poor", color: "text-destructive" };
  };

  const cloudStatus = getCloudStatus();
  const qualityStatus = getQualityStatus();

  return (
    <TooltipProvider>
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Data Quality Metrics
          </span>
          {isUsable ? (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Usable
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Limited
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Cloud Coverage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {getCloudIcon()}
                    Cloud Cover
                  </span>
                  <span className="font-medium">{cloudCoverage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={100 - cloudCoverage} 
                  className="h-1.5" 
                />
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {cloudStatus.label}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Cloud coverage affects visibility. &lt;20% recommended for accurate analysis.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Data Quality */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Data Quality</span>
                  <span className={`font-medium ${qualityStatus.color}`}>{dataQuality}%</span>
                </div>
                <Progress 
                  value={dataQuality} 
                  className="h-1.5" 
                />
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {qualityStatus.label}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Overall data quality including radiometric and geometric accuracy.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Analysis Confidence */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Analysis Confidence</span>
            <div className="flex items-center gap-2">
              {isAccurate ? (
                <Badge className="bg-emerald-500 text-[10px] px-1.5 py-0">
                  ≥90% Accuracy
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {analysisConfidence}% Confidence
                </Badge>
              )}
            </div>
          </div>
          <div className="relative">
            <Progress value={analysisConfidence} className="h-2" />
            <div 
              className="absolute top-0 h-2 w-0.5 bg-primary/50"
              style={{ left: '90%' }}
              title="90% threshold"
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className="text-primary">90% threshold</span>
            <span>100%</span>
          </div>
        </div>

        {/* Sensor Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Sensor: {sensorType}</span>
          {acquisitionDate && <span>{acquisitionDate}</span>}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CloudCoverageDisplay;
