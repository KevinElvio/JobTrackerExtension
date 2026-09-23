export default function Pagination({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    pages.push(<button key={1} className="page-btn" onClick={() => onPageChange(1)}>1</button>);
    if (start > 2) pages.push(<span key="dots1" className="page-info">...</span>);
  }

  for (let i = start; i <= end; i++) {
    pages.push(
      <button key={i} className={`page-btn ${i === page ? "active" : ""}`} onClick={() => onPageChange(i)}>
        {i}
      </button>
    );
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(<span key="dots2" className="page-info">...</span>);
    pages.push(<button key={totalPages} className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>);
  }

  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Prev</button>
      {pages}
      <button className="page-btn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      <span className="page-info">{total} data</span>
    </div>
  );
}
