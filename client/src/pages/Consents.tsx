import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDateTime, CONSENT_TYPE_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, CheckCircle } from "lucide-react";

export default function Consents() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [consentType, setConsentType] = useState<"terms" | "data_policy" | "identity_auth">("terms");

  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery({});
  const { data: consents = [], isLoading } = trpc.consents.byClient.useQuery(
    { clientId: parseInt(selectedClientId) },
    { enabled: !!selectedClientId }
  );

  const registerMutation = trpc.consents.register.useMutation({
    onSuccess: () => {
      toast.success("Consentimiento registrado");
      utils.consents.byClient.invalidate({ clientId: parseInt(selectedClientId) });
      setShowDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Consentimientos Legales</h1>
            <p className="text-muted-foreground text-sm mt-1">Registro de aceptación de términos y políticas</p>
          </div>
          {selectedClientId && (
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar consentimiento
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <Label>Seleccionar cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccione un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.fullName} — {c.documentType} {c.documentNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedClientId ? (
              <div className="py-8 text-center text-muted-foreground">Seleccione un cliente para ver sus consentimientos</div>
            ) : isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Cargando...</div>
            ) : consents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Sin consentimientos registrados</div>
            ) : (
              <div className="space-y-3">
                {consents.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{CONSENT_TYPE_LABELS[c.consentType] ?? c.consentType}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aceptado el {formatDateTime(c.acceptedAt)}
                        {c.ipAddress && ` · IP: ${c.ipAddress}`}
                      </p>
                      {c.deviceInfo && <p className="text-xs text-muted-foreground">{c.deviceInfo}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Consentimiento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo de consentimiento *</Label>
              <Select value={consentType} onValueChange={v => setConsentType(v as typeof consentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Se registrará la fecha, hora e IP actual como evidencia de aceptación.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => registerMutation.mutate({ clientId: parseInt(selectedClientId), consentType })}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Registrando..." : "Confirmar aceptación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
