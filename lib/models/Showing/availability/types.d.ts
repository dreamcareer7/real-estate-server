import { Range } from 'postgres-range';

export interface ShowingAvailability {
  id: UUID;
  showing: UUID;
  weekday: DayOfWeek;
  // A half-closed range [lower, upper)
  availability: Range<number>;
}

export interface ShowingAvailabilityPopulated {
  id: UUID;
  showing: UUID;
  weekday: DayOfWeek;
  // A half-closed range [lower, upper)
  availability: [number, number];
}

export interface ShowingAvailabilityInput {
  weekday: DayOfWeek;
  // A half-closed range [lower, upper)
  availability: [number, number];
}

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'
  ;
