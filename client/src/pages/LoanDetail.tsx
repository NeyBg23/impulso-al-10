import { useState } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate, formatCOP, FREQUENCY_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, CheckCircle, XCircle, RotateCcw, AlertTriangle, FileDown, Loader2 } from "lucide-react";

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const loanId = parseInt(id ?? "0");
  const [, setLocation] = useLocation();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPenaltyDialog, setShowPenaltyDialog] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState<{ type: "payment" | "penalty"; id: number } | null>(null);
  const [paymentForm, setPaymentForm] = useState({ installmentId: "", amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "cash", reference: "", notes: "" });
  const [penaltyForm, setPenaltyForm] = useState({ installmentId: "", amount: "", reason: "", daysOverdue: "" });
  const [reverseReason, setReverseReason] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const downloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/pdf/loan/${loanId}`, { credentials: "include" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Error al generar el PDF" }));
        toast.error(err.error ?? "Error al generar el PDF");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-cuenta-prestamo-${loanId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Estado de cuenta descargado correctamente");
    } catch {
      toast.error("Error de conexión al generar el PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const utils = trpc.useUtils();
  const { data: loan, isLoading } = trpc.loans.get.useQuery({ id: loanId });
  const { data: installments = [] } = trpc.installments.byLoan.useQuery({ loanId });
  const { data: payments = [] } = trpc.payments.list.useQuery({ loanId });
  const { data: penalties = [] } = trpc.penalties.list.useQuery({ loanId });

  const registerPayment = trpc.payments.register.useMutation({
    onSuccess: () => {
      toast.success("Pago registrado exitosamente");
      utils.payments.list.invalidate({ loanId });
      utils.installments.byLoan.invalidate({ loanId });
      setShowPaymentDialog(false);
      setPaymentForm({ installmentId: "", amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "cash", reference: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyPayment = trpc.payments.verify.useMutation({
    onSuccess: () => { toast.success("Pago verificado"); utils.payments.list.invalidate({ loanId }); utils.installments.byLoan.invalidate({ loanId }); },
    onError: (e) => toast.error(e.message),
  });

  const rejectPayment = trpc.payments.reject.useMutation({
    onSuccess: () => { toast.success("Pago rechazado"); utils.payments.list.invalidate({ loanId }); },
    onError: (e) => toast.error(e.message),
  });

  const reversePayment = trpc.payments.reverse.useMutation({
    onSuccess: () => { toast.success("Pago revertido"); utils.payments.list.invalidate({ loanId }); utils.installments.byLoan.invalidate({ loanId }); setShowReverseDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  const applyPenalty = trpc.penalties.create.useMutation({
    onSuccess: () => { toast.success("Recargo aplicado"); utils.penalties.list.invalidate({ loanId }); setShowPenaltyDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const reversePenalty = trpc.penalties.reverse.useMutation({
    onSuccess: () => { toast.success("Recargo revertido"); utils.penalties.list.invalidate({ loanId }); setShowReverseDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></DashboardLayout>;
  if (!loan) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Préstamo no encontrado</div></DashboardLayout>;

  const paidInstallments = installments.filter(i => i.status === "paid").length;
  const progress = installments.length > 0 ? Math.round((paidInstallments / installments.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/loans")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Préstamos
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Préstamo #{loan.id}</h1>
              <StatusBadge status={loan.status} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {formatCOP(loan.principal)} · {FREQUENCY_LABELS[loan.frequency]} · {loan.termMonths} meses
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={downloadPdf}
              disabled={isDownloadingPdf}
              title="Descargar estado de cuenta en PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Estado de cuenta
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowPenaltyDialog(true)}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Aplicar recargo
            </Button>
            <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar pago
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Capital", value: formatCOP(loan.principal) },
            { label: "Total a pagar", value: formatCOP(loan.totalAmount) },
            { label: "Valor cuota", value: formatCOP(loan.installmentAmount) },
            { label: "Progreso", value: `${paidInstallments}/${installments.length} cuotas (${progress}%)` },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="installments">
          <TabsList>
            <TabsTrigger value="installments">Cuotas ({installments.length})</TabsTrigger>
            <TabsTrigger value="payments">Pagos ({payments.length})</TabsTrigger>
            <TabsTrigger value="penalties">Recargos ({penalties.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="installments" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vencimiento</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Monto</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pagado</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => (
                      <tr key={inst.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{inst.installmentNumber}</td>
                        <td className="py-3 px-4">{formatDate(inst.dueDate)}</td>
                        <td className="py-3 px-4 font-medium">{formatCOP(inst.amount)}</td>
                        <td className="py-3 px-4">{formatCOP(inst.paidAmount)}</td>
                        <td className="py-3 px-4"><StatusBadge status={inst.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Sin pagos registrados</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Monto</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Método</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((pay) => (
                        <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{formatCOP(pay.amount)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(pay.paymentDate)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{pay.paymentMethod ?? "—"}</td>
                          <td className="py-3 px-4"><StatusBadge status={pay.status} /></td>
                          <td className="py-3 px-4 text-right flex justify-end gap-1">
                            {pay.status === "pending" && !pay.isReversed && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => verifyPayment.mutate({ id: pay.id })}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => rejectPayment.mutate({ id: pay.id, notes: "Rechazado por administrador" })}>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {!pay.isReversed && pay.status !== "reversed" && (
                              <Button variant="ghost" size="sm" onClick={() => setShowReverseDialog({ type: "payment", id: pay.id })}>
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="penalties" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {penalties.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Sin recargos aplicados</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Monto</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Días mora</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Motivo</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {penalties.map((pen) => (
                        <tr key={pen.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{formatCOP(pen.amount)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{pen.daysOverdue} días</td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{pen.reason}</td>
                          <td className="py-3 px-4"><StatusBadge status={pen.status} /></td>
                          <td className="py-3 px-4 text-right">
                            {!pen.isReversed && (
                              <Button variant="ghost" size="sm" onClick={() => setShowReverseDialog({ type: "penalty", id: pen.id })}>
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Register Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cuota (opcional)</Label>
              <Select value={paymentForm.installmentId} onValueChange={v => setPaymentForm(f => ({ ...f, installmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cuota..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin cuota específica</SelectItem>
                  {installments.filter(i => i.status !== "paid").map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      Cuota #{i.installmentNumber} — {formatCOP(i.amount)} — {formatDate(i.dueDate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={v => setPaymentForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="daviplata">Daviplata</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia</Label>
              <Input value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="Número de comprobante" />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => registerPayment.mutate({
                loanId,
                installmentId: paymentForm.installmentId ? parseInt(paymentForm.installmentId) : null,
                amount: parseFloat(paymentForm.amount),
                paymentDate: paymentForm.paymentDate,
                paymentMethod: paymentForm.paymentMethod || null,
                reference: paymentForm.reference || null,
                receiptUrl: null,
                notes: paymentForm.notes || null,
              })}
              disabled={registerPayment.isPending || !paymentForm.amount || !paymentForm.paymentDate}
            >
              {registerPayment.isPending ? "Guardando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Penalty Dialog */}
      <Dialog open={showPenaltyDialog} onOpenChange={setShowPenaltyDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar Recargo por Mora</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cuota en mora *</Label>
              <Select value={penaltyForm.installmentId} onValueChange={v => setPenaltyForm(f => ({ ...f, installmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cuota..." /></SelectTrigger>
                <SelectContent>
                  {installments.filter(i => i.status === "overdue" || i.status === "pending").map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      Cuota #{i.installmentNumber} — vence {formatDate(i.dueDate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto del recargo *</Label>
                <Input type="number" value={penaltyForm.amount} onChange={e => setPenaltyForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Días en mora *</Label>
                <Input type="number" value={penaltyForm.daysOverdue} onChange={e => setPenaltyForm(f => ({ ...f, daysOverdue: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Motivo (mínimo 10 caracteres) *</Label>
              <Textarea
                value={penaltyForm.reason}
                onChange={e => setPenaltyForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Describa el motivo del recargo por mora..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">{penaltyForm.reason.length}/10 caracteres mínimos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPenaltyDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => applyPenalty.mutate({
                loanId,
                installmentId: parseInt(penaltyForm.installmentId),
                amount: parseFloat(penaltyForm.amount),
                reason: penaltyForm.reason,
                daysOverdue: parseInt(penaltyForm.daysOverdue),
              })}
              disabled={applyPenalty.isPending || !penaltyForm.installmentId || !penaltyForm.amount || penaltyForm.reason.length < 10}
            >
              {applyPenalty.isPending ? "Aplicando..." : "Aplicar recargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Dialog */}
      <Dialog open={!!showReverseDialog} onOpenChange={() => setShowReverseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revertir {showReverseDialog?.type === "payment" ? "Pago" : "Recargo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. El {showReverseDialog?.type === "payment" ? "pago" : "recargo"} quedará marcado como revertido.
            </p>
            <div>
              <Label>Motivo de la reversión (mínimo 5 caracteres) *</Label>
              <Textarea
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value)}
                placeholder="Indique el motivo de la reversión..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverseDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!showReverseDialog) return;
                if (showReverseDialog.type === "payment") {
                  reversePayment.mutate({ id: showReverseDialog.id, reason: reverseReason });
                } else {
                  reversePenalty.mutate({ id: showReverseDialog.id, reason: reverseReason });
                }
              }}
              disabled={(reversePayment.isPending || reversePenalty.isPending) || reverseReason.length < 5}
            >
              Confirmar reversión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
