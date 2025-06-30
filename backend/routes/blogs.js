const express = require('express');
const { body, validationResult } = require('express-validator');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/blogs
// @desc    Get all published blogs with pagination and filters
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { category, tag, search, author, sort = 'newest' } = req.query;
    
    // Build filter object
    const filter = {
      status: 'published',
      isPublic: true
    };
    
    if (category) filter.category = category;
    if (tag) filter.tags = { $in: [tag] };
    if (author) filter.author = author;
    
    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'popular':
        sortObj = { views: -1 };
        break;
      case 'likes':
        sortObj = { likeCount: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }
    
    const blogs = await Blog.find(filter)
      .populate('author', 'username firstName lastName avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Blog.countDocuments(filter);
    
    // Check if current user liked each blog
    if (req.user) {
      blogs.forEach(blog => {
        blog.isLiked = blog.likes.includes(req.user._id);
      });
    }
    
    res.json({
      blogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/blogs/:id
// @desc    Get a single blog by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username firstName lastName avatar bio')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username firstName lastName avatar'
        }
      });
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    if (blog.status !== 'published' || !blog.isPublic) {
      if (!req.user || (req.user._id.toString() !== blog.author._id.toString() && req.user.role !== 'admin')) {
        return res.status(404).json({ message: 'Blog not found' });
      }
    }
    
    // Increment view count
    blog.views += 1;
    await blog.save();
    
    // Check if current user liked the blog
    if (req.user) {
      blog.isLiked = blog.likes.includes(req.user._id);
    }
    
    res.json({ blog });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/blogs
// @desc    Create a new blog
// @access  Private
router.post('/', [
  auth,
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required'),
  body('category')
    .isIn(['Technology', 'Lifestyle', 'Travel', 'Food', 'Health', 'Business', 'Education', 'Entertainment', 'Other'])
    .withMessage('Invalid category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, content, excerpt, tags, category, featuredImage, status, isPublic, seo } = req.body;
    
    const blog = new Blog({
      title,
      content,
      excerpt,
      tags: tags || [],
      category,
      featuredImage,
      status: status || 'draft',
      isPublic: isPublic !== undefined ? isPublic : true,
      seo,
      author: req.user._id
    });
    
    await blog.save();
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'username firstName lastName avatar');
    
    res.status(201).json({
      message: 'Blog created successfully',
      blog: populatedBlog
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/blogs/:id
// @desc    Update a blog
// @access  Private (Author or Admin)
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('category')
    .optional()
    .isIn(['Technology', 'Lifestyle', 'Travel', 'Food', 'Health', 'Business', 'Education', 'Entertainment', 'Other'])
    .withMessage('Invalid category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Check if user is author or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this blog' });
    }
    
    const updateFields = ['title', 'content', 'excerpt', 'tags', 'category', 'featuredImage', 'status', 'isPublic', 'seo'];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field];
      }
    });
    
    await blog.save();
    
    const updatedBlog = await Blog.findById(blog._id)
      .populate('author', 'username firstName lastName avatar');
    
    res.json({
      message: 'Blog updated successfully',
      blog: updatedBlog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/blogs/:id
// @desc    Delete a blog
// @access  Private (Author or Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Check if user is author or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this blog' });
    }
    
    await Blog.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/blogs/:id/like
// @desc    Like/Unlike a blog
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    const likeIndex = blog.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
    } else {
      // Like
      blog.likes.push(req.user._id);
    }
    
    await blog.save();
    
    res.json({
      message: likeIndex > -1 ? 'Blog unliked' : 'Blog liked',
      likeCount: blog.likes.length,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    console.error('Like blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/blogs/:id/like
// @desc    Unlike a blog
// @access  Private
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    const likeIndex = blog.likes.indexOf(req.user._id);
    
    if (likeIndex === -1) {
      return res.status(400).json({ message: 'Blog is not liked' });
    }
    
    // Unlike
    blog.likes.splice(likeIndex, 1);
    await blog.save();
    
    res.json({
      message: 'Blog unliked',
      likeCount: blog.likes.length,
      isLiked: false
    });
  } catch (error) {
    console.error('Unlike blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/blogs/user/:userId
// @desc    Get blogs by a specific user
// @access  Public
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {
      author: req.params.userId,
      status: 'published',
      isPublic: true
    };
    
    // If viewing own blogs, show drafts too
    if (req.user && req.user._id.toString() === req.params.userId) {
      delete filter.status;
      delete filter.isPublic;
    }
    
    const blogs = await Blog.find(filter)
      .populate('author', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Blog.countDocuments(filter);
    
    // Check if current user liked each blog
    if (req.user) {
      blogs.forEach(blog => {
        blog.isLiked = blog.likes.includes(req.user._id);
      });
    }
    
    res.json({
      blogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user blogs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/blogs/categories
// @desc    Get all available categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Blog.distinct('category');
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/blogs/tags
// @desc    Get all available tags
// @access  Public
router.get('/tags', async (req, res) => {
  try {
    const tags = await Blog.distinct('tags');
    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 