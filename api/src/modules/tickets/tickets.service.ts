import { Injectable } from '@nestjs/common';

import { CACHE_NAMESPACES } from '../performance/cache.constants.js';
import { CacheService } from '../performance/cache.service.js';

import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { TicketsRepository } from './tickets.repository.js';

type TicketFilters = {
  status?: string;
  priority?: string;
  supportCategory?: string;
  assigneeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

type CommentActor = {
  id: string;
  role?: string;
  roles?: Array<{ name: string }>;
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(filters: TicketFilters = {}) {
    return this.ticketsRepository.findAll(filters);
  }

  async findOne(id: string) {
    return this.ticketsRepository.findOne(id);
  }

  async create(dto: CreateTicketDto) {
    const ticket = await this.ticketsRepository.create(dto);
    await this.cacheService.invalidateNamespace(CACHE_NAMESPACES.dashboard);
    return ticket;
  }

  async listComments(ticketId: string, pagination: { page: number; pageSize: number }) {
    return this.ticketsRepository.listComments(ticketId, pagination);
  }

  async addComment(ticketId: string, body: string, actor: CommentActor) {
    const comment = await this.ticketsRepository.addComment(ticketId, body, actor);
    await this.cacheService.invalidateNamespace(CACHE_NAMESPACES.dashboard);
    return comment;
  }

  async updateComment(ticketId: string, commentId: string, body: string, actor: CommentActor) {
    const comment = await this.ticketsRepository.updateComment(ticketId, commentId, body, actor);
    await this.cacheService.invalidateNamespace(CACHE_NAMESPACES.dashboard);
    return comment;
  }

  async deleteComment(ticketId: string, commentId: string, actor: CommentActor) {
    const deleted = await this.ticketsRepository.deleteComment(ticketId, commentId, actor);
    await this.cacheService.invalidateNamespace(CACHE_NAMESPACES.dashboard);
    return deleted;
  }

  async listActivity(ticketId: string) {
    return this.ticketsRepository.listActivity(ticketId);
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.ticketsRepository.update(id, dto);
    await this.cacheService.invalidateNamespace(CACHE_NAMESPACES.dashboard);
    return ticket;
  }

  async remove(id: string) {
    const ticket = await this.ticketsRepository.remove(id);
    await this.cacheService.invalidateNamespace(CACHE_NAMESPACES.dashboard);
    return ticket;
  }
}

