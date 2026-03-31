import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  validated: "Validado",
  approved: "Aprobado",
  blocked: "Bloqueado",
  active: "Activo",
  paid: "Pagado",
  overdue: "En mora",
  cancelled: "Cancelado",
  verified: "Verificado",
  rejected: "Rechazado",
  reversed: "Revertido",
  partial: "Parcial",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        `status-${status}`,
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
