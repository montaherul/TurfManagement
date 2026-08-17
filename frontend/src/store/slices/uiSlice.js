import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: 'light',
    language: 'en',
    notifications: [],
    isLoading: false,
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, setLanguage, addNotification, removeNotification, setLoading } = uiSlice.actions;
export default uiSlice.reducer;