import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/users`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch users'
      );
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}`);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch user'
      );
    }
  }
);

export const followUser = createAsyncThunk(
  'users/followUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/users/${userId}/follow`);
      return { userId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to follow user'
      );
    }
  }
);

export const fetchFollowers = createAsyncThunk(
  'users/fetchFollowers',
  async ({ userId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}/followers`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch followers'
      );
    }
  }
);

export const fetchFollowing = createAsyncThunk(
  'users/fetchFollowing',
  async ({ userId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}/following`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch following'
      );
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  'users/fetchUserStats',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}/stats`);
      return { userId, stats: response.data.stats };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch user stats'
      );
    }
  }
);

const initialState = {
  users: [],
  currentUser: null,
  followers: [],
  following: [],
  userStats: {},
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalUsers: 0,
    hasNext: false,
    hasPrev: false,
  },
  loading: false,
  error: null,
  message: null,
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    clearFollowers: (state) => {
      state.followers = [];
    },
    clearFollowing: (state) => {
      state.following = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch user by ID
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Follow user
      .addCase(followUser.fulfilled, (state, action) => {
        const { userId, isFollowing } = action.payload;
        
        // Update in users array
        const userIndex = state.users.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].isFollowing = isFollowing;
        }
        
        // Update in current user
        if (state.currentUser && state.currentUser._id === userId) {
          state.currentUser.isFollowing = isFollowing;
        }
        
        state.message = isFollowing ? 'User followed' : 'User unfollowed';
      })
      .addCase(followUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Fetch followers
      .addCase(fetchFollowers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowers.fulfilled, (state, action) => {
        state.loading = false;
        state.followers = action.payload.followers;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchFollowers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch following
      .addCase(fetchFollowing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.loading = false;
        state.following = action.payload.following;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchFollowing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch user stats
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        const { userId, stats } = action.payload;
        state.userStats[userId] = stats;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { 
  clearError, 
  clearMessage, 
  clearCurrentUser, 
  clearFollowers, 
  clearFollowing 
} = userSlice.actions;
export default userSlice.reducer; 