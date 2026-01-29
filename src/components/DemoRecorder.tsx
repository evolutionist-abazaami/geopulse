import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Video, Square, Download, Circle, Monitor, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type RecordingState = "idle" | "recording" | "paused" | "stopped";

const DemoRecorder = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingType, setRecordingType] = useState<"screen" | "tab">("tab");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      setRecordedBlob(null);

      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: recordingType === "tab" ? "browser" : "monitor",
          frameRate: 30,
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      streamRef.current = stream;

      // Check for audio track availability
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast({
          title: "Audio not captured",
          description: "Recording video only. Enable 'Share audio' for sound.",
          variant: "default",
        });
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
        setRecordingState("stopped");
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (recordingState === "recording") {
          stopRecording();
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState("recording");
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Your screen is now being recorded.",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not start screen recording. Please try again.",
        variant: "destructive",
      });
    }
  }, [recordingType, toast, recordingState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      toast({
        title: "Recording stopped",
        description: "Your demo video is ready to download.",
      });
    }
  }, [recordingState, toast]);

  const downloadRecording = useCallback(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GeoPulse-Demo-${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your demo video is being downloaded.",
      });
    }
  }, [recordedBlob, toast]);

  const resetRecording = useCallback(() => {
    setRecordingState("idle");
    setRecordingTime(0);
    setRecordedBlob(null);
    chunksRef.current = [];
  }, []);

  const getFileSizeString = (blob: Blob) => {
    const bytes = blob.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-24 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-background/95 backdrop-blur border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            >
              {recordingState === "recording" ? (
                <Circle className="h-5 w-5 fill-destructive text-destructive animate-pulse" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Record Demo Video</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Demo Video Recorder
          </DialogTitle>
          <DialogDescription>
            Capture your GeoPulse interactions for presentations and demos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recording Type Selection */}
          {recordingState === "idle" && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Recording Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={recordingType === "tab" ? "default" : "outline"}
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => setRecordingType("tab")}
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">Browser Tab</span>
                </Button>
                <Button
                  variant={recordingType === "screen" ? "default" : "outline"}
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => setRecordingType("screen")}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs">Full Screen</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {recordingType === "tab"
                  ? "Record only the GeoPulse browser tab for focused demos."
                  : "Record your entire screen including other applications."}
              </p>
            </div>
          )}

          {/* Recording Status */}
          {recordingState === "recording" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-3">
                  <Circle className="h-4 w-4 fill-destructive text-destructive animate-pulse" />
                  <span className="font-medium text-destructive">
                    Recording in progress
                  </span>
                </div>
                <span className="font-mono text-lg font-bold">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <Progress value={(recordingTime % 60) * 1.67} className="h-1" />
              <p className="text-xs text-muted-foreground text-center">
                Tip: Navigate through GeoPulse features to create a comprehensive demo.
              </p>
            </div>
          )}

          {/* Recording Complete */}
          {recordingState === "stopped" && recordedBlob && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-primary">
                        Recording complete!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {formatTime(recordingTime)} • Size: {getFileSizeString(recordedBlob)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Preview */}
              <div className="rounded-lg overflow-hidden border bg-muted/30">
                <video
                  src={URL.createObjectURL(recordedBlob)}
                  controls
                  className="w-full max-h-48 object-contain"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {recordingState === "idle" && (
              <Button onClick={startRecording} className="flex-1 gap-2">
                <Circle className="h-4 w-4" />
                Start Recording
              </Button>
            )}

            {recordingState === "recording" && (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}

            {recordingState === "stopped" && (
              <>
                <Button onClick={downloadRecording} className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button onClick={resetRecording} variant="outline" className="gap-2">
                  <Video className="h-4 w-4" />
                  New Recording
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          {recordingState === "idle" && (
            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">Recording Tips:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Enable "Share audio" for narration capture</li>
                <li>Use Browser Tab mode for cleaner demos</li>
                <li>Close this dialog after starting to record</li>
                <li>Recordings save as WebM (compatible with most players)</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoRecorder;
