import React from "react";

import { FullscreenToggleButtonProps } from "./types";

export const FullscreenToggleButton = ({
  isFullscreen,
  toggleFullscreen,
}: FullscreenToggleButtonProps) => {
  const ExitIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );

  const EnterIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );

  return (
    <button
      onClick={toggleFullscreen}
      className={`${isFullscreen ? "absolute top-6 right-6 z-10" : "absolute bottom-4 right-4"} bg-[#282828] text-gray-300 rounded-full p-2 shadow-md hover:bg-[#333] hover:text-white`}
      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? <ExitIcon /> : <EnterIcon />}
    </button>
  );
};

export const calculateEdgeLabelPositions = (
  edges: any[],
  nodePositionsMap: Record<string, { x: number; y: number }>,
): Map<string, { x: number; y: number; angle: number }> => {
  const edgeLabelPositions = new Map<
    string,
    { x: number; y: number; angle: number }
  >();

  edges.forEach((edge) => {
    const sourcePos = nodePositionsMap[edge.source];
    const targetPos = nodePositionsMap[edge.target];

    if (!sourcePos || !targetPos) return;

    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = (sourcePos.y + targetPos.y) / 2;

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    edgeLabelPositions.set(`${edge.source}-${edge.target}-${edge.label}`, {
      x: midX,
      y: midY,
      angle: angle,
    });
  });

  const processedPositions = new Map<string, boolean>();
  const minDistance = 60;

  edgeLabelPositions.forEach((pos1, key1) => {
    if (processedPositions.has(key1)) return;
    processedPositions.set(key1, true);

    edgeLabelPositions.forEach((pos2, key2) => {
      if (key1 === key2 || processedPositions.has(key2)) return;

      const distance = Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2),
      );

      if (distance < minDistance) {
        const offsetAngle = pos2.angle + 90;
        const offsetX = 50 * Math.cos((offsetAngle * Math.PI) / 180);
        const offsetY = 50 * Math.sin((offsetAngle * Math.PI) / 180);

        pos2.x += offsetX;
        pos2.y += offsetY;

        processedPositions.set(key2, true);
      }
    });
  });

  return edgeLabelPositions;
};

export const calculateEdgePoints = (
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  nodeSize: number,
): { startX: number; startY: number; endX: number; endY: number } => {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return {
      startX: sourcePos.x,
      startY: sourcePos.y,
      endX: targetPos.x,
      endY: targetPos.y,
    };
  }

  const nx = dx / distance;
  const ny = dy / distance;

  return {
    startX: sourcePos.x + nx * (nodeSize + 2),
    startY: sourcePos.y + ny * (nodeSize + 2),
    endX: targetPos.x - nx * (nodeSize + 2),
    endY: targetPos.y - ny * (nodeSize + 2),
  };
};
