import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check } from "lucide-react";
import type { Category } from "@shared/schema";

const MIN_INTERESTS = 1;
const MAX_INTERESTS = 5;

interface InterestsModalProps {
  isOpen: boolean;
  initialSelection?: string[] | null;
  onClose?: () => void; // when omitted, the modal is mandatory (onboarding)
}

export default function InterestsModal({ isOpen, initialSelection, onClose }: InterestsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(initialSelection ?? []);

  useEffect(() => {
    if (isOpen) setSelected(initialSelection ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const { data: categories = [], isLoading, isError, refetch } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const topLevel = categories.filter((c) => !c.parentId);

  const saveInterests = useMutation({
    mutationFn: async (categoryIds: string[]) => {
      await apiRequest("PUT", "/api/auth/user/interests", { categoryIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Interests saved",
        description: "You'll get daily market updates for your selected categories on Telegram.",
      });
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_INTERESTS) {
        toast({
          title: `Maximum ${MAX_INTERESTS} categories`,
          description: "Unselect one before adding another.",
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const mandatory = !onClose;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        className={`max-w-md mx-auto flex flex-col gap-3 p-4 max-h-[90vh] ${mandatory ? "[&>button]:hidden" : ""}`}
        onInteractOutside={(e) => mandatory && e.preventDefault()}
        onEscapeKeyDown={(e) => mandatory && e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center">Pick Your Interests</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Choose {MIN_INTERESTS}–{MAX_INTERESTS} categories. We'll send you daily market price
            updates on Telegram for the categories you pick.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-shrink-0 text-center">
          <Badge variant={selected.length > 0 ? "default" : "secondary"} data-testid="badge-interests-count">
            {selected.length} / {MAX_INTERESTS} selected
          </Badge>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Couldn't load categories.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-categories">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {topLevel.map((cat) => {
                const isSelected = selected.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className={`flex items-center justify-between rounded-md border p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:bg-muted/50"
                    }`}
                    data-testid={`button-interest-${cat.id}`}
                  >
                    <span className="flex-1 pr-1">{cat.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 space-y-2">
          <Button
            className="w-full"
            disabled={selected.length < MIN_INTERESTS || saveInterests.isPending}
            onClick={() => saveInterests.mutate(selected)}
            data-testid="button-save-interests"
          >
            {saveInterests.isPending
              ? "Saving..."
              : selected.length < MIN_INTERESTS
                ? `Select at least ${MIN_INTERESTS} category`
                : "Save Interests"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
