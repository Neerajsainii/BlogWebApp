import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchComments = createAsyncThunk(
  'comments/fetchComments',
  async ({ blogId, params = {} }, { rejectWithValue }) => {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required');
      }
      const response = await axios.get(`${API_URL}/comments/blog/${blogId}`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch comments'
      );
    }
  }
);

export const addComment = createAsyncThunk(
  'comments/addComment',
  async (commentData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/comments`, commentData);
      return response.data.comment;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to add comment'
      );
    }
  }
);

export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ commentId, content }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/comments/${commentId}`, { content });
      return response.data.comment;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update comment'
      );
    }
  }
);

export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (commentId, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/comments/${commentId}`);
      return commentId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete comment'
      );
    }
  }
);

export const likeComment = createAsyncThunk(
  'comments/likeComment',
  async (commentId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/comments/${commentId}/like`);
      return { commentId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to like comment'
      );
    }
  }
);

const initialState = {
  comments: [],
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalComments: 0,
    hasNext: false,
    hasPrev: false,
  },
  loading: false,
  error: null,
  message: null,
};

const commentSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    clearComments: (state) => {
      state.comments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch comments
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.comments;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add comment
      .addCase(addComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments.unshift(action.payload);
        state.message = 'Comment added successfully';
      })
      .addCase(addComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update comment
      .addCase(updateComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.comments.findIndex(comment => comment._id === action.payload._id);
        if (index !== -1) {
          state.comments[index] = action.payload;
        }
        state.message = 'Comment updated successfully';
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete comment
      .addCase(deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = state.comments.filter(comment => comment._id !== action.payload);
        state.message = 'Comment deleted successfully';
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Like comment
      .addCase(likeComment.fulfilled, (state, action) => {
        const { commentId, likeCount, isLiked } = action.payload;
        const commentIndex = state.comments.findIndex(comment => comment._id === commentId);
        if (commentIndex !== -1) {
          state.comments[commentIndex].likeCount = likeCount;
          state.comments[commentIndex].isLiked = isLiked;
        }
      })
      .addCase(likeComment.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearError, clearMessage, clearComments } = commentSlice.actions;
export default commentSlice.reducer; 