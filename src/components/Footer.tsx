const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 px-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm text-muted-foreground">
            Developed by <span className="font-semibold text-foreground">Malex Abazaami Ayitinya</span> under the supervision of <span className="font-semibold text-foreground">Prof. Ing Amos T. Kabo-bah</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              GeoPulse v1.0.0
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Department of Civil Engineering</span>
            <span className="hidden sm:inline">•</span>
            <span>KNUST, Ghana</span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            © {currentYear} GeoPulse. AI-Powered Geospatial Intelligence for Africa.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
