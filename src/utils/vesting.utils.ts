export type VestingStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface VestingStreamInput {
  status?: string; // e.g., if explicitly cancelled
  startTime: number | Date;
  endTime: number | Date;
  currentTime?: number | Date;
}

/**
 * Derives the lifecycle status of a vesting stream in a single authoritative place.
 */
export function deriveVestingStatus(stream: VestingStreamInput): VestingStatus {
  // If explicitly cancelled, preserve cancellation status
  if (stream.status && stream.status.toUpperCase() === 'CANCELLED') {
    return 'CANCELLED';
  }

  const now = stream.currentTime ? new Date(stream.currentTime).getTime() : Date.now();
  const start = new Date(stream.startTime).getTime();
  const end = new Date(stream.endTime).getTime();

  if (now < start) {
    return 'PENDING';
  } else if (now >= end) {
    return 'COMPLETED';
  } else {
    return 'ACTIVE';
  }
}