import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logoPath from "@/assets/biret-tera-logo.png";

interface WelcomeModalProps {
  isOpen: boolean;
  onEnter: () => void;
}

export default function WelcomeModal({ isOpen, onEnter }: WelcomeModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-w-md mx-auto account-type-dialog flex flex-col gap-0 p-0 overflow-hidden [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-primary text-primary-foreground px-6 pt-6 pb-5 text-center flex-shrink-0">
          <img
            src={logoPath}
            alt="Biret Tera logo"
            className="w-24 h-24 mx-auto mb-3 rounded-full bg-white p-1 shadow-md"
            data-testid="img-welcome-logo"
          />
          <h1 className="text-2xl font-bold tracking-wide">Biret Tera</h1>
          <p className="text-sm opacity-90">ብረት ተራ</p>
        </div>

        <div className="px-6 py-5 text-center space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <DialogTitle className="text-lg font-semibold">
              Welcome to Biret Tera
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Ethiopia&apos;s Premium Steel and Construction Materials Marketplace
            </DialogDescription>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-1">
            <p className="text-lg font-semibold" data-testid="text-welcome-amharic">
              እንኳን ወደ ብረት ተራ በደህና መጡ
            </p>
            <p className="text-sm text-muted-foreground">
              የኢትዮጵያ ቀዳሚ የብረት እና የግንባታ እቃዎች ገበያ
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex-shrink-0">
          <Button
            className="w-full text-base font-semibold"
            size="lg"
            onClick={onEnter}
            data-testid="button-welcome-enter"
          >
            Enter · ግባ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
