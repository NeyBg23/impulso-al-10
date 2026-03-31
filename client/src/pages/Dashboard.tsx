import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatCOP, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, CreditCard, AlertTriangle, Banknote, CheckCircle } from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, color }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Resumen financiero y operativo</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Total Prestado"
                value={formatCOP(stats.totalPrincipal)}
                subtitle={`${stats.totalLoans} préstamos en total`}
                icon={Banknote}
                color="bg-blue-600"
              />
              <StatCard
                title="Cartera Activa"
                value={String(stats.activeLoans)}
                subtitle={`${stats.activeLoans} préstamos activos`}
                icon={CreditCard}
                color="bg-emerald-600"
              />
              <StatCard
                title="Cartera en Mora"
                value={String(stats.overdueLoans)}
                subtitle={`${stats.overdueLoans} préstamos en mora`}
                icon={AlertTriangle}
                color="bg-red-500"
              />
              <StatCard
                title="Total Recaudado"
                value={formatCOP(stats.totalCollected)}
                subtitle={`${stats.overdueInstallments} cuotas vencidas`}
                icon={TrendingUp}
                color="bg-violet-600"
              />
              <StatCard
                title="Préstamos Pagados"
                value={String(stats.paidLoans)}
                subtitle="Finalizados exitosamente"
                icon={CheckCircle}
                color="bg-green-600"
              />
              <StatCard
                title="Clientes"
                value={String(stats.totalClients)}
                subtitle={`${stats.approvedClients} aprobados`}
                icon={Users}
                color="bg-orange-500"
              />
            </div>


          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No se pudieron cargar las estadísticas
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
