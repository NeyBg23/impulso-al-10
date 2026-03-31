import { useState } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate, formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, UserCheck, UserX, AlertTriangle } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id ?? "0");
  const [, setLocation] = useLocation();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<"pending" | "validated" | "approved" | "blocked">("approved");
  const [statusNotes, setStatusNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: client, isLoading } = trpc.clients.get.useQuery({ id: clientId });
  const { data: loans = [] } = trpc.loans.list.useQuery({ clientId });
  const { data: documents = [] } = trpc.documents.byClient.useQuery({ clientId });
  const { data: consents = [] } = trpc.consents.byClient.useQuery({ clientId });
  const { data: collections = [] } = trpc.collections.byClient.useQuery({ clientId });

  const changeStatus = trpc.clients.changeStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      utils.clients.get.invalidate({ id: clientId });
      utils.clients.list.invalidate();
      setShowStatusDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></DashboardLayout>;
  if (!client) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Cliente no encontrado</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/clients")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Clientes
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{client.fullName}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{client.documentType} {client.documentNumber}</p>
          </div>
          <div className="flex gap-2">
            {client.status !== "approved" && (
              <Button size="sm" variant="outline" onClick={() => { setNewStatus("approved"); setShowStatusDialog(true); }}>
                <UserCheck className="mr-2 h-4 w-4" />
                Aprobar
              </Button>
            )}
            {client.status !== "blocked" && (
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setNewStatus("blocked"); setShowStatusDialog(true); }}>
                <UserX className="mr-2 h-4 w-4" />
                Bloquear
              </Button>
            )}
            <Button size="sm" onClick={() => setLocation("/loans/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo préstamo
            </Button>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="loans">Préstamos ({loans.length})</TabsTrigger>
            <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
            <TabsTrigger value="consents">Consentimientos ({consents.length})</TabsTrigger>
            <TabsTrigger value="collections">Cobranza ({collections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[
                    ["Teléfono", client.phone],
                    ["Correo", client.email ?? "—"],
                    ["Dirección", client.address ?? "—"],
                    ["Ciudad", client.city ?? "—"],
                    ["Ocupación", client.occupation ?? "—"],
                    ["Registro", formatDate(client.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Referencias</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {client.reference1Name && (
                    <div>
                      <p className="font-medium">{client.reference1Name}</p>
                      <p className="text-muted-foreground">{client.reference1Phone} · {client.reference1Relation}</p>
                    </div>
                  )}
                  {client.reference2Name && (
                    <div>
                      <p className="font-medium">{client.reference2Name}</p>
                      <p className="text-muted-foreground">{client.reference2Phone} · {client.reference2Relation}</p>
                    </div>
                  )}
                  {!client.reference1Name && !client.reference2Name && (
                    <p className="text-muted-foreground">Sin referencias registradas</p>
                  )}
                  {client.notes && (
                    <div className="border-t pt-3">
                      <p className="text-muted-foreground text-xs mb-1">Notas</p>
                      <p>{client.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="loans" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loans.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Sin préstamos registrados</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Monto</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cuotas</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map(loan => (
                        <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground">#{loan.id}</td>
                          <td className="py-3 px-4 font-medium">{formatCOP(loan.principal)}</td>
                          <td className="py-3 px-4">{formatCOP(loan.totalAmount)}</td>
                          <td className="py-3 px-4">{loan.installmentCount} cuotas</td>
                          <td className="py-3 px-4"><StatusBadge status={loan.status} /></td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setLocation(`/loans/${loan.id}`)}>Ver</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {documents.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">Sin documentos subidos</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {documents.map(doc => (
                      <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="border rounded-lg p-3 hover:bg-muted/30 transition-colors text-sm">
                        <p className="font-medium truncate">{doc.fileName}</p>
                        <p className="text-muted-foreground text-xs mt-1">{doc.type} · {formatDate(doc.createdAt)}</p>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consents" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {consents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Sin consentimientos registrados</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consents.map(c => (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-3 px-4 font-medium">{c.consentType}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(c.acceptedAt)}</td>
                          <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{c.ipAddress ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collections" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {collections.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Sin registros de cobranza</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Resultado</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Notas</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.map(c => (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-3 px-4 font-medium">{c.contactType}</td>
                          <td className="py-3 px-4"><StatusBadge status={c.result} /></td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{c.notes ?? "—"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(c.contactDate)}</td>
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

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado del cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nuevo estado</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as typeof newStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="validated">Validado</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} placeholder="Motivo del cambio de estado..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancelar</Button>
            <Button onClick={() => changeStatus.mutate({ id: clientId, status: newStatus, notes: statusNotes })} disabled={changeStatus.isPending}>
              {changeStatus.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
