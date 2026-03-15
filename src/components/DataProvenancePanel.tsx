import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Database, Brain, ChevronDown, Info, ShieldCheck } from "lucide-react";

interface DataProvenancePanelProps {
  results: any;
  eventType: string;
}

const DataProvenancePanel = ({ results, eventType }: DataProvenancePanelProps) => {
  const confidence = results?.analysisConfidence || 0;
  const dataSources = results?.dataSources || [];
  const cloudCoverage = results?.cloudCoverage?.percentage || 0;
  const dataQuality = results?.dataQuality?.overall_score || 0;

  return (
    <div className="space-y-3">
      {/* Authenticity Disclaimer */}
      <Card className="p-3 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-medium text-amber-600 dark:text-amber-400">Data Authenticity Notice</p>
            <p className="text-muted-foreground leading-relaxed">
              Analysis percentages are AI-estimated based on spectral index calculations from Landsat 8/9 OLI imagery. 
              Values represent modeled approximations, not ground-truth measurements. For critical decisions, 
              cross-validate with in-situ field data and official government reports.
            </p>
          </div>
        </div>
      </Card>

      {/* Data Sources */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Data Sources & Methodology</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <Card className="p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Primary Data Sources</p>
              <div className="flex flex-wrap gap-1">
                {dataSources.length > 0 ? dataSources.map((src: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{src}</Badge>
                )) : (
                  <>
                    <Badge variant="outline" className="text-xs">Landsat 8 OLI</Badge>
                    <Badge variant="outline" className="text-xs">Landsat 9 OLI</Badge>
                  </>
                )}
                <Badge variant="outline" className="text-xs">Open-Meteo API</Badge>
                <Badge variant="outline" className="text-xs">Google Gemini AI</Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Analysis Pipeline</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Satellite imagery acquisition (Landsat 8/9, 30m resolution)</li>
                <li>Atmospheric correction & cloud masking (QA band)</li>
                <li>Spectral index computation (NDVI, NDWI, NBR, NDBI)</li>
                <li>AI-powered change detection & interpretation (Gemini 2.5 Flash)</li>
                <li>Statistical aggregation & confidence scoring</li>
              </ol>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Quality Metrics</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className={`text-sm font-bold ${confidence >= 80 ? 'text-green-500' : confidence >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                    {confidence}%
                  </p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Cloud Cover</p>
                  <p className={`text-sm font-bold ${cloudCoverage <= 20 ? 'text-green-500' : cloudCoverage <= 50 ? 'text-amber-500' : 'text-destructive'}`}>
                    {cloudCoverage}%
                  </p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Data Quality</p>
                  <p className={`text-sm font-bold ${dataQuality >= 80 ? 'text-green-500' : dataQuality >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                    {dataQuality}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2 bg-primary/5 rounded text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Info className="h-3 w-3" />
                <span className="font-medium">Limitations</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>30m spatial resolution may miss small-scale changes</li>
                <li>Cloud cover can obscure observations in certain periods</li>
                <li>AI interpretations are probabilistic, not deterministic</li>
                <li>Temporal gaps between satellite passes (16-day revisit)</li>
              </ul>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Model Explainability */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">How the Model Works</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card className="p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                <div>
                  <p className="text-xs font-medium">Data Ingestion</p>
                  <p className="text-[10px] text-muted-foreground">Landsat multispectral bands (B2-B7) are fetched for the selected region and time period</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                <div>
                  <p className="text-xs font-medium">Spectral Analysis</p>
                  <p className="text-[10px] text-muted-foreground">
                    {eventType === 'deforestation' || eventType === 'vegetation_loss' 
                      ? 'NDVI (NIR-Red)/(NIR+Red) measures vegetation health. Values <0.2 indicate bare soil; >0.6 indicates dense vegetation.'
                      : eventType === 'flood' || eventType === 'water_scarcity'
                      ? 'NDWI (Green-NIR)/(Green+NIR) detects water bodies. Positive values indicate water presence.'
                      : eventType === 'wildfire' || eventType === 'bushfire'
                      ? 'NBR (NIR-SWIR2)/(NIR+SWIR2) assesses burn severity. Lower values indicate more severe burns.'
                      : 'Multiple spectral indices (NDVI, NDWI, NBR, NDBI) are computed for comprehensive environmental assessment.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                <div>
                  <p className="text-xs font-medium">AI Interpretation</p>
                  <p className="text-[10px] text-muted-foreground">Google Gemini 2.5 Flash analyzes spectral data patterns, compares temporal changes, and generates human-readable assessments with confidence scores</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</div>
                <div>
                  <p className="text-xs font-medium">Change Detection</p>
                  <p className="text-[10px] text-muted-foreground">Image differencing between start and end dates quantifies change magnitude. Post-classification comparison identifies transition types.</p>
                </div>
              </div>
            </div>

            <div className="p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-1 mb-1">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">Validation Approach</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Results include confidence intervals and are cross-referenced against known environmental baselines. 
                For peer-reviewed accuracy, compare with USGS Earth Explorer data or ESA Copernicus products.
              </p>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DataProvenancePanel;
