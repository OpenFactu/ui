import * as React from 'react';
import type { Story } from '@ladle/react';
import { Pagination } from '../src/components/Pagination';

export const Basica: Story = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  return (
    <div className="max-w-2xl border border-[var(--k-line)] dark:border-slate-700 rounded-[4px] p-3">
      <Pagination
        page={page}
        pageSize={pageSize}
        total={137}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
};

export const SinSelector: Story = () => {
  const [page, setPage] = React.useState(3);
  return (
    <div className="max-w-md border border-[var(--k-line)] dark:border-slate-700 rounded-[4px] p-3">
      <Pagination page={page} pageSize={10} total={42} onPageChange={setPage} pageSizeOptions={[]} />
    </div>
  );
};

export const Vacia: Story = () => (
  <div className="max-w-md border border-[var(--k-line)] dark:border-slate-700 rounded-[4px] p-3">
    <Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} pageSizeOptions={[]} />
  </div>
);
