import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate, CONTACT_TYPE_LABELS, CONTACT_RESULT_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Phone } from "lucide-react";

export default function Collections() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    loanId: "",
    contactType: "call" as "call" | "message" | "visit" | "email" | "other",
    contactDate: new Date().toISOString().split("T")[0],
    result: "contacted" as "contacted" | "no_answer" | "promised_payment" | "refused" | "other",
    notes: "",
    nextContactDate: "",
  });

  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery({});
  const { data: loans = [] } = trpc.loans.list.useQuery(
    { clientId: parseInt(selectedClientId) },
    { enabled: !!selectedClientId }
  );
  const { data: collections = [], isLoading } = trpc.collections.byClient.useQuery(
    { clientId: parseInt(selectedClientId) },
    { enabled: !!selectedClientId }
  );

  const registerMutation = trpc.collections.register.useMutation({
    onSuccess: () => {
      toast.success("Gestión de cobranza registrada");
      utils.collections.byClient.invalidate({ clientId: parseInt(selectedClientId) });
      setShowDialog(false);
      setForm({ loanId: "", contactType: "call", contactDate: new Date().toISOString().split("T")[0], result: "contacted", notes: "", nextContactDate: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cobranza</h1>
            <p className="text-muted-foreground text-sm mt-1">Registro de gestiones de cobro</p>
          </div>
          {selectedClientId && (
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar gestión
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <Label>Seleccionar cliente</Label>
              <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setForm(f => ({ ...f, loanId: "" })); }}>
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
              <div className="py-8 text-center text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p>Seleccione un cliente para ver sus gestiones de cobranza</p>
              </div>
            ) : isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Cargando...</div>
            ) : collections.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Sin gestiones de cobranza registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Resultado</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Notas</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Próximo contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map(c => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4 font-medium">{CONTACT_TYPE_LABELS[c.contactType] ?? c.contactType}</td>
                        <td className="py-3 px-4"><StatusBadge status={c.result} /></td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{c.notes ?? "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDate(c.contactDate)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{c.nextContactDate ? formatDate(c.nextContactDate) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Gestión de Cobranza</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Préstamo *</Label>
              <Select value={form.loanId} onValueChange={v => setForm(f => ({ ...f, loanId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar préstamo..." /></SelectTrigger>
                <SelectContent>
                  {loans.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>Préstamo #{l.id} — {l.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de contacto *</Label>
                <Select value={form.contactType} onValueChange={v => setForm(f => ({ ...f, contactType: v as typeof form.contactType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={form.contactDate} onChange={e => setForm(f => ({ ...f, contactDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Resultado *</Label>
              <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v as typeof form.result }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTACT_RESULT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Próximo contacto</Label>
              <Input type="date" value={form.nextContactDate} onChange={e => setForm(f => ({ ...f, nextContactDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => registerMutation.mutate({
                clientId: parseInt(selectedClientId),
                loanId: parseInt(form.loanId),
                contactType: form.contactType,
                contactDate: form.contactDate,
                result: form.result,
                notes: form.notes || null,
                nextContactDate: form.nextContactDate || null,
              })}
              disabled={registerMutation.isPending || !form.loanId}
            >
              {registerMutation.isPending ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
