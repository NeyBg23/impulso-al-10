import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Calculator } from "lucide-react";

export default function NewLoan() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    clientId: "",
    principal: "",
    termMonths: "3",
    frequency: "monthly" as "weekly" | "biweekly" | "monthly",
    disbursementDate: new Date().toISOString().split("T")[0],
    firstDueDate: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery({ status: "approved" });
  const { data: calc } = trpc.loans.calculate.useQuery(
    {
      principal: parseFloat(form.principal) || 0,
      interestRate: 10,
      termMonths: parseInt(form.termMonths) || 1,
      frequency: form.frequency,
    },
    { enabled: !!form.principal && parseFloat(form.principal) > 0 }
  );

  const createMutation = trpc.loans.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Préstamo creado: ${data.installmentCount} cuotas de ${formatCOP(data.installmentAmount)}`);
      utils.loans.list.invalidate();
      setLocation("/loans");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.clientId || !form.principal || !form.firstDueDate) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }
    createMutation.mutate({
      clientId: parseInt(form.clientId),
      principal: parseFloat(form.principal),
      termMonths: parseInt(form.termMonths),
      frequency: form.frequency,
      disbursementDate: form.disbursementDate,
      firstDueDate: form.firstDueDate,
      notes: form.notes || null,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/loans")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Préstamos
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Préstamo</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos del préstamo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cliente (aprobado) *</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.fullName} — {c.documentType} {c.documentNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No hay clientes aprobados. Apruebe un cliente primero.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Capital a prestar (COP) *</Label>
                  <Input
                    type="number"
                    value={form.principal}
                    onChange={e => setForm(f => ({ ...f, principal: e.target.value }))}
                    placeholder="500000"
                    min="1"
                  />
                </div>
                <div>
                  <Label>Plazo (meses) *</Label>
                  <Input
                    type="number"
                    value={form.termMonths}
                    onChange={e => setForm(f => ({ ...f, termMonths: e.target.value }))}
                    min="1"
                    max="60"
                  />
                </div>
              </div>

              <div>
                <Label>Frecuencia de pago *</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as typeof form.frequency }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de desembolso *</Label>
                  <Input
                    type="date"
                    value={form.disbursementDate}
                    onChange={e => setForm(f => ({ ...f, disbursementDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fecha primera cuota *</Label>
                  <Input
                    type="date"
                    value={form.firstDueDate}
                    onChange={e => setForm(f => ({ ...f, firstDueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observaciones del préstamo..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {calc && parseFloat(form.principal) > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Resumen financiero (tasa 10% mensual)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Capital", formatCOP(form.principal)],
                    ["Interés total", formatCOP(calc.totalInterest)],
                    ["Total a pagar", formatCOP(calc.totalAmount)],
                    ["N° de cuotas", String(calc.installmentCount)],
                    ["Valor por cuota", formatCOP(calc.installmentAmount)],
                    ["Frecuencia", form.frequency === "weekly" ? "Semanal" : form.frequency === "biweekly" ? "Quincenal" : "Mensual"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b pb-2 last:border-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/loans")} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !form.clientId || !form.principal || !form.firstDueDate}
              className="flex-1"
            >
              {createMutation.isPending ? "Creando préstamo..." : "Crear préstamo"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
