"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Pagination from "./Pagination";

interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  paginate?: boolean;
  pageSize?: number;
}

export default function Table<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No data found",
  paginate = false,
  pageSize = 10,
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const displayData = paginate
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            displayData.map((row) => (
              <tr
                key={String(row[keyField])}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-gray-700", col.className)}
                  >
                    {col.render
                      ? col.render(row[col.key as keyof T] as unknown, row)
                      : String(row[col.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {paginate && (
        <Pagination
          currentPage={currentPage}
          totalItems={data.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
