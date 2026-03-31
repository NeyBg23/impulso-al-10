import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Eye, UserCheck, UserX, UserCog } from "lucide-react";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [form, setForm] = useState({
    fullName: "", documentType: "CC" as "CC" | "CE" | "NIT" | "PASAPORTE",
    documentNumber: "", phone: "", email: "", address: "", city: "", occupation: "",
    reference1Name: "", reference1Phone: "", reference1Relation: "",
    reference2Name: "", reference2Phone: "", reference2Relation: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: clients = [], isLoading } = trpc.clients.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      utils.clients.list.invalidate();
      setShowNewDialog(false);
      setForm({ fullName: "", documentType: "CC", documentNumber: "", phone: "", email: "", address: "", city: "", occupation: "", reference1Name: "", reference1Phone: "", reference1Relation: "", reference2Name: "", reference2Phone: "", reference2Relation: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = clients.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.documentNumber.includes(search) ||
    c.phone.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">{clients.length} clientes registrados</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, documento o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="validated">Validado</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando clientes...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {search ? "No se encontraron clientes con ese criterio" : "No hay clientes registrados"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nombre</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Documento</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Teléfono</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ciudad</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Registro</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((client) => (
                      <tr key={client.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium">{client.fullName}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded mr-1">{client.documentType}</span>
                          {client.documentNumber}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{client.phone}</td>
                        <td className="py-3 px-4 text-muted-foreground">{client.city ?? "—"}</td>
                        <td className="py-3 px-4"><StatusBadge status={client.status} /></td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDate(client.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/clients/${client.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* New Client Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Nombre completo *</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Tipo de documento *</Label>
              <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v as "CC" | "CE" | "NIT" | "PASAPORTE" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                  <SelectItem value="CE">Cédula de extranjería</SelectItem>
                  <SelectItem value="NIT">NIT</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número de documento *</Label>
              <Input value={form.documentNumber} onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))} placeholder="Número" />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="3XX XXX XXXX" />
            </div>
            <div>
              <Label>Correo electrónico</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" type="email" />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección" />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ciudad" />
            </div>
            <div className="sm:col-span-2">
              <Label>Ocupación</Label>
              <Input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} placeholder="Ocupación o trabajo" />
            </div>
            <div className="sm:col-span-2 border-t pt-4">
              <p className="text-sm font-medium mb-3">Referencia 1</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input value={form.reference1Name} onChange={e => setForm(f => ({ ...f, reference1Name: e.target.value }))} placeholder="Nombre" />
                <Input value={form.reference1Phone} onChange={e => setForm(f => ({ ...f, reference1Phone: e.target.value }))} placeholder="Teléfono" />
                <Input value={form.reference1Relation} onChange={e => setForm(f => ({ ...f, reference1Relation: e.target.value }))} placeholder="Parentesco" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium mb-3">Referencia 2</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input value={form.reference2Name} onChange={e => setForm(f => ({ ...f, reference2Name: e.target.value }))} placeholder="Nombre" />
                <Input value={form.reference2Phone} onChange={e => setForm(f => ({ ...f, reference2Phone: e.target.value }))} placeholder="Teléfono" />
                <Input value={form.reference2Relation} onChange={e => setForm(f => ({ ...f, reference2Relation: e.target.value }))} placeholder="Parentesco" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones adicionales" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.fullName || !form.documentNumber || !form.phone}
            >
              {createMutation.isPending ? "Guardando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
