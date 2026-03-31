import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save } from "lucide-react";

const SETTING_DESCRIPTIONS: Record<string, { label: string; description: string; suffix?: string }> = {
  interest_rate: { label: "Tasa de interés mensual", description: "Porcentaje de interés simple mensual aplicado a todos los préstamos nuevos", suffix: "%" },
  max_loan_amount: { label: "Monto máximo de préstamo", description: "Monto máximo permitido por préstamo en pesos colombianos (COP)", suffix: "COP" },
  min_loan_amount: { label: "Monto mínimo de préstamo", description: "Monto mínimo permitido por préstamo en pesos colombianos (COP)", suffix: "COP" },
  default_term_months: { label: "Plazo predeterminado", description: "Número de meses por defecto para nuevos préstamos", suffix: "meses" },
  penalty_rate: { label: "Tasa de recargo por mora", description: "Porcentaje de recargo aplicado sobre la cuota vencida", suffix: "%" },
};

export default function Settings() {
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: settings = [], isLoading } = trpc.settings.list.useQuery();

  const updateSetting = trpc.settings.update.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Configuración actualizada");
      utils.settings.list.invalidate();
      setEditValues(prev => { const next = { ...prev }; delete next[vars.key]; return next; });
      setSaving(null);
    },
    onError: (e) => { toast.error(e.message); setSaving(null); },
  });

  const handleSave = (key: string) => {
    const value = editValues[key];
    if (!value) return;
    setSaving(key);
    updateSetting.mutate({ key, value });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground text-sm mt-1">Parámetros del sistema de préstamos</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>
        ) : (
          <div className="space-y-4">
            {settings.map(setting => {
              const meta = SETTING_DESCRIPTIONS[setting.key];
              const isEditing = editValues[setting.key] !== undefined;
              const currentValue = isEditing ? editValues[setting.key] : setting.value;

              return (
                <Card key={setting.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                      {meta?.label ?? setting.key}
                    </CardTitle>
                    {meta?.description && (
                      <CardDescription className="text-xs">{meta.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">Valor actual</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={currentValue}
                            onChange={e => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            className="max-w-xs"
                          />
                          {meta?.suffix && (
                            <span className="text-sm text-muted-foreground">{meta.suffix}</span>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(setting.key)}
                          disabled={saving === setting.key}
                        >
                          <Save className="mr-2 h-3.5 w-3.5" />
                          {saving === setting.key ? "Guardando..." : "Guardar"}
                        </Button>
                      )}
                    </div>
                    {setting.updatedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Última actualización: {new Date(setting.updatedAt).toLocaleString("es-CO")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {settings.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No hay configuraciones disponibles. Contacte al administrador del sistema.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
