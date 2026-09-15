import React from "react";
import { Badge } from "../../../common/badge";
import {
  Smartphone,
  CreditCard,
  Building2,
  Banknote,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";

export const getMethodIcon = (method) => {
  switch (method) {
    case "jazzcash":
      return <Smartphone className="h-4 w-4" style={{ color: "#e1272c" }} />;
    case "card":
      return <CreditCard className="h-4 w-4" style={{ color: "#1a1f71" }} />;
    case "bank":
      return <Building2 className="h-4 w-4 text-blue-600" />;
    default:
      return <Banknote className="h-4 w-4 text-green-600" />;
  }
};

export const getMethodLabel = (method) => {
  switch (method) {
    case "jazzcash":
      return "JazzCash";
    case "card":
      return "Card";
    case "bank":
      return "Bank Transfer";
    default:
      return method;
  }
};

export const getStatusBadge = (status) => {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" /> Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const timeSince = (dateStr) => {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
