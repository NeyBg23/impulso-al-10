import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate, formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

export default function Payments() {
  const [, setLocation] = useLocation();
  const [showReverseDialog, setShowReverseDialog] = useState<number | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const utils = trpc.useUtils();
  const { data: payments = [], isLoading } = trpc.payments.list.useQuery({});

  const verifyPayment = trpc.payments.verify.useMutation({
    onSuccess: () => { toast.success("Pago verificado"); utils.payments.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const rejectPayment = trpc.payments.reject.useMutation({
    onSuccess: () => { toast.success("Pago rechazado"); utils.payments.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const reversePayment = trpc.payments.reverse.useMutation({
    onSuccess: () => { toast.success("Pago revertido"); utils.payments.list.invalidate(); setShowReverseDialog(null); setReverseReason(""); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground text-sm mt-1">{payments.length} pagos registrados</p>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando pagos...</div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Sin pagos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Préstamo</th>
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
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">#{pay.id}</td>
                        <td className="py-3 px-4">
                          <Button variant="link" className="p-0 h-auto" onClick={() => setLocation(`/loans/${pay.loanId}`)}>
                            Préstamo #{pay.loanId}
                          </Button>
                        </td>
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
                              <Button variant="ghost" size="sm" onClick={() => rejectPayment.mutate({ id: pay.id, notes: "Rechazado" })}>
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {!pay.isReversed && pay.status !== "reversed" && (
                            <Button variant="ghost" size="sm" onClick={() => setShowReverseDialog(pay.id)}>
                              <RotateCcw className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showReverseDialog !== null} onOpenChange={() => setShowReverseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revertir Pago</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. Indique el motivo.</p>
            <div>
              <Label>Motivo *</Label>
              <Textarea value={reverseReason} onChange={e => setReverseReason(e.target.value)} placeholder="Motivo de la reversión..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverseDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => showReverseDialog && reversePayment.mutate({ id: showReverseDialog, reason: reverseReason })} disabled={reversePayment.isPending || reverseReason.length < 5}>
              Confirmar reversión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
