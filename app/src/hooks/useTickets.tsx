// client/src/hooks/useTickets.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadAppRuntimeConfig } from '../config/runtimeFeatures';
import { apiClient } from '../services/api';
import { invalidateTicketQueries } from '../state/invalidation';
import { queryKeys } from '../state/queryKeys';
import { useAuth } from './useAuth';

export type TicketStatus = 'open' | 'closed' | 'completed' | 'in_progress' | 'OPEN' | 'COMPLETED';
export type TicketPriority = 'low' | 'medium' | 'high' | string;

export type Ticket = {
  id: string;
  title: string;
  description?: string | null;
  supportCategory?: string | null;
  status: TicketStatus;
  priority?: TicketPriority;
  requesterId?: string | null;
  assigneeId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedAt?: string | null;
};

export type DashboardData = {
  summary: {
    total: number;
    open: number;
    completed: number;
    assigned?: number;
    avgPrice?: number;
    totalRevenue?: number;
    minPrice?: number;
    maxPrice?: number;
  };
  statusBreakdown?: Record<string, number>;
  recentActivity?: Array<{ date: string; created: number; updated: number }>;
  recentTickets?: Array<{
    id: string | number;
    name: string;
    price: number;
    status: string;
    supportCategory?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

const normalizeTicket = (raw: any): Ticket => ({
  id: String(raw.id ?? ''),
  title: raw.title ?? raw.name ?? 'Untitled ticket',
  description: raw.description ?? null,
  supportCategory: raw.supportCategory ?? raw.support_category ?? null,
  status: (raw.status ?? 'open') as TicketStatus,
  priority: (raw.priority ?? raw.ticket_priority ?? 'medium') as TicketPriority,
  requesterId: raw.requesterId ?? raw.requester_id ?? null,
  assigneeId: raw.assigneeId ?? raw.assignee_id ?? null,
  createdAt: raw.createdAt ?? raw.created_at ?? null,
  updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  closedAt: raw.closedAt ?? raw.closed_at ?? null,
});

export const useTickets = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.tickets(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      const query = params.toString();
      const response = await apiClient.get(`/api/tickets${query ? `?${query}` : ''}`);

      if (response && typeof response === 'object' && 'tickets' in response) {
        const tickets = Array.isArray((response as any).tickets)
          ? (response as any).tickets.map(normalizeTicket)
          : [];
        return { ...response, tickets, total: (response as any).total ?? tickets.length };
      }

      const tickets = Array.isArray(response) ? response.map(normalizeTicket) : [];
      return { tickets, total: tickets.length };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      priority?: TicketPriority;
      supportCategory?: string;
      [key: string]: unknown;
    }) => {
      const response = await apiClient.post('/api/tickets', data);
      return response;
    },
    onSuccess: async () => {
      await invalidateTicketQueries(queryClient);
    },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/tickets/${id}`);
      return id;
    },
    onSuccess: async () => {
      await invalidateTicketQueries(queryClient);
    },
  });
};

export const useTicketDetails = (id?: string | null) => {
  return useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${id}`);
      return normalizeTicket(response);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTicketComments = (ticketId?: string | null, page = 1) => {
  return useQuery({
    queryKey: queryKeys.ticketComments(ticketId, page),
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${ticketId}/comments?page=${page}`);
      return response;
    },
    enabled: !!ticketId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      const response = await apiClient.post(`/api/tickets/${ticketId}/comments`, { body });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-activity'] });
    },
  });

  return {
    ...mutation,
    addComment: mutation.mutateAsync,
    isAdding: mutation.isPending,
  };
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      ticketId,
      commentId,
      body,
    }: {
      ticketId: string;
      commentId: number | string;
      body: string;
    }) => {
      const response = await apiClient.put(`/api/tickets/${ticketId}/comments/${commentId}`, { body });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-activity'] });
    },
  });

  return {
    ...mutation,
    updateComment: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ ticketId, commentId }: { ticketId: string; commentId: number | string }) => {
      await apiClient.delete(`/api/tickets/${ticketId}/comments/${commentId}`);
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-activity'] });
    },
  });

  return {
    ...mutation,
    deleteComment: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  };
};

export const useTicketActivity = (ticketId) => {
  return useQuery({
    queryKey: queryKeys.ticketActivity(ticketId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${ticketId}/activity`);
      return response;
    },
    enabled: !!ticketId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDashboard = (enabled = true) => {
  const { dashboardRefreshIntervalMs } = loadAppRuntimeConfig();

  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard');
      return response;
    },
    enabled,
    staleTime: dashboardRefreshIntervalMs,
    refetchInterval: enabled ? dashboardRefreshIntervalMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
};

export const useCurrentUser = () => {
  return useAuth();
};
