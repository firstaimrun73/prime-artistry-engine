/**
 * Cropmix Collage — up to 10 photos, 10 styles, common local / AI+ server.
 * Photos strip: drag-grip reorder. Every cell: Fit/Fill + pan-within-cell.
 */
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  SpecsHorizontal as SlidersHorizontal,
  X,
  ArrowLeft,
  GripVertical,
} from "lucide-react";
