import { GraphData } from '@hypermode/csvkit-virtual-graph';
import { LucideIcon } from 'lucide-react';

export interface AlertProps {
  type: 'indigo' | 'red' | 'green' | 'yellow' | 'blue' | string;
  title: string;
  message: string;
  icon: LucideIcon;
}

export interface FullscreenToggleButtonProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export type ViewState = 'no-file' | 'loading' | 'error' | 'graph' | 'processing';

export interface CSVFile {
  id: string;
  name: string;
  content: string;
  size: number;
  timestamp: number;
  lastModified?: number;
  graphData?: any;
}

export interface KnowledgeGraphProps {
  graphData: GraphData | string;
  width?: number | string;
  height?: number | string;
}
