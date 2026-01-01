import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState } from '../types/models';
import { appReducer, AppAction } from './appReducer';
import { MOCK_MEMBERS, MOCK_EVENTS } from '../services/mockDataService';
import { formatISO } from 'date-fns';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const initialState: AppState = {
  viewMode: 'family',
  theme: 'auto',
  selectedDate: formatISO(new Date()),
  currentUserId: '1',
  familyMembers: MOCK_MEMBERS,
  events: MOCK_EVENTS,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
