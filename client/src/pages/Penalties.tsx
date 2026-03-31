import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { formatDate, formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Penalties() {
  const [, setLocation] = useLocation();
  const { data: penalties = [], isLoading } = trpc.penalties.list.useQuery({});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recargos por Mora</h1>
          <p className="text-muted-foreground text-sm mt-1">{penalties.length} recargos registrados</p>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando recargos...</div>
            ) : penalties.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Sin recargos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Préstamo</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Monto</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Días mora</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Motivo</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penalties.map((pen) => (
                      <tr key={pen.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">#{pen.id}</td>
                        <td className="py-3 px-4">
                          <Button variant="link" className="p-0 h-auto" onClick={() => setLocation(`/loans/${pen.loanId}`)}>
                            Préstamo #{pen.loanId}
                          </Button>
                        </td>
                        <td className="py-3 px-4 font-medium text-red-600">{formatCOP(pen.amount)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{pen.daysOverdue} días</td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{pen.reason}</td>
                        <td className="py-3 px-4"><StatusBadge status={pen.status} /></td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDate(pen.createdAt)}</td>
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
