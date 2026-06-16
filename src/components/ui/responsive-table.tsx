import * as React from 'react'
import { cn } from '../../lib/cn'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

export interface ResponsiveTableColumn<T> {
  id: string
  header: string
  cell: (row: T) => React.ReactNode
  /** Hide this column on mobile (stacked view). Defaults to showing it. */
  hiddenOnMobile?: boolean
  className?: string
}

export interface ResponsiveTableProps<T> {
  data: T[]
  columns: ResponsiveTableColumn<T>[]
  rowKey: (row: T) => string
  empty?: React.ReactNode
  caption?: string
}

export function ResponsiveTable<T>({
  data,
  columns,
  rowKey,
  empty,
  caption,
}: ResponsiveTableProps<T>) {
  const isEmpty = data.length === 0

  const emptyNode =
    empty ?? (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No results
      </div>
    )

  return (
    <>
      {/* Desktop / tablet: real table */}
      <div className="hidden overflow-x-auto md:block">
        {isEmpty ? (
          emptyNode
        ) : (
          <div className="min-w-[760px]">
            <Table>
              {caption ? (
                <caption className="mt-2 text-sm text-muted-foreground">{caption}</caption>
              ) : null}
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id} className={column.className}>
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Mobile: stacked cards */}
      <div className="block md:hidden">
        {isEmpty ? (
          emptyNode
        ) : (
          <div className="space-y-3">
            {caption ? (
              <div className="text-sm text-muted-foreground">{caption}</div>
            ) : null}
            {data.map((row) => {
              const visibleColumns = columns.filter((c) => !c.hiddenOnMobile)
              return (
                <div
                  key={rowKey(row)}
                  className={cn('rounded-xl border bg-muted/20 p-3 space-y-2')}
                >
                  {visibleColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex min-w-0 flex-col gap-1 rounded-lg bg-background/60 p-2 text-sm"
                    >
                      <span className="text-muted-foreground">{column.header}</span>
                      <span className="block min-w-0 font-medium [&_*]:min-w-0">{column.cell(row)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
