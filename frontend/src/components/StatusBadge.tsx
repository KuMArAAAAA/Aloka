import React from "react";
import { EscrowStatus, STATUS_LABELS } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, ArrowUpRight, HelpCircle } from "lucide-react";

interface StatusBadgeProps {
  status: EscrowStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true }) => {
  const info = STATUS_LABELS[status] || STATUS_LABELS[EscrowStatus.BelumAda];

  const renderIcon = () => {
    switch (status) {
      case EscrowStatus.MenungguVerifikasi:
        return <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" />;
      case EscrowStatus.Terverifikasi:
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />;
      case EscrowStatus.Ditolak:
        return <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />;
      case EscrowStatus.Tersalurkan:
        return <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-emerald-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 mr-1 text-gray-500" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${info.badgeClass}`}
      title={info.description}
    >
      {showIcon && renderIcon()}
      {info.label}
    </span>
  );
};
