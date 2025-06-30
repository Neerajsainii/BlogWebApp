const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Blog = require('../models/Blog');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with search and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, sort = 'newest' } = req.query;
    
    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
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
      case 'username':
        sortObj = { username: 1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }
    
    const users = await User.find(filter)
      .select('username firstName lastName avatar bio followers following')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await User.countDocuments(filter);
    
    // Add follower/following status for current user
    if (req.user) {
      users.forEach(user => {
        user.isFollowing = user.followers.includes(req.user._id);
        user.followerCount = user.followers.length;
        user.followingCount = user.following.length;
      });
    }
    
    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username firstName lastName avatar')
      .populate('following', 'username firstName lastName avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's blog count
    const blogCount = await Blog.countDocuments({
      author: user._id,
      status: 'published',
      isPublic: true
    });
    
    // Check if current user is following this user
    let isFollowing = false;
    if (req.user) {
      isFollowing = user.followers.some(follower => 
        follower._id.toString() === req.user._id.toString()
      );
    }
    
    const userProfile = {
      ...user.toObject(),
      blogCount,
      isFollowing,
      followerCount: user.followers.length,
      followingCount: user.following.length
    };
    
    res.json({ user: userProfile });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('socialLinks.website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Twitter must be a valid URL'),
  body('socialLinks.linkedin')
    .optional()
    .isURL()
    .withMessage('LinkedIn must be a valid URL'),
  body('socialLinks.github')
    .optional()
    .isURL()
    .withMessage('GitHub must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const updateFields = ['firstName', 'lastName', 'bio', 'avatar', 'socialLinks'];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.user[field] = req.body[field];
      }
    });
    
    await req.user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow/Unfollow a user
// @access  Private
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (userToFollow._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    
    const isFollowing = req.user.following.includes(userToFollow._id);
    
    if (isFollowing) {
      // Unfollow
      req.user.following = req.user.following.filter(id => 
        id.toString() !== userToFollow._id.toString()
      );
      userToFollow.followers = userToFollow.followers.filter(id => 
        id.toString() !== req.user._id.toString()
      );
    } else {
      // Follow
      req.user.following.push(userToFollow._id);
      userToFollow.followers.push(req.user._id);
    }
    
    await Promise.all([req.user.save(), userToFollow.save()]);
    
    res.json({
      message: isFollowing ? 'User unfollowed' : 'User followed',
      isFollowing: !isFollowing
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get user's followers
// @access  Public
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.params.id)
      .populate({
        path: 'followers',
        select: 'username firstName lastName avatar bio',
        options: {
          skip,
          limit,
          sort: { createdAt: -1 }
        }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const total = user.followers.length;
    
    // Check if current user is following each follower
    if (req.user) {
      user.followers.forEach(follower => {
        follower.isFollowing = req.user.following.includes(follower._id);
      });
    }
    
    res.json({
      followers: user.followers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFollowers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get users that this user is following
// @access  Public
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.params.id)
      .populate({
        path: 'following',
        select: 'username firstName lastName avatar bio',
        options: {
          skip,
          limit,
          sort: { createdAt: -1 }
        }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const total = user.following.length;
    
    // Check if current user is following each following user
    if (req.user) {
      user.following.forEach(following => {
        following.isFollowing = req.user.following.includes(following._id);
      });
    }
    
    res.json({
      following: user.following,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFollowing: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Public
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const [blogCount, publishedBlogCount, totalViews, totalLikes] = await Promise.all([
      Blog.countDocuments({ author: userId }),
      Blog.countDocuments({ author: userId, status: 'published', isPublic: true }),
      Blog.aggregate([
        { $match: { author: userId } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      Blog.aggregate([
        { $match: { author: userId } },
        { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
      ])
    ]);
    
    const stats = {
      totalBlogs: blogCount,
      publishedBlogs: publishedBlogCount,
      totalViews: totalViews[0]?.totalViews || 0,
      totalLikes: totalLikes[0]?.totalLikes || 0
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 