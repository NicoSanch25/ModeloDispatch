import React from 'react';
import { TONE_CLASS, type StatusTone } from '../../utils/status';

export const StatusChip: React.FC<{ tone: StatusTone; children: React.ReactNode; className?: string }> = ({ tone, children, className = '' }) => (
  <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${TONE_CLASS[tone]} ${className}`}>{children}</span>
);
