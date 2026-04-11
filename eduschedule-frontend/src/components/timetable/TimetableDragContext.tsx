"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface TimetableDragContextType {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}

const TimetableDragContext = createContext<TimetableDragContextType>({
  isDragging: false,
  setIsDragging: () => {},
});

export function TimetableDragProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  return (
    <TimetableDragContext value={{ isDragging, setIsDragging }}>
      {children}
    </TimetableDragContext>
  );
}

export function useTimetableDrag() {
  return useContext(TimetableDragContext);
}
