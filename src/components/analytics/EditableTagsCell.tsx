import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Predefined tag suggestions
const PREDEFINED_TAGS = [
  "Callback",
  "Comunicare",
  "Conectare",
  "Eveniment",
  "Informații",
  "Inițiere",
  "Interesat",
  "Invitație",
  "Necesară clarificare",
  "Preliminarii",
  "Prezentare",
  "Promovare",
  "Reclamație",
  "Refuz",
  "Suport",
  "Început",
  "Întrerupt",
  "Întreruptă",
];

interface EditableTagsCellProps {
  tags: string[];
  callId: string;
  customAnalysisData: Record<string, any> | string | null;
}

export const EditableTagsCell: React.FC<EditableTagsCellProps> = ({
  tags: initialTags,
  callId,
  customAnalysisData,
}) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update local state when props change
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const saveTags = async (newTags: string[]) => {
    setIsSaving(true);
    try {
      // Parse existing custom_analysis_data or create new object
      let analysisData: Record<string, any> = {};
      if (customAnalysisData) {
        try {
          // Handle both string and object formats
          if (typeof customAnalysisData === 'string') {
            analysisData = JSON.parse(customAnalysisData);
          } else {
            analysisData = customAnalysisData as unknown as Record<string, any>;
          }
        } catch {
          analysisData = {};
        }
      }

      // Update tags in the analysis data
      analysisData.taguri = newTags;

      // Save to database
      const { error } = await supabase
        .from("call_history")
        .update({
          custom_analysis_data: analysisData,
        })
        .eq("id", callId);

      if (error) throw error;

      setTags(newTags);
      
      // Invalidate queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ["call-history"] });
    } catch (error: any) {
      console.error("Error saving tags:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut salva tag-urile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newTags = tags.filter((t) => t !== tagToRemove);
    await saveTags(newTags);
  };

  const handleToggleTag = async (tag: string) => {
    const newTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    await saveTags(newTags);
  };

  const handleAddCustomTag = async () => {
    if (!customTag.trim()) return;
    if (tags.includes(customTag.trim())) {
      setCustomTag("");
      return;
    }
    const newTags = [...tags, customTag.trim()];
    await saveTags(newTags);
    setCustomTag("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Display all tags on single line, truncated if needed */}
      {tags.map((tag, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className="text-xs px-1.5 py-0 whitespace-nowrap flex-shrink-0 flex items-center gap-0.5 group/tag hover:bg-muted"
        >
          {tag}
          <button
            onClick={(e) => handleRemoveTag(tag, e)}
            className="ml-0.5 opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity"
            disabled={isSaving}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}

      {/* Add tag button with popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-3" 
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Tag className="h-4 w-4" />
              Editează Tag-uri
            </div>

            {/* Custom tag input */}
            <div className="flex gap-2">
              <Input
                placeholder="Tag personalizat..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                disabled={isSaving}
              />
              <Button
                size="sm"
                className="h-8 px-2"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim() || isSaving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Predefined tags */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {PREDEFINED_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={tags.includes(tag)}
                    onCheckedChange={() => handleToggleTag(tag)}
                    disabled={isSaving}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))}
            </div>

            {/* Current tags */}
            {tags.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Tag-uri active:</div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={(e) => handleRemoveTag(tag, e)}
                        className="hover:text-destructive"
                        disabled={isSaving}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Show placeholder if no tags */}
      {tags.length === 0 && !isOpen && (
        <span className="text-muted-foreground text-xs">-</span>
      )}
    </div>
  );
};
