import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchBlogs = createAsyncThunk(
  'blogs/fetchBlogs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/blogs`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch blogs'
      );
    }
  }
);

export const fetchBlogById = createAsyncThunk(
  'blogs/fetchBlogById',
  async (blogId, { rejectWithValue }) => {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required');
      }
      const response = await axios.get(`${API_URL}/blogs/${blogId}`);
      return response.data.blog;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch blog'
      );
    }
  }
);

export const createBlog = createAsyncThunk(
  'blogs/createBlog',
  async (blogData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/blogs`, blogData);
      return response.data.blog;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create blog'
      );
    }
  }
);

export const updateBlog = createAsyncThunk(
  'blogs/updateBlog',
  async ({ blogId, blogData }, { rejectWithValue }) => {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required');
      }
      const response = await axios.put(`${API_URL}/blogs/${blogId}`, blogData);
      return response.data.blog;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update blog'
      );
    }
  }
);

export const deleteBlog = createAsyncThunk(
  'blogs/deleteBlog',
  async (blogId, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/blogs/${blogId}`);
      return blogId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete blog'
      );
    }
  }
);

export const likeBlog = createAsyncThunk(
  'blogs/likeBlog',
  async (blogId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/blogs/${blogId}/like`);
      return { blogId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to like blog'
      );
    }
  }
);

export const unlikeBlog = createAsyncThunk(
  'blogs/unlikeBlog',
  async (blogId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_URL}/blogs/${blogId}/like`);
      return { blogId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to unlike blog'
      );
    }
  }
);

export const fetchUserBlogs = createAsyncThunk(
  'blogs/fetchUserBlogs',
  async ({ userId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/blogs/user/${userId}`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch user blogs'
      );
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'blogs/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/blogs/categories`);
      return response.data.categories;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch categories'
      );
    }
  }
);

export const fetchTags = createAsyncThunk(
  'blogs/fetchTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/blogs/tags`);
      return response.data.tags;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch tags'
      );
    }
  }
);

const initialState = {
  blogs: [],
  currentBlog: null,
  userBlogs: [],
  categories: [],
  tags: [],
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalBlogs: 0,
    hasNext: false,
    hasPrev: false,
  },
  loading: false,
  error: null,
  message: null,
};

const blogSlice = createSlice({
  name: 'blogs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    clearCurrentBlog: (state) => {
      state.currentBlog = null;
    },
    clearUserBlogs: (state) => {
      state.userBlogs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch blogs
      .addCase(fetchBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.blogs = action.payload.blogs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch blog by ID
      .addCase(fetchBlogById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlogById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBlog = action.payload;
      })
      .addCase(fetchBlogById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create blog
      .addCase(createBlog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBlog.fulfilled, (state, action) => {
        state.loading = false;
        state.blogs.unshift(action.payload);
        state.message = 'Blog created successfully';
      })
      .addCase(createBlog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update blog
      .addCase(updateBlog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBlog.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.blogs.findIndex(blog => blog._id === action.payload._id);
        if (index !== -1) {
          state.blogs[index] = action.payload;
        }
        if (state.currentBlog && state.currentBlog._id === action.payload._id) {
          state.currentBlog = action.payload;
        }
        state.message = 'Blog updated successfully';
      })
      .addCase(updateBlog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete blog
      .addCase(deleteBlog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBlog.fulfilled, (state, action) => {
        state.loading = false;
        state.blogs = state.blogs.filter(blog => blog._id !== action.payload);
        if (state.currentBlog && state.currentBlog._id === action.payload) {
          state.currentBlog = null;
        }
        state.message = 'Blog deleted successfully';
      })
      .addCase(deleteBlog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Like blog
      .addCase(likeBlog.pending, (state) => {
        // No loading state for like action
      })
      .addCase(likeBlog.fulfilled, (state, action) => {
        const { blogId, likeCount, isLiked } = action.payload;
        
        // Update in blogs array
        const blogIndex = state.blogs.findIndex(blog => blog._id === blogId);
        if (blogIndex !== -1) {
          state.blogs[blogIndex].likeCount = likeCount;
          state.blogs[blogIndex].isLiked = isLiked;
        }
        
        // Update in current blog
        if (state.currentBlog && state.currentBlog._id === blogId) {
          state.currentBlog.likeCount = likeCount;
          state.currentBlog.isLiked = isLiked;
        }
      })
      .addCase(likeBlog.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Unlike blog
      .addCase(unlikeBlog.pending, (state) => {
        // No loading state for unlike action
      })
      .addCase(unlikeBlog.fulfilled, (state, action) => {
        const { blogId, likeCount, isLiked } = action.payload;
        
        // Update in blogs array
        const blogIndex = state.blogs.findIndex(blog => blog._id === blogId);
        if (blogIndex !== -1) {
          state.blogs[blogIndex].likeCount = likeCount;
          state.blogs[blogIndex].isLiked = isLiked;
        }
        
        // Update in current blog
        if (state.currentBlog && state.currentBlog._id === blogId) {
          state.currentBlog.likeCount = likeCount;
          state.currentBlog.isLiked = isLiked;
        }
      })
      .addCase(unlikeBlog.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Fetch user blogs
      .addCase(fetchUserBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.userBlogs = action.payload.blogs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUserBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      
      // Fetch tags
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.tags = action.payload;
      });
  },
});

export const { clearError, clearMessage, clearCurrentBlog, clearUserBlogs } = blogSlice.actions;
export default blogSlice.reducer; 