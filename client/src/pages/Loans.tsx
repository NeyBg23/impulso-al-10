import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate, formatCOP, FREQUENCY_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";

export default function Loans() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: loans = [], isLoading } = trpc.loans.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const filtered = loans.filter(l =>
    String(l.id).includes(search) ||
    formatCOP(l.principal).includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Préstamos</h1>
            <p className="text-muted-foreground text-sm mt-1">{loans.length} préstamos registrados</p>
          </div>
          <Button onClick={() => setLocation("/loans/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo préstamo
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID o monto..."
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
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="overdue">En mora</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando préstamos...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No hay préstamos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Capital</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cuotas</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Frecuencia</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Desembolso</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((loan) => (
                      <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">#{loan.id}</td>
                        <td className="py-3 px-4 font-medium">{formatCOP(loan.principal)}</td>
                        <td className="py-3 px-4">{formatCOP(loan.totalAmount)}</td>
                        <td className="py-3 px-4">{loan.installmentCount} × {formatCOP(loan.installmentAmount)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{FREQUENCY_LABELS[loan.frequency] ?? loan.frequency}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDate(loan.disbursementDate)}</td>
                        <td className="py-3 px-4"><StatusBadge status={loan.status} /></td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/loans/${loan.id}`)}>
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
    </DashboardLayout>
  );
}
