import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedDateContextType {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  clearSelectedDate: () => void;
}

const SelectedDateContext = createContext<SelectedDateContextType | undefined>(undefined);

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const clearSelectedDate = () => {
    setSelectedDate(null);
  };

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate, clearSelectedDate }}>
      {children}
    </SelectedDateContext.Provider>
  );
}

export function useSelectedDate() {
  const context = useContext(SelectedDateContext);
  if (context === undefined) {
    throw new Error('useSelectedDate must be used within a SelectedDateProvider');
  }
  return context;
}
