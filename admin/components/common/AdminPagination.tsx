'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
  onLimitChange?: (newLimit: number) => void;
  isLoading?: boolean;
}

export function AdminPagination({
  total,
  limit,
  offset,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: AdminPaginationProps) {
  if (total === 0) return null;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startItem = offset + 1;
  const endItem = Math.min(offset + limit, total);

  // Generate page numbers with ellipsis if needed
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-4 border-t border-surface-border bg-white flex flex-wrap items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-3 text-surface-muted">
        <span>
          Showing <strong className="text-surface-dark font-mono tabular-nums">{startItem}</strong> to{' '}
          <strong className="text-surface-dark font-mono tabular-nums">{endItem}</strong> of{' '}
          <strong className="text-surface-dark font-mono tabular-nums">{total}</strong> records
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-surface-border">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              aria-label="Records per page"
              className="px-2 py-1 rounded-lg border border-surface-border bg-surface-canvas text-surface-dark font-semibold focus:outline-none focus:border-primary text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={offset === 0 || isLoading}
          className="px-2.5 py-1.5 rounded-lg border border-surface-border text-surface-dark hover:bg-surface-canvas disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-surface-muted">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange((page - 1) * limit)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'border border-surface-border text-surface-dark hover:bg-surface-canvas'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total || isLoading}
          className="px-2.5 py-1.5 rounded-lg border border-surface-border text-surface-dark hover:bg-surface-canvas disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
