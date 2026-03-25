import { Injectable } from '@nestjs/common';

import { ToursRepository } from './tours.repository.js';

type TourListFilters = {
  search?: string;
  status?: string;
  zoneId?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ToursQueryService {
  constructor(private readonly toursRepository: ToursRepository) {}

  async list(filters: TourListFilters) {
    return this.toursRepository.list(filters);
  }

  async getAgentTour(agentUserId: string) {
    return this.toursRepository.getAgentTour(agentUserId);
  }

  async listAnomalyTypes() {
    return this.toursRepository.listAnomalyTypes();
  }

  async getTourActivity(tourId: string) {
    return this.toursRepository.getTourActivity(tourId);
  }

  async getTourById(tourId: string) {
    return this.toursRepository.getTourById(tourId);
  }

  async getTourRouteStops(tourId: string) {
    return this.toursRepository.getTourRouteStops(tourId);
  }

  async getStoredRoute(tourId: string) {
    return this.toursRepository.getStoredRoute(tourId);
  }
}
