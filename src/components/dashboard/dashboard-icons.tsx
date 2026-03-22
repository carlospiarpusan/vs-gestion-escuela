"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarRange,
  Car,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Landmark,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
  UserCheck,
  UserCog,
  Users,
  Banknote,
  Wallet,
} from "lucide-react";
import type { DashboardIconKey } from "@/lib/dashboard-nav";

export function renderDashboardIcon(icon: DashboardIconKey, size = 18): ReactNode {
  switch (icon) {
    case "home":
      return <Home size={size} />;
    case "students":
      return <Users size={size} />;
    case "classes":
      return <Clock size={size} />;
    case "vehicles":
      return <Car size={size} />;
    case "hours":
      return <CalendarRange size={size} />;
    case "exams":
      return <FileText size={size} />;
    case "income":
      return <DollarSign size={size} />;
    case "portfolio":
      return <Landmark size={size} />;
    case "cash":
      return <Wallet size={size} />;
    case "expenses":
      return <TrendingDown size={size} />;
    case "automation":
      return <ReceiptText size={size} />;
    case "reports":
      return <BarChart3 size={size} />;
    case "instructors":
      return <UserCheck size={size} />;
    case "staff":
      return <UserCog size={size} />;
    case "branches":
      return <ReceiptText size={size} />;
    case "schools":
      return <Building2 size={size} />;
    case "subscriptions":
      return <CreditCard size={size} />;
    case "payroll":
      return <Banknote size={size} />;
    case "logbook":
      return <BookOpen size={size} />;
    case "permissions":
      return <ShieldCheck size={size} />;
    default:
      return <Home size={size} />;
  }
}
