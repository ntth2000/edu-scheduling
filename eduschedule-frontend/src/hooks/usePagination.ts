import { useState, useMemo } from "react";

export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
    const [currentPage, setCurrentPage] = useState(1);

    const currentData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
    }, [data, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(data.length / itemsPerPage);

    useMemo(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [data.length, totalPages]);

    return {
        currentPage,
        setCurrentPage,
        currentData,
        totalPages,
        itemsPerPage,
    };
}