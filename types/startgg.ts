// File: types/startgg.ts

export interface Participant {
  id: string;
  gamerTag: string;
}

export interface Entrant {
  id: number;
  name: string;
  participants: Participant[];
}

export interface Standing {
  placement: number;
  entrant: Entrant;
}

export interface Event {
  id: number;
  name: string;
  numEntrants: number;
  standings: {
    nodes: Standing[];
  };
}

export interface Tournament {
  id: number;
  name: string;
  startAt: number;
  events: Event[];
}

export interface StartGGResponse {
  tournament: Tournament | null;
}

export interface ProcessedParticipant {
  id: string;
  name: string;
  placement: number;
  startggId: string;
  isElonStudent: boolean;
}
