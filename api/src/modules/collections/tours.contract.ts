export const TOURS_ROUTE_COORDINATION_PORT = Symbol('TOURS_ROUTE_COORDINATION_PORT');

export interface ToursRouteCoordinationPort {
  ensureRouteForTour(tourId: string): Promise<void>;
}

