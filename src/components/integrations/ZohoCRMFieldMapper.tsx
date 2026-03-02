import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Settings, Plus, Trash2 } from "lucide-react";

interface FieldMapping {
  agentauto_field: string;
  zoho_field: string;
}

const AGENTAUTO_CALL_FIELDS = [
  { value: 'phone_number', label: 'Număr telefon' },
  { value: 'duration', label: 'Durată apel' },
  { value: 'status', label: 'Status apel' },
  { value: 'cost', label: 'Cost' },
  { value: 'created_at', label: 'Data apel' },
  { value: 'agent_name', label: 'Agent nume' },
];

const ZOHO_ACTIVITY_FIELDS = [
  { value: 'Subject', label: 'Subject' },
  { value: 'Call_Duration', label: 'Call Duration' },
  { value: 'Call_Type', label: 'Call Type' },
  { value: 'Call_Start_Time', label: 'Call Start Time' },
  { value: 'Description', label: 'Description' },
  { value: 'Call_Purpose', label: 'Call Purpose' },
];

export function ZohoCRMFieldMapper() {
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { agentauto_field: 'phone_number', zoho_field: 'Subject' },
    { agentauto_field: 'duration', zoho_field: 'Call_Duration' },
    { agentauto_field: 'created_at', zoho_field: 'Call_Start_Time' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('zoho_crm_connections')
        .select('field_mappings')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.field_mappings) {
        // Safe conversion from Json to FieldMapping[]
        const parsedMappings = Array.isArray(data.field_mappings) 
          ? data.field_mappings as unknown as FieldMapping[]
          : [];
        setMappings(parsedMappings);
      }
    } catch (error) {
      console.error('Load mappings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMappings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Trebuie să fii autentificat");
        return;
      }

      const { error } = await supabase
        .from('zoho_crm_connections')
        .update({ field_mappings: mappings as unknown as any })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Mapările au fost salvate cu succes");
    } catch (error) {
      console.error('Save mappings error:', error);
      toast.error("Eroare la salvarea mapărilor");
    } finally {
      setIsSaving(false);
    }
  };

  const updateMapping = (index: number, field: 'agentauto_field' | 'zoho_field', value: string) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const addMapping = () => {
    setMappings([...mappings, { agentauto_field: '', zoho_field: '' }]);
  };

  const removeMapping = (index: number) => {
    if (mappings.length > 1) {
      setMappings(mappings.filter((_, i) => i !== index));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Mapare câmpuri</CardTitle>
            <CardDescription>
              Configurează cum se mapează datele dintre Agentauto și Zoho CRM
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Row */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_auto] gap-4 items-center text-sm font-medium text-muted-foreground px-1">
          <span>Câmp Agentauto</span>
          <span className="w-8"></span>
          <span>Câmp Zoho CRM</span>
          <span className="w-10"></span>
        </div>

        {/* Mapping Rows */}
        <div className="space-y-4">
          {mappings.map((mapping, index) => (
            <div key={index} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr_auto] gap-3 sm:gap-4 items-start sm:items-center p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="w-full space-y-1.5">
                <Label className="text-xs text-muted-foreground sm:hidden">Câmp Agentauto</Label>
                <Select
                  value={mapping.agentauto_field}
                  onValueChange={(value) => updateMapping(index, 'agentauto_field', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selectează câmp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENTAUTO_CALL_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center justify-center w-8 h-10">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="w-full space-y-1.5">
                <Label className="text-xs text-muted-foreground sm:hidden">Câmp Zoho CRM</Label>
                <Select
                  value={mapping.zoho_field}
                  onValueChange={(value) => updateMapping(index, 'zoho_field', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selectează câmp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ZOHO_ACTIVITY_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMapping(index)}
                disabled={mappings.length <= 1}
                className="h-10 w-10 text-muted-foreground hover:text-destructive self-end sm:self-center"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" onClick={addMapping} className="gap-2">
            <Plus className="h-4 w-4" />
            Adaugă mapare
          </Button>
          <Button onClick={handleSaveMappings} disabled={isSaving} className="sm:ml-auto gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvare...
              </>
            ) : (
              "Salvează mapările"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
