import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Ticket, useTickets } from "../hooks/useTickets";
import "../styles/AdvancedTicketList.css";
import "../styles/TicketTheme.css";

interface Filters {
  status: string;
  assignee_id: string;
  q: string;
  page: number;
  pageSize: number;
}

type TicketLike = Ticket & {
  name?: string;
  support_category?: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "COMPLETED", label: "Completed" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SEARCH_PLACEHOLDER = "Search by ticket name...";

const parsePositiveNumber = (value: string | null | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const normalizeStatus = (status?: string | null) =>
  (status || "OPEN").toString().trim().toUpperCase();

const normalizePriority = (priority?: string | null) =>
  (priority || "MEDIUM").toString().trim().toUpperCase();

const getPriorityClassName = (priority: string) => {
  if (priority === "HIGH") {
    return "advanced-ticket-priority-high";
  }

  if (priority === "LOW") {
    return "advanced-ticket-priority-low";
  }

  return "advanced-ticket-priority-medium";
};

const getStatusClassName = (status: string) => {
  if (["COMPLETED", "CLOSED", "RESOLVED"].includes(status)) {
    return "advanced-ticket-status-completed";
  }

  return "advanced-ticket-status-open";
};

const toDisplaySupportCategory = (supportCategory?: string | null) => {
  if (!supportCategory) {
    return "General Help";
  }

  return supportCategory
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load tickets right now.";
};

function TicketRow({ ticket }: { ticket: TicketLike }) {
  const status = normalizeStatus(ticket.status);
  const priority = normalizePriority(ticket.priority);
  const title = ticket.title || ticket.name || "Untitled ticket";
  const supportCategory = ticket.supportCategory ?? ticket.support_category;

  return (
    <tr className="advanced-ticket-row">
      <td>
        <Link to={`/app/tickets/${ticket.id}/treat`} className="advanced-ticket-name-link">
          {title}
        </Link>
      </td>

      <td className={getPriorityClassName(priority)}>{priority}</td>

      <td>
        <span className={`advanced-ticket-status ${getStatusClassName(status)}`}>
          {status}
        </span>
      </td>

      <td className="advanced-ticket-category-cell">
        {toDisplaySupportCategory(supportCategory)}
      </td>

      <td>
        <Link
          to={`/app/tickets/${ticket.id}/treat`}
          aria-label={`Treat ${title}`}
          className="advanced-ticket-treat-link"
        >
          Treat Ticket
        </Link>
      </td>
    </tr>
  );
}

function SearchForm({
  query,
  onSearch,
}: {
  query: string;
  onSearch: (query: string) => void;
}) {
  const [searchDraft, setSearchDraft] = useState(query);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(searchDraft.trim());
  };

  return (
    <form onSubmit={handleSearch} className="advanced-ticket-search-form">
      <div className="advanced-ticket-search-controls">
        <div className="advanced-ticket-search-input-wrap">
          <label htmlFor="advanced-ticket-search" className="advanced-ticket-label">
            Search Tickets
          </label>
          <input
            id="advanced-ticket-search"
            type="text"
            placeholder={SEARCH_PLACEHOLDER}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="advanced-ticket-input"
          />
        </div>

        <button type="submit" className="advanced-ticket-primary-btn advanced-ticket-search-btn">
          Search
        </button>
      </div>
    </form>
  );
}

function SearchAndFilters({
  filters,
  total,
  onFiltersChange,
}: {
  filters: Filters;
  total: number;
  onFiltersChange: (filters: Partial<Filters>) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchResetKey, setSearchResetKey] = useState(0);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ [key]: value, page: 1 });
  };

  const clearFilters = () => {
    setSearchResetKey((current) => current + 1);
    onFiltersChange({
      status: "",
      assignee_id: "",
      q: "",
      page: 1,
    });
  };

  return (
    <section className="advanced-ticket-card advanced-ticket-filters-card">
      <SearchForm
        key={`${filters.q}:${searchResetKey}`}
        query={filters.q}
        onSearch={(query) => onFiltersChange({ q: query, page: 1 })}
      />

      <div className="advanced-ticket-filter-actions">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="advanced-ticket-link-btn"
          aria-expanded={isExpanded}
          aria-controls="advanced-ticket-expanded-filters"
        >
          <span>{isExpanded ? "Hide" : "Show"} Filters</span>
          <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
        </button>

        <button type="button" onClick={clearFilters} className="advanced-ticket-secondary-btn">
          Clear Filters
        </button>
      </div>

      {isExpanded ? (
        <div id="advanced-ticket-expanded-filters" className="advanced-ticket-expanded-filters">
          <div className="advanced-ticket-filters-grid">
            <div className="advanced-ticket-field">
              <label htmlFor="advanced-ticket-status" className="advanced-ticket-label">
                Status
              </label>
              <select
                id="advanced-ticket-status"
                value={filters.status}
                onChange={(event) => handleFilterChange("status", event.target.value)}
                className="advanced-ticket-select"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="advanced-ticket-field">
              <label htmlFor="advanced-ticket-page-size" className="advanced-ticket-label">
                Results per page
              </label>
              <select
                id="advanced-ticket-page-size"
                value={filters.pageSize.toString()}
                onChange={(event) => handleFilterChange("pageSize", event.target.value)}
                className="advanced-ticket-select"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size.toString()}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="advanced-ticket-total">{total} tickets found</p>
        </div>
      ) : null}
    </section>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const visiblePages = useMemo(() => {
    if (totalPages <= 1) {
      return [];
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);

    for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
      if (page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const output: Array<number | "..."> = [];

    sortedPages.forEach((page, index) => {
      const previous = sortedPages[index - 1];
      if (previous && page - previous > 1) {
        output.push("...");
      }
      output.push(page);
    });

    return output;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  const startItem = Math.min((currentPage - 1) * pageSize + 1, total);
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <section className="advanced-ticket-card advanced-ticket-pagination">
      <p className="advanced-ticket-pagination-summary">
        Showing {startItem}-{endItem} of {total} tickets
      </p>

      <div className="advanced-ticket-pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="advanced-ticket-page-btn"
        >
          Previous
        </button>

        <div className="advanced-ticket-page-number-wrap" aria-label="Ticket pages">
          {visiblePages.map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="advanced-ticket-page-btn"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`advanced-ticket-page-btn ${
                  page === currentPage ? "advanced-ticket-page-btn-active" : ""
                }`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="advanced-ticket-page-btn"
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default function AdvancedTicketList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    status: searchParams.get("status") || "",
    assignee_id: searchParams.get("assignee_id") || "",
    q: searchParams.get("q") || "",
    page: parsePositiveNumber(searchParams.get("page"), 1),
    pageSize: parsePositiveNumber(searchParams.get("pageSize"), 20),
  });

  const normalizedQuery = filters.q.trim();

  const apiFilters = {
    status: filters.status || undefined,
    assignee_id: filters.assignee_id || undefined,
    q: normalizedQuery || undefined,
    limit: filters.pageSize,
    offset: (filters.page - 1) * filters.pageSize,
  };

  const ticketsResult = useTickets(apiFilters);
  const isLoading = ticketsResult?.isLoading ?? false;
  const error = ticketsResult?.error ?? null;
  const ticketsData = (ticketsResult?.data ?? {}) as {
    tickets?: TicketLike[];
    total?: number;
  };

  const tickets = Array.isArray(ticketsData.tickets) ? ticketsData.tickets : [];
  const total = Number.isFinite(ticketsData.total) ? Number(ticketsData.total) : tickets.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const hasActiveFilters = Boolean(normalizedQuery || filters.status);

  useEffect(() => {
    if (error) {
      return;
    }

    const params = new URLSearchParams();

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (filters.assignee_id) {
      params.set("assignee_id", filters.assignee_id);
    }

    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    }

    if (filters.page > 1) {
      params.set("page", String(filters.page));
    }

    if (filters.pageSize !== 20) {
      params.set("pageSize", String(filters.pageSize));
    }

    const nextSearch = params.toString();
    const currentSearch = searchParams.toString();

    if (currentSearch !== nextSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [error, filters, normalizedQuery, searchParams, setSearchParams]);

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters((current) => {
      const merged = { ...current, ...newFilters };
      return {
        ...merged,
        q: typeof merged.q === "string" ? merged.q : "",
        status: typeof merged.status === "string" ? merged.status : "",
        assignee_id: typeof merged.assignee_id === "string" ? merged.assignee_id : "",
        page: parsePositiveNumber(String(merged.page), 1),
        pageSize: parsePositiveNumber(String(merged.pageSize), 20),
      };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters((current) => ({
      ...current,
      page: Math.min(Math.max(1, parsePositiveNumber(String(page), 1)), totalPages),
    }));
  };

  if (error) {
    return (
      <section className="advanced-ticket-feedback">
        <p className="advanced-ticket-error-text">
          Error loading tickets: {getErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="advanced-ticket-primary-btn"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="advanced-ticket-page">
      <header className="advanced-ticket-header">
        <h1>Advanced Tickets</h1>
        <p>Search, filter, and manage support tickets from one queue.</p>
      </header>

      <SearchAndFilters
        filters={filters}
        total={total}
        onFiltersChange={handleFiltersChange}
      />

      {isLoading ? (
        <section className="advanced-ticket-card advanced-ticket-loading">
          <div className="advanced-ticket-loading-inner">
            <div className="advanced-ticket-spinner" role="img" aria-label="Loading" />
            <div>Loading tickets...</div>
          </div>
        </section>
      ) : (
        <section className="advanced-ticket-card advanced-ticket-table-card">
          {tickets.length === 0 ? (
            <div className="advanced-ticket-empty-state">
              <div className="advanced-ticket-empty-icon" aria-hidden="true">
                •
              </div>
              <div className="advanced-ticket-empty-title">No tickets found</div>
              <div className="advanced-ticket-empty-copy">
                {hasActiveFilters ? (
                  <span>
                    Try adjusting your filters or{" "}
                    <button
                      type="button"
                      onClick={() =>
                        handleFiltersChange({
                          status: "",
                          q: "",
                          page: 1,
                        })
                      }
                      className="advanced-ticket-inline-btn"
                    >
                      clear all filters
                    </button>
                    .
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/app/support#create")}
                    className="advanced-ticket-inline-btn"
                  >
                    Create your first ticket.
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="advanced-ticket-table-wrap">
              <table className="advanced-ticket-table">
                <thead>
                  <tr>
                    <th>Ticket Name</th>
                    <th>Priority</th>
                    <th>Ticket Status</th>
                    <th>Support Category</th>
                    <th>Treat</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!isLoading && tickets.length > 0 ? (
        <Pagination
          currentPage={filters.page}
          totalPages={totalPages}
          pageSize={filters.pageSize}
          total={total}
          onPageChange={handlePageChange}
        />
      ) : null}
    </section>
  );
}
