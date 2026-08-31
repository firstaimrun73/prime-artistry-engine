import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, History, User, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function hideBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/studio/video")) return true;
  if (pathname === "/music" || pathname.startsWith("/music/")) return true;
  if (pathname.startsWith("/studio/music")) return true;
  if (pathname.startsWith("/studio/image/circle-remove")) return true;
  if (pathname.startsWith("/studio/image/auto-edit")) return true;
  // Dedicated filter/lens editor surfaces — never cover intensity/Apply controls
  if (pathname.startsWith("/studio/image/filters")) return true;
  if (pathname.startsWith("/studio/image/lenses")) return true;
  if (pathname.startsWith("/studio/image/filter-editor")) return true;
  if (pathname.startsWith("/studio/image/lens-editor")) return true;
  if (pathname.startsWith("/studio/image/age")) return true;
  return false;
}
