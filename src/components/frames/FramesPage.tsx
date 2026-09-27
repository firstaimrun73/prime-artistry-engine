/**
 * Motio2edit Frames Studio — uses global theme; real compose → charge → result.
 * States: idle → edit → processing → result
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Info,
  Share2,
  Lock,
  SpinnersHorizontal as SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
